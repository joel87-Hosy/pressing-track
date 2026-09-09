import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Methode non autorisee." }, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return reply({ error: "Connexion requise." }, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(jwt);
    const meta = user?.app_metadata;
    if (authError || !user) return reply({ error: "Session expiree." }, 401);
    if (!meta?.pressing_id || !["admin", "supervisor"].includes(meta.role) || (meta.account_status || "active") !== "active") {
      return reply({ error: "Acces refuse." }, 403);
    }
    const pressingId = meta.pressing_id;
    const body = await req.json();
    const { data: settings, error: settingsError } = await db.from("pressing_whatsapp_settings").select("*").eq("pressing_id", pressingId).maybeSingle();
    if (settingsError) throw settingsError;
    if (body.action === "settings") {
      const safe = settings ? { phone_number_id: settings.phone_number_id, display_phone: settings.display_phone, template_name: settings.template_name, template_language: settings.template_language } : null;
      return reply({ settings: safe });
    }
    const version = Deno.env.get("WHATSAPP_GRAPH_VERSION");
    if (!version || !/^v\d+\.\d+$/.test(version)) return reply({ error: "Le service WhatsApp doit etre configure par l'administrateur technique." }, 503);
    if (body.action === "save") {
      const phoneId = clean(body.phone_number_id);
      const token = clean(body.access_token) || settings?.access_token;
      const name = clean(body.template_name);
      const language = clean(body.template_language);
      if (!/^\d+$/.test(phoneId) || !token || !/^[a-z0-9_]+$/.test(name) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) return reply({ error: "Verifiez les identifiants et le modele WhatsApp." }, 400);
      const check = await fetch(`https://graph.facebook.com/${version}/${phoneId}?fields=display_phone_number`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      const identity = await check.json();
      if (!check.ok || !identity.display_phone_number) return reply({ error: "Meta n'a pas valide ce numero et ce jeton." }, 400);
      const { error } = await db.from("pressing_whatsapp_settings").upsert({ pressing_id: pressingId, phone_number_id: phoneId, display_phone: identity.display_phone_number, access_token: token, template_name: name, template_language: language, updated_at: new Date().toISOString() });
      if (error) return reply({ error: "Enregistrement impossible. Ce numero est peut-etre deja associe a un autre pressing." }, 400);
      return reply({ message: `Numero ${identity.display_phone_number} configure.` });
    }
    if (body.action !== "send") return reply({ error: "Action inconnue." }, 400);
    if (!settings) return reply({ error: "Configurez WhatsApp Business dans les parametres du pressing." }, 400);
    if (body.consent !== true) return reply({ error: "L'accord du client est requis." }, 400);
    const { data: ticket, error: ticketError } = await db.from("tickets").select("*").eq("id", body.ticket_id).eq("pressing_id", pressingId).maybeSingle();
    if (ticketError || !ticket) return reply({ error: "Ticket introuvable ou pas encore sauvegarde. Reessayez apres sa sauvegarde." }, 404);
    let phone = String(ticket.client_phone).replace(/\D/g, "");
    if (phone.startsWith("00")) phone = phone.slice(2);
    else if (phone.length === 10) phone = `225${phone}`;
    if (!/^[1-9]\d{7,14}$/.test(phone)) return reply({ error: "Numero client invalide. Utilisez l'indicatif du pays." }, 400);
    const { data: pressing, error: pressingError } = await db.from("pressings").select("name").eq("id", pressingId).single();
    if (pressingError) throw pressingError;
    // The primary key is an atomic lock, including across tabs and managers.
    const { error: lockError } = await db.from("ticket_whatsapp_sends").insert({ ticket_id: ticket.id, pressing_id: pressingId, status: "sending", consent_by: user.id });
    if (lockError) {
      if (lockError.code !== "23505") throw lockError;
      const { data: previous, error } = await db.from("ticket_whatsapp_sends").select("status").eq("ticket_id", ticket.id).eq("pressing_id", pressingId).single();
      if (error) throw error;
      if (previous.status === "accepted") return reply({ message: "Ce ticket a deja ete accepte par WhatsApp.", status: "accepted" });
      if (previous.status !== "failed") return reply({ error: "Un envoi est en cours ou son resultat est incertain. Verifiez aupres du support avant de renvoyer." }, 409);
      const { data: claimed, error: claimError } = await db.from("ticket_whatsapp_sends").update({ status: "sending", consent_by: user.id, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("ticket_id", ticket.id).eq("status", "failed").select("ticket_id");
      if (claimError) throw claimError;
      if (!claimed?.length) return reply({ error: "Envoi deja en cours." }, 409);
    }
    let result;
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${settings.phone_number_id}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${settings.access_token}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: { name: settings.template_name, language: { code: settings.template_language }, components: [{ type: "body", parameters: [pressing.name, ticket.ticket_number, ticket.ready_date, `${ticket.total} FCFA`, String(ticket.item_count)].map((text) => ({ type: "text", text: clean(text) })) }] } }),
      });
      const payload = await response.json();
      result = response.ok && payload.messages?.[0]?.id
        ? { status: "accepted", message_id: payload.messages[0].id }
        : { status: response.status >= 500 || response.ok ? "unknown" : "failed", message_id: null };
    } catch {
      result = { status: "unknown", message_id: null };
    }
    const { error: updateError } = await db.from("ticket_whatsapp_sends").update({ ...result, updated_at: new Date().toISOString() }).eq("ticket_id", ticket.id).eq("pressing_id", pressingId);
    if (updateError) return reply({ error: "Envoi tente, suivi indisponible. Contactez le support avant de renvoyer." }, 503);
    if (result.status === "accepted") return reply({ status: result.status, message: "Ticket accepte par WhatsApp pour envoi. La livraison n'est pas encore confirmee." });
    return reply({ error: result.status === "failed" ? "WhatsApp a refuse l'envoi. Verifiez le numero client, le jeton et le modele approuve avant de reessayer." : "Resultat incertain. Contactez le support avant de renvoyer pour eviter un doublon." }, 502);
  } catch {
    return reply({ error: "Service WhatsApp indisponible. Verifiez la configuration serveur." }, 500);
  }
});
