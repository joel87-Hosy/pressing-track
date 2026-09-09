import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

async function whatsapp(body) {
  if (!supabase) throw new Error("Connectez Supabase pour utiliser l'envoi WhatsApp.");
  const { data, error } = await supabase.functions.invoke("whatsapp", { body });
  if (error) {
    let message = "Service WhatsApp indisponible. Verifiez le deploiement de la fonction serveur.";
    try { message = (await error.context.json()).error || message; } catch { /* Network error. */ }
    throw new Error(message);
  }
  return data;
}

export function WhatsAppSettings() {
  const [form, setForm] = useState({ phone_number_id: "", access_token: "", template_name: "ticket_depot", template_language: "fr" });
  const [busy, setBusy] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    whatsapp({ action: "settings" }).then(({ settings }) => {
      if (cancelled) return;
      if (settings) {
        setForm((current) => ({ ...current, ...settings }));
        setConfigured(true);
        setMessage(`Numero configure : ${settings.display_phone}`);
      }
    }).catch((error) => { if (!cancelled) setMessage(error.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await whatsapp({ action: "save", ...form });
      setConfigured(true);
      setForm((current) => ({ ...current, access_token: "" }));
      setMessage(result.message);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return (
    <section className="report-section" aria-label="WhatsApp Business">
      <div className="section-heading"><div><h2>WhatsApp Business</h2><p>Envoyez les tickets directement depuis le numero de votre pressing.</p></div></div>
      <p>Renseignez les informations du numero connecte a WhatsApp Business Platform. Le modele approuve doit contenir, dans cet ordre : nom du pressing, numero du ticket, date de retrait, montant et nombre d'articles.</p>
      <form className="platform-form" onSubmit={save}>
        <label>Identifiant du numero Meta (Phone Number ID)<input required value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} /></label>
        <label>Jeton d'acces Meta<input type="password" autoComplete="new-password" required={!configured} value={form.access_token} placeholder={configured ? "Laisser vide pour conserver le jeton" : "Jeton du compte WhatsApp"} onChange={(e) => setForm({ ...form, access_token: e.target.value })} /></label>
        <label>Nom du modele approuve<input required value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} /></label>
        <label>Langue du modele<input required value={form.template_language} placeholder="fr" onChange={(e) => setForm({ ...form, template_language: e.target.value })} /></label>
        <button type="submit" disabled={busy}>{busy ? "Verification..." : "Enregistrer WhatsApp"}</button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}

export function WhatsAppSendButton({ ticketId }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function send() {
    if (lock.current || accepted || !consent) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await whatsapp({ action: "send", ticket_id: ticketId, consent });
      setAccepted(result.status === "accepted");
      setMessage(result.message);
    } catch (error) { setMessage(error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return (
    <div className="whatsapp-send">
      <label><input type="checkbox" checked={consent} disabled={busy || accepted} onChange={(event) => setConsent(event.target.checked)} /> Le client accepte de recevoir son ticket sur WhatsApp.</label>
      <button className="picked-up-button" type="button" disabled={!ticketId || !consent || busy || accepted} onClick={send}>{busy ? "Envoi..." : accepted ? "Transmis a WhatsApp" : "Envoyer au client par WhatsApp"}</button>
      <p role="status">{message}</p>
    </div>
  );
}
