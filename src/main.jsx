import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "./styles.css";

const MOCK_ARTICLES = [
  { id: "shirt", name: "Chemise", icon: "CH", price: 1500 },
  { id: "tshirt", name: "Tee-shirt", icon: "TS", price: 1200 },
  { id: "polo", name: "Polo", icon: "PO", price: 1400 },
  { id: "pants", name: "Pantalon", icon: "PA", price: 2000 },
  { id: "jacket", name: "Veste", icon: "VE", price: 3000 },
  { id: "veston", name: "Veston", icon: "VT", price: 3200 },
  { id: "dress", name: "Robe", icon: "RO", price: 3500 },
  { id: "skirt", name: "Jupe", icon: "JU", price: 1800 },
  { id: "underwear", name: "Culotte", icon: "CU", price: 700 },
  { id: "duvet", name: "Couette", icon: "CO", price: 6000 },
  { id: "sheet", name: "Drap", icon: "DR", price: 1800 },
  { id: "sneakers", name: "Basket", icon: "BA", price: 3500 },
  { id: "bag", name: "Sac", icon: "SA", price: 4000 }
];

const DEFAULT_ARTICLE_IDS = new Set(MOCK_ARTICLES.map((article) => article.id));
const CUSTOM_ARTICLES_STORAGE_KEY = "pressingtrack-custom-articles";
const DEFAULT_PRICE_OPTION_ID = "normal";
const FANICO_PRICE_OPTION_ID = "fanico";
const FANICO_BUNDLE_PREFIX = "bundle-";
const PRICE_OPTION_SEPARATOR = "__";
const PRICE_OPTIONS = [
  { id: "normal", label: "Lavage normal" },
  { id: "dry_cleaning", label: "Lavage a sec" },
  { id: "steam", label: "Lavage a vapeur" },
  { id: FANICO_PRICE_OPTION_ID, label: "Fanico" }
];
const DEPOSIT_PRICE_OPTIONS = PRICE_OPTIONS.filter((option) => option.id !== FANICO_PRICE_OPTION_ID);
const PRICE_OPTION_IDS = new Set(PRICE_OPTIONS.map((option) => option.id));

const MOCK_RESERVES = [
  "Col sale",
  "Tache graisse",
  "Bouton manquant",
  "Dechirure",
  "Deteint",
  "RAS"
];

const DETAIL_OPTIONS = {
  designs: ["Simple", "Classique", "Sport", "Ceremonie", "Luxe"],
  colors: ["Blanc", "Noir", "Bleu", "Rouge", "Vert", "Beige", "Multicolore"],
  patterns: ["Uni", "Rayures", "Carreaux", "Fleurs", "Logo visible", "Imprime"],
  fabrics: ["Tissu", "Soie", "Jean", "Lin", "Pagne", "Nylon", "Coton", "Laine"]
};

const EMPTY_DETAILS = {
  design: "Simple",
  brand: "",
  color: "Blanc",
  pattern: "Uni",
  fabric: "Coton",
  note: ""
};

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FANICO_QUANTITY_PRESETS = [5, 10, 15, 20, 25, 30];
const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Effacer", "0", "Retour"];
const HISTORY_PERIODS = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" }
];

const STATUS_LABELS = {
  IN_PROCESSING: "En traitement",
  PICKED_UP: "Retire"
};

const CLIENT_REQUEST_STATUS_LABELS = {
  submitted: "Envoyee",
  accepted: "Acceptee",
  refused: "Refusee",
  awaiting_deposit: "En attente depot",
  deposit_confirmed: "Depot confirme",
  in_processing: "En traitement",
  ready: "Pret retrait",
  completed: "Terminee",
  canceled: "Annulee"
};

const ROLE_LABELS = {
  admin: "Admin",
  supervisor: "Superviseur",
  platform_admin: "Super Admin",
  client: "Client"
};

function canAccessDashboard(role) {
  return role === "admin" || role === "supervisor" || role === "platform_admin";
}

function isAdminRole(role) {
  return role === "admin";
}

function isPlatformAdminRole(role) {
  return role === "platform_admin";
}

function getSessionRole(session) {
  return session?.user.app_metadata?.role || session?.user.user_metadata?.role || null;
}

function isClientRole(role) {
  return role === "client";
}

function getSessionPressingId(session) {
  return session?.user.app_metadata?.pressing_id || session?.user.user_metadata?.pressing_id || null;
}

function getSessionPressingName(session) {
  return session?.user.app_metadata?.pressing_name || session?.user.user_metadata?.pressing_name || "PressingTrack";
}

function formatMoney(amount) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function getReadyDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
}

function getTicketNumberValue(ticketNumber) {
  const match = /^#A-(\d+)$/i.exec(ticketNumber || "");
  return match ? Number(match[1]) : 0;
}

function createTicketNumber(existingOrders = []) {
  const highestExistingNumber = existingOrders.reduce(
    (highest, order) => Math.max(highest, getTicketNumberValue(order.ticketNumber)),
    103
  );

  return "#A-" + (highestExistingNumber + 1);
}

function createDetailsList(quantity) {
  return Array.from({ length: quantity }, () => ({ ...EMPTY_DETAILS }));
}

function getStoredHistory() {
  if (isSupabaseConfigured) {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem("pressingtrack-ticket-history")) || [];
  } catch {
    return [];
  }
}

function getStoredArticlePrices() {
  if (isSupabaseConfigured) {
    return { [DEFAULT_PRICE_OPTION_ID]: {} };
  }

  try {
    const storedPrices = JSON.parse(localStorage.getItem("pressingtrack-article-prices")) || {};
    return storedPrices[DEFAULT_PRICE_OPTION_ID]
      ? storedPrices
      : { [DEFAULT_PRICE_OPTION_ID]: storedPrices };
  } catch {
    return { [DEFAULT_PRICE_OPTION_ID]: {} };
  }
}

function getStoredCustomArticles() {
  if (isSupabaseConfigured) {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(CUSTOM_ARTICLES_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getArticleIcon(name) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return (words[0] || "AR").slice(0, 2).toUpperCase();
}

function slugifyArticleName(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "article";
}

function createCustomArticle({ id, name, price }) {
  return {
    id,
    name,
    icon: getArticleIcon(name),
    price,
    isCustom: true
  };
}

function createEmptyPriceOptions() {
  return PRICE_OPTIONS.reduce((prices, option) => {
    prices[option.id] = {};
    return prices;
  }, {});
}

function getPriceRowId(priceOptionId, articleId) {
  return priceOptionId === DEFAULT_PRICE_OPTION_ID
    ? articleId
    : `${priceOptionId}${PRICE_OPTION_SEPARATOR}${articleId}`;
}

function parsePriceRowId(rowId) {
  const [possibleOptionId, ...articleIdParts] = rowId.split(PRICE_OPTION_SEPARATOR);

  if (articleIdParts.length > 0 && PRICE_OPTION_IDS.has(possibleOptionId)) {
    return {
      priceOptionId: possibleOptionId,
      articleId: articleIdParts.join(PRICE_OPTION_SEPARATOR)
    };
  }

  return {
    priceOptionId: DEFAULT_PRICE_OPTION_ID,
    articleId: rowId
  };
}

function getOptionPrices(articlePrices, priceOptionId) {
  return articlePrices[priceOptionId] || {};
}

function getPriceOptionLabel(priceOptionId) {
  return PRICE_OPTIONS.find((option) => option.id === priceOptionId)?.label || "Lavage normal";
}

function getFanicoBundleId(quantity) {
  return `${FANICO_BUNDLE_PREFIX}${quantity}`;
}

function getFanicoBundleQuantity(bundleId) {
  return Number(bundleId.replace(FANICO_BUNDLE_PREFIX, ""));
}

function getWeekKey(date) {
  const current = new Date(date);
  const firstDay = new Date(current.getFullYear(), 0, 1);
  const pastDays = Math.floor((current - firstDay) / 86400000);
  const weekNumber = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return `${current.getFullYear()}-W${weekNumber}`;
}

function getPeriodKey(dateValue, period) {
  const date = new Date(dateValue);

  if (period === "day") {
    return date.toISOString().slice(0, 10);
  }

  if (period === "week") {
    return getWeekKey(date);
  }

  return date.toISOString().slice(0, 7);
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function formatDateOnly(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(dateValue));
}

function normalizeWhatsAppPhone(phoneValue) {
  const digits = phoneValue.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("225")) {
    return digits;
  }

  return `225${digits}`;
}

function buildArticleSummary(item, index) {
  const detailParts = [
    item.details.color,
    item.details.fabric,
    item.details.pattern,
    item.details.design,
    item.details.brand !== "Non precise" ? item.details.brand : ""
  ].filter(Boolean);

  const articleName =
    item.copyTotal > 1 ? `${item.name} ${item.copyNumber}/${item.copyTotal}` : item.name;

  return [
    `${index + 1}. ${articleName}`,
    item.washOptionLabel ? `   Lavage: ${item.washOptionLabel}` : "",
    `   Reserve(s): ${item.reserve}`,
    `   Details: ${detailParts.join(" - ")}`,
    item.details.note ? `   Note: ${item.details.note}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsAppMessage({ ticketNumber, readyDate, total, items }) {
  return [
    "Bonjour, vos articles ont bien ete deposes au pressing.",
    "",
    `Ticket: ${ticketNumber}`,
    "Statut: IN_PROCESSING",
    `Date prevue de retrait: ${readyDate}`,
    "",
    "Articles:",
    items.map(buildArticleSummary).join("\n\n"),
    "",
    `Total: ${formatMoney(total)}`,
    "",
    "Merci pour votre confiance."
  ].join("\n");
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function toDatabaseTicket(order) {
  return {
    id: order.id,
    pressing_id: order.pressingId,
    ticket_number: order.ticketNumber,
    status: order.status,
    created_at: order.createdAt,
    client_phone: order.clientPhone,
    total: order.total,
    item_count: order.itemCount,
    items: order.items,
    ready_date: order.readyDate,
    picked_up_at: order.pickedUpAt,
    whatsapp_url: order.whatsappUrl,
    message: order.message
  };
}

function fromDatabaseTicket(row) {
  return {
    id: row.id,
    pressingId: row.pressing_id,
    ticketNumber: row.ticket_number,
    status: row.status,
    createdAt: row.created_at,
    clientPhone: row.client_phone,
    total: row.total,
    itemCount: row.item_count,
    items: row.items || [],
    readyDate: row.ready_date,
    pickedUpAt: row.picked_up_at,
    whatsappUrl: row.whatsapp_url,
    message: row.message
  };
}

function DetailPills({ label, value, options, onChange }) {
  return (
    <div className="detail-group">
      <p>{label}</p>
      <div className="detail-pills">
        {options.map((option) => (
          <button
            className={value === option ? "detail-pill selected" : "detail-pill"}
            key={option}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

const ADMIN_MENU = [
  { id: "dashboard", label: "Tableau" },
  { id: "deposit", label: "Depot" },
  { id: "clientRequests", label: "Demandes clients" },
  { id: "pickups", label: "Retraits" },
  { id: "stock", label: "Stock" },
  { id: "tickets", label: "Tickets" },
  { id: "clients", label: "Clients" },
  { id: "addArticle", label: "Ajouter article" },
  { id: "prices", label: "Prix" },
  { id: "settings", label: "Parametres" }
];

const SUPERVISOR_MENU = [
  { id: "dashboard", label: "Tableau" },
  { id: "reports", label: "Rapports" },
  { id: "stock", label: "Stock" },
  { id: "tickets", label: "Tickets" },
  { id: "clients", label: "Clients" },
  { id: "settings", label: "Parametres" }
];

const PLATFORM_MENU = [
  { id: "dashboard", label: "📊 Tableau de bord" },
  { type: "separator" },
  { id: "pressings", label: "🏪 Pressings" },
  { id: "billing", label: "💳 Abonnements" },
  { id: "analytics", label: "📈 Statistiques" },
  { type: "separator" },
  { id: "communication", label: "📢 Messagerie" },
  { id: "support", label: "🎧 Support" },
  { type: "separator" },
  { id: "settings", label: "⚙️ Parametres" },
  { id: "security", label: "🔐 Securite / Logs" }
];

const SUBSCRIPTION_STATUS_LABELS = {
  active: "Actif",
  trial: "Essai",
  past_due: "Impaye",
  suspended: "Suspendu",
  canceled: "Resilie"
};

const INVOICE_STATUS_LABELS = {
  draft: "Brouillon",
  pending: "En attente",
  paid: "Payee",
  overdue: "En retard",
  canceled: "Annulee"
};

const STOCK_TABS = [
  { id: "dirty", label: "Attente lavage" },
  { id: "ready", label: "Pret retrait" },
  { id: "overdue", label: "Depasse" }
];

function getReportStats(orderHistory) {
  const depositedTickets = orderHistory.length;
  const pickedUpTickets = orderHistory.filter((order) => order.status === "PICKED_UP").length;
  const processingTickets = orderHistory.filter((order) => order.status === "IN_PROCESSING").length;
  const totalRevenue = orderHistory.reduce((sum, order) => sum + order.total, 0);
  const uniqueClients = new Set(orderHistory.map((order) => order.clientPhone).filter(Boolean));

  return {
    depositedTickets,
    pickedUpTickets,
    processingTickets,
    totalRevenue,
    clientCount: uniqueClients.size
  };
}

function getClientRows(orderHistory) {
  const clients = new Map();

  orderHistory.forEach((order) => {
    const phone = order.clientPhone || "Client sans telephone";
    const current = clients.get(phone) || {
      phone,
      tickets: 0,
      items: 0,
      total: 0,
      lastDeposit: null,
      lastPickup: null,
      orders: []
    };

    current.tickets += 1;
    current.items += order.itemCount;
    current.total += order.total;
    current.orders.push(order);
    current.lastDeposit =
      !current.lastDeposit || new Date(order.createdAt) > new Date(current.lastDeposit)
        ? order.createdAt
        : current.lastDeposit;
    current.lastPickup =
      order.pickedUpAt &&
      (!current.lastPickup || new Date(order.pickedUpAt) > new Date(current.lastPickup))
        ? order.pickedUpAt
        : current.lastPickup;

    clients.set(phone, current);
  });

  return Array.from(clients.values())
    .map((client) => ({
      ...client,
      orders: client.orders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }))
    .sort((a, b) => new Date(b.lastDeposit).getTime() - new Date(a.lastDeposit).getTime());
}

function getExpectedPickupDate(order) {
  const date = new Date(order.createdAt);
  date.setDate(date.getDate() + 2);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStockRows(orderHistory) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return orderHistory
    .filter((order) => order.status !== "PICKED_UP")
    .flatMap((order) => {
      const expectedPickupDate = getExpectedPickupDate(order);
      const stockStatus =
        expectedPickupDate < today ? "overdue" : expectedPickupDate.getTime() === today.getTime() ? "ready" : "dirty";

      return order.items.map((item, index) => ({
        id: `${order.id}-${item.lineId || index}`,
        ticketNumber: order.ticketNumber,
        clientPhone: order.clientPhone,
        createdAt: order.createdAt,
        expectedPickupDate,
        stockStatus,
        name: item.copyTotal > 1 ? `${item.name} ${item.copyNumber}/${item.copyTotal}` : item.name,
        reserve: item.reserve,
        details: item.details,
        icon: item.icon
      }));
    });
}

function getLastSevenDayRows(orderHistory) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const tickets = orderHistory.filter((order) => order.createdAt.slice(0, 10) === key);

    return {
      key,
      label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date),
      tickets: tickets.length,
      total: tickets.reduce((sum, order) => sum + order.total, 0)
    };
  });
}

function getTopClientRows(orderHistory) {
  return getClientRows(orderHistory).slice(0, 5);
}

function fromDatabasePressing(row) {
  return {
    id: row.id,
    name: row.name,
    ownerEmail: row.owner_email,
    billingEmail: row.billing_email,
    planName: row.plan_name || "Standard",
    monthlyFee: row.monthly_fee || 0,
    subscriptionStatus: row.subscription_status,
    subscriptionStartedAt: row.subscription_started_at,
    trialEndsAt: row.trial_ends_at,
    ticketCounter: row.ticket_counter,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromDatabaseInvoice(row) {
  return {
    id: row.id,
    pressingId: row.pressing_id,
    pressingName: row.pressings?.name || "",
    periodMonth: row.period_month,
    amount: row.amount || 0,
    status: row.status || "pending",
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at
  };
}

function fromDatabaseAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience || "all",
    status: row.status || "draft",
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at
  };
}

function fromDatabaseSupportTicket(row) {
  return {
    id: row.id,
    pressingId: row.pressing_id,
    pressingName: row.pressings?.name || "",
    subject: row.subject,
    priority: row.priority || "normal",
    status: row.status || "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromDatabaseClientProfile(row) {
  return {
    id: row.id,
    userId: row.user_id,
    pressingId: row.pressing_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at
  };
}

function fromDatabaseClientRequest(row) {
  return {
    id: row.id,
    pressingId: row.pressing_id,
    clientProfileId: row.client_profile_id,
    clientUserId: row.client_user_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    serviceType: row.service_type,
    deliveryMode: row.delivery_mode,
    collectionAddress: row.collection_address,
    deliveryAddress: row.delivery_address,
    requestedDate: row.requested_date,
    items: row.items || [],
    note: row.note || "",
    estimatedTotal: row.estimated_total || 0,
    status: row.status || "submitted",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDatabaseClientRequest(request) {
  return {
    pressing_id: request.pressingId,
    client_profile_id: request.clientProfileId,
    client_user_id: request.clientUserId,
    client_name: request.clientName,
    client_email: request.clientEmail,
    client_phone: request.clientPhone,
    service_type: request.serviceType,
    delivery_mode: request.deliveryMode,
    collection_address: request.collectionAddress,
    delivery_address: request.deliveryAddress,
    requested_date: request.requestedDate || null,
    items: request.items,
    note: request.note,
    estimated_total: request.estimatedTotal,
    status: request.status,
    updated_at: new Date().toISOString()
  };
}

function getClientPortalLink(pressingId, pressingName) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("client_pressing", pressingId);
  url.searchParams.set("pressing_name", pressingName);
  return url.toString();
}

function fromDatabasePlatformUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role || "sans role",
    pressingId: row.pressing_id,
    pressingName: row.pressing_name,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at
  };
}

function getPlatformPressingRows(pressings, orderHistory, platformUsers) {
  return pressings
    .map((pressing) => {
      const tickets = orderHistory.filter((order) => order.pressingId === pressing.id);
      const users = platformUsers.filter((user) => user.pressingId === pressing.id);
      const pickedUpTickets = tickets.filter((order) => order.status === "PICKED_UP").length;
      const processingTickets = tickets.filter((order) => order.status === "IN_PROCESSING").length;
      const totalRevenue = tickets.reduce((sum, order) => sum + order.total, 0);
      const lastTicket = tickets[0]?.createdAt || null;

      return {
        ...pressing,
        tickets: tickets.length,
        pickedUpTickets,
        processingTickets,
        totalRevenue,
        users: users.length,
        lastTicket
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function AppShell({ activeView, children, menuItems, onLogout, onSelectView, pressingName, role }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function selectView(viewId) {
    onSelectView(viewId);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className={isMobileMenuOpen ? "workspace-shell menu-open" : "workspace-shell"}>
      <header className="mobile-workspace-header">
        <div>
          <p className="eyebrow">{pressingName}</p>
          <strong>PressingTrack</strong>
        </div>
        <button
          aria-expanded={isMobileMenuOpen}
          aria-controls="workspace-sidebar"
          className="mobile-menu-button"
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          {isMobileMenuOpen ? "Fermer" : "Menu"}
        </button>
      </header>

      {isMobileMenuOpen && (
        <button
          aria-label="Fermer le menu"
          className="workspace-menu-backdrop"
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className="workspace-sidebar" id="workspace-sidebar" aria-label="Menu principal">
        <div>
          <p className="eyebrow">{pressingName}</p>
          <h1>PressingTrack</h1>
        </div>

        <nav className="workspace-nav">
          {menuItems.map((item, index) =>
            item.type === "separator" ? (
              <span className="workspace-nav-separator" key={`separator-${index}`} />
            ) : (
              <button
                className={activeView === item.id ? "workspace-nav-item active" : "workspace-nav-item"}
                key={item.id}
                type="button"
                onClick={() => selectView(item.id)}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="workspace-account">
          <div className="operator-badge">{ROLE_LABELS[role] || role}</div>
          <button className="logout-button" type="button" onClick={onLogout}>
            Deconnexion
          </button>
        </div>
      </aside>

      <main className="workspace-main">{children}</main>
    </div>
  );
}

function ReportStatsGrid({ orderHistory }) {
  const reportStats = useMemo(() => getReportStats(orderHistory), [orderHistory]);

  return (
    <section className="report-grid" aria-label="Indicateurs">
      <article className="report-card">
        <span>Tickets deposes</span>
        <strong>{reportStats.depositedTickets}</strong>
      </article>
      <article className="report-card">
        <span>Tickets retires</span>
        <strong>{reportStats.pickedUpTickets}</strong>
      </article>
      <article className="report-card">
        <span>En traitement</span>
        <strong>{reportStats.processingTickets}</strong>
      </article>
      <article className="report-card">
        <span>Clients</span>
        <strong>{reportStats.clientCount}</strong>
      </article>
      <article className="report-card wide">
        <span>Total depots</span>
        <strong>{formatMoney(reportStats.totalRevenue)}</strong>
      </article>
    </section>
  );
}

function DashboardCharts({ orderHistory }) {
  const reportStats = useMemo(() => getReportStats(orderHistory), [orderHistory]);
  const dayRows = useMemo(() => getLastSevenDayRows(orderHistory), [orderHistory]);
  const topClients = useMemo(() => getTopClientRows(orderHistory), [orderHistory]);
  const stockRows = useMemo(() => getStockRows(orderHistory), [orderHistory]);
  const maxDayTickets = Math.max(1, ...dayRows.map((row) => row.tickets));
  const maxClientTotal = Math.max(1, ...topClients.map((client) => client.total));
  const totalTickets = Math.max(1, reportStats.depositedTickets);
  const pickedUpPercent = Math.round((reportStats.pickedUpTickets / totalTickets) * 100);
  const processingPercent = Math.round((reportStats.processingTickets / totalTickets) * 100);
  const readyStock = stockRows.filter((row) => row.stockStatus === "ready").length;
  const overdueStock = stockRows.filter((row) => row.stockStatus === "overdue").length;

  return (
    <section className="dashboard-charts" aria-label="Graphiques du tableau de bord">
      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h2>Statuts tickets</h2>
            <p>Part des tickets retires et en traitement.</p>
          </div>
        </div>
        <div className="status-chart">
          <div
            className="donut-chart"
            style={{
              background: `conic-gradient(var(--green) 0 ${pickedUpPercent}%, var(--blue) ${pickedUpPercent}% 100%)`
            }}
            aria-label={`${pickedUpPercent}% retires, ${processingPercent}% en traitement`}
          >
            <span>{pickedUpPercent}%</span>
          </div>
          <div className="chart-legend">
            <div>
              <span className="legend-dot green-dot" />
              <strong>{reportStats.pickedUpTickets}</strong>
              <small>Tickets retires</small>
            </div>
            <div>
              <span className="legend-dot blue-dot" />
              <strong>{reportStats.processingTickets}</strong>
              <small>En traitement</small>
            </div>
          </div>
        </div>
      </article>

      <article className="chart-panel wide-chart">
        <div className="chart-heading">
          <div>
            <h2>Depots sur 7 jours</h2>
            <p>Volume quotidien des tickets enregistres.</p>
          </div>
        </div>
        <div className="bar-chart">
          {dayRows.map((row) => (
            <div className="bar-column" key={row.key}>
              <div className="bar-track">
                <span style={{ height: `${Math.max(8, (row.tickets / maxDayTickets) * 100)}%` }} />
              </div>
              <strong>{row.tickets}</strong>
              <small>{row.label}</small>
            </div>
          ))}
        </div>
      </article>

      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h2>Alertes stock</h2>
            <p>Articles prets ou depasses avant retrait.</p>
          </div>
        </div>
        <div className="stock-alert-grid">
          <div>
            <span>Pret retrait</span>
            <strong>{readyStock}</strong>
          </div>
          <div className="alert-overdue">
            <span>Depasse</span>
            <strong>{overdueStock}</strong>
          </div>
        </div>
      </article>

      <article className="chart-panel wide-chart">
        <div className="chart-heading">
          <div>
            <h2>Top clients</h2>
            <p>Clients classes par montant total depose.</p>
          </div>
        </div>
        <div className="client-chart">
          {topClients.length === 0 ? (
            <div className="empty-history">Aucune activite client a afficher.</div>
          ) : (
            topClients.map((client) => (
              <div className="client-bar-row" key={client.phone}>
                <div>
                  <strong>{client.phone}</strong>
                  <small>{formatMoney(client.total)}</small>
                </div>
                <span>
                  <i style={{ width: `${Math.max(8, (client.total / maxClientTotal) * 100)}%` }} />
                </span>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

function TicketsReport({ historyLoading, onSelectOrder, orderHistory, title = "Tickets" }) {
  return (
    <section className="report-section" aria-label={title}>
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>Rapport des depots et dates de retrait.</p>
        </div>
        <strong>{orderHistory.length}</strong>
      </div>

      <div className="report-table">
        <div className="report-row report-row-head">
          <span>Ticket</span>
          <span>Client</span>
          <span>Depot</span>
          <span>Retrait</span>
          <span>Statut</span>
          <span>Total</span>
        </div>

        {historyLoading ? (
          <div className="empty-history">Chargement des tickets...</div>
        ) : orderHistory.length === 0 ? (
          <div className="empty-history">Aucun ticket a afficher.</div>
        ) : (
          orderHistory.map((order) => (
            <button
              className="report-row report-row-button"
              key={order.id}
              type="button"
              onClick={() => onSelectOrder(order)}
            >
              <strong>{order.ticketNumber}</strong>
              <span>{order.clientPhone}</span>
              <span>{formatDateTime(order.createdAt)}</span>
              <span>{formatDateTime(order.pickedUpAt)}</span>
              <span className={`status-badge status-${order.status.toLowerCase()}`}>
                {getStatusLabel(order.status)}
              </span>
              <strong>{formatMoney(order.total)}</strong>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function ClientsReport({ orderHistory }) {
  const clientRows = useMemo(() => getClientRows(orderHistory), [orderHistory]);
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <>
      <section className="report-section" aria-label="Liste des clients">
        <div className="section-heading">
          <div>
            <h2>Clients</h2>
            <p>Liste des clients avec depots et retraits.</p>
          </div>
          <strong>{clientRows.length}</strong>
        </div>

        <div className="client-list">
          {clientRows.length === 0 ? (
            <div className="empty-history">Aucun client a afficher.</div>
          ) : (
            clientRows.map((client) => (
              <button
                aria-label={`Afficher les details du client ${client.phone}`}
                className="client-item client-item-button"
                key={client.phone}
                type="button"
                onClick={() => setSelectedClient(client)}
              >
                <div>
                  <strong>{client.phone}</strong>
                  <span>
                    {client.tickets} ticket{client.tickets > 1 ? "s" : ""} - {client.items} article
                    {client.items > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span>Dernier depot: {formatDateOnly(client.lastDeposit)}</span>
                  <span>Dernier retrait: {formatDateOnly(client.lastPickup)}</span>
                </div>
                <strong>{formatMoney(client.total)}</strong>
              </button>
            ))
          )}
        </div>
      </section>

      <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </>
  );
}

function getSoonExpiringSubscriptions(pressingRows) {
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() + 14);

  return pressingRows.filter((pressing) => {
    if (!pressing.trialEndsAt) {
      return false;
    }

    const trialEnd = new Date(pressing.trialEndsAt);
    return trialEnd >= today && trialEnd <= limit;
  });
}

function getMonthlyInvoiceRows(platformInvoices) {
  const months = new Map();

  platformInvoices
    .filter((invoice) => invoice.status === "paid")
    .forEach((invoice) => {
      const key = invoice.periodMonth || invoice.createdAt?.slice(0, 7) || "Non classe";
      months.set(key, (months.get(key) || 0) + invoice.amount);
    });

  return Array.from(months.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getUtilizationRows(pressingRows) {
  return [...pressingRows]
    .map((pressing) => {
      const lastActivityDays = pressing.lastTicket
        ? Math.floor((Date.now() - new Date(pressing.lastTicket).getTime()) / 86400000)
        : null;

      return {
        ...pressing,
        usageStatus:
          lastActivityDays === null
            ? "Jamais utilise"
            : lastActivityDays > 30
              ? "Abandon probable"
              : lastActivityDays > 7
                ? "Faible activite"
                : "Actif"
      };
    })
    .sort((a, b) => b.tickets - a.tickets);
}

function PlatformDashboard({
  databaseError,
  historyLoading,
  onCreatePressing,
  onCreatePlatformAnnouncement,
  onLogout,
  orderHistory,
  onUpdateInvoiceStatus,
  onUpdatePressingSubscription,
  onUpdateSupportTicketStatus,
  platformAnnouncements,
  platformInvoices,
  platformLoading,
  platformPressings,
  platformSupportTickets,
  platformUsers,
  pressingName,
  role,
  selectedOrder,
  setSelectedOrder,
  userEmail
}) {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedPressing, setSelectedPressing] = useState(null);
  const pressingRows = useMemo(
    () => getPlatformPressingRows(platformPressings, orderHistory, platformUsers),
    [orderHistory, platformPressings, platformUsers]
  );
  const activePressings = pressingRows.filter((pressing) => pressing.subscriptionStatus === "active");
  const inactivePressings = pressingRows.filter((pressing) => pressing.subscriptionStatus !== "active");
  const suspendedPressings = pressingRows.filter(
    (pressing) => pressing.subscriptionStatus === "suspended"
  );
  const unpaidInvoices = platformInvoices.filter((invoice) =>
    ["pending", "overdue"].includes(invoice.status)
  );
  const expiringSubscriptions = getSoonExpiringSubscriptions(pressingRows);
  const totalRevenue = orderHistory.reduce((sum, order) => sum + order.total, 0);
  const monthlyRecurringRevenue = activePressings.reduce(
    (sum, pressing) => sum + pressing.monthlyFee,
    0
  );
  const unpaidAmount = unpaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const userRoleCounts = platformUsers.reduce((counts, user) => {
    counts[user.role] = (counts[user.role] || 0) + 1;
    return counts;
  }, {});

  return (
    <AppShell
      activeView={activeView}
      menuItems={PLATFORM_MENU}
      onLogout={onLogout}
      onSelectView={setActiveView}
      pressingName={pressingName}
      role={role}
    >
      {databaseError && <div className="database-error">{databaseError}</div>}

      {activeView === "dashboard" && (
        <div className="workspace-stack">
          <section className="report-grid" aria-label="Indicateurs plateforme">
            <article className="report-card">
              <span>Pressings actifs</span>
              <strong>{activePressings.length}</strong>
            </article>
            <article className="report-card">
              <span>Inactifs</span>
              <strong>{inactivePressings.length}</strong>
            </article>
            <article className="report-card">
              <span>Tickets reseau</span>
              <strong>{orderHistory.length}</strong>
            </article>
            <article className="report-card">
              <span>Expirent bientot</span>
              <strong>{expiringSubscriptions.length}</strong>
            </article>
            <article className="report-card wide">
              <span>MRR abonnements</span>
              <strong>{formatMoney(monthlyRecurringRevenue)}</strong>
            </article>
            <article className="report-card wide">
              <span>Chiffre pressings</span>
              <strong>{formatMoney(totalRevenue)}</strong>
            </article>
            <article className="report-card wide">
              <span>Factures dues</span>
              <strong>{formatMoney(unpaidAmount)}</strong>
            </article>
          </section>

          <PlatformAlertList
            expiringSubscriptions={expiringSubscriptions}
            suspendedPressings={suspendedPressings}
            unpaidInvoices={unpaidInvoices}
          />

          <section className="report-section" aria-label="Synthese des roles">
            <div className="section-heading">
              <div>
                <h2>Utilisateurs par role</h2>
                <p>Repartition de tous les utilisateurs de l'application.</p>
              </div>
              <strong>{platformUsers.length}</strong>
            </div>
            <div className="role-count-grid">
              {Object.entries(userRoleCounts).length === 0 ? (
                <div className="empty-history">Aucun compte utilisateur a afficher.</div>
              ) : (
                Object.entries(userRoleCounts).map(([userRole, count]) => (
                  <article className="role-count-card" key={userRole}>
                    <span>{ROLE_LABELS[userRole] || userRole}</span>
                    <strong>{count}</strong>
                  </article>
                ))
              )}
            </div>
          </section>

          <PlatformPressingsTable
            loading={platformLoading}
            onSelectPressing={setSelectedPressing}
            onUpdatePressingSubscription={onUpdatePressingSubscription}
            pressingRows={pressingRows.slice(0, 8)}
          />
        </div>
      )}

      {activeView === "pressings" && (
        <PlatformPressingsManager
          loading={platformLoading}
          onCreatePressing={onCreatePressing}
          onSelectPressing={setSelectedPressing}
          onUpdatePressingSubscription={onUpdatePressingSubscription}
          platformUsers={platformUsers}
          pressingRows={pressingRows}
        />
      )}

      {activeView === "billing" && (
        <PlatformBillingView
          loading={platformLoading}
          onUpdateInvoiceStatus={onUpdateInvoiceStatus}
          onUpdatePressingSubscription={onUpdatePressingSubscription}
          platformInvoices={platformInvoices}
          pressingRows={pressingRows}
        />
      )}

      {activeView === "analytics" && (
        <PlatformAnalyticsView
          historyLoading={historyLoading}
          monthlyInvoiceRows={getMonthlyInvoiceRows(platformInvoices)}
          onSelectOrder={setSelectedOrder}
          orderHistory={orderHistory}
          utilizationRows={getUtilizationRows(pressingRows)}
        />
      )}

      {activeView === "communication" && (
        <PlatformCommunicationView
          onCreatePlatformAnnouncement={onCreatePlatformAnnouncement}
          platformAnnouncements={platformAnnouncements}
          platformPressings={platformPressings}
        />
      )}

      {activeView === "support" && (
        <PlatformSupportView
          onUpdateSupportTicketStatus={onUpdateSupportTicketStatus}
          platformSupportTickets={platformSupportTickets}
        />
      )}

      {activeView === "settings" && (
        <PlatformSystemSettingsView pressingName={pressingName} role={role} userEmail={userEmail} />
      )}

      {activeView === "security" && (
        <PlatformSecurityLogsView platformUsers={platformUsers} />
      )}

      <TicketReadModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <PlatformPressingDetailModal
        onClose={() => setSelectedPressing(null)}
        onUpdatePressingSubscription={onUpdatePressingSubscription}
        pressing={selectedPressing}
        users={platformUsers.filter((user) => user.pressingId === selectedPressing?.id)}
      />
    </AppShell>
  );
}

function PlatformAlertList({ expiringSubscriptions, suspendedPressings, unpaidInvoices }) {
  const alerts = [
    ...unpaidInvoices.slice(0, 3).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      title: invoice.pressingName || "Facture sans pressing",
      detail: `Facture ${invoice.periodMonth} - ${formatMoney(invoice.amount)}`
    })),
    ...expiringSubscriptions.slice(0, 3).map((pressing) => ({
      id: `trial-${pressing.id}`,
      title: pressing.name,
      detail: `Souscription a verifier avant le ${formatDateOnly(pressing.trialEndsAt)}`
    })),
    ...suspendedPressings.slice(0, 3).map((pressing) => ({
      id: `suspended-${pressing.id}`,
      title: pressing.name,
      detail: "Compte suspendu"
    }))
  ];

  return (
    <section className="report-section" aria-label="Alertes Super Admin">
      <div className="section-heading">
        <div>
          <h2>Alertes</h2>
          <p>Souscriptions, impayes et comptes a surveiller.</p>
        </div>
        <strong>{alerts.length}</strong>
      </div>

      <div className="role-count-grid">
        {alerts.length === 0 ? (
          <div className="empty-history">Aucune alerte prioritaire.</div>
        ) : (
          alerts.map((alert) => (
            <article className="role-count-card" key={alert.id}>
              <span>{alert.title}</span>
              <strong>{alert.detail}</strong>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PlatformPressingsManager({
  loading,
  onCreatePressing,
  onSelectPressing,
  onUpdatePressingSubscription,
  platformUsers,
  pressingRows
}) {
  const [newPressing, setNewPressing] = useState({
    name: "",
    ownerEmail: "",
    contact: "",
    planName: "Starter"
  });
  const [creationStatus, setCreationStatus] = useState({ type: "", message: "" });
  const [isCreating, setIsCreating] = useState(false);

  async function submitPressing(event) {
    event.preventDefault();
    setCreationStatus({ type: "", message: "" });

    if (newPressing.name.trim().length < 2) {
      setCreationStatus({ type: "error", message: "Saisissez le nom du pressing." });
      return;
    }

    setIsCreating(true);
    const result = await onCreatePressing(newPressing);
    setIsCreating(false);

    if (!result.ok) {
      setCreationStatus({ type: "error", message: result.message });
      return;
    }

    setNewPressing({ name: "", ownerEmail: "", contact: "", planName: "Starter" });
    setCreationStatus({ type: "success", message: "Pressing ajoute." });
  }

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Ajouter un pressing">
        <div className="section-heading">
          <div>
            <h2>Ajouter un pressing</h2>
            <p>Creation commerciale d'un nouvel etablissement client.</p>
          </div>
        </div>

        <form className="platform-form" onSubmit={submitPressing}>
          <label>
            Nom du pressing
            <input
              value={newPressing.name}
              onChange={(event) =>
                setNewPressing((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex: Pressing Riviera"
            />
          </label>
          <label>
            Email proprietaire
            <input
              type="email"
              value={newPressing.ownerEmail}
              onChange={(event) =>
                setNewPressing((current) => ({ ...current, ownerEmail: event.target.value }))
              }
              placeholder="admin@pressing.com"
            />
          </label>
          <label>
            Contact
            <input
              value={newPressing.contact}
              onChange={(event) =>
                setNewPressing((current) => ({ ...current, contact: event.target.value }))
              }
              placeholder="Telephone ou email"
            />
          </label>
          <label>
            Plan
            <select
              value={newPressing.planName}
              onChange={(event) =>
                setNewPressing((current) => ({ ...current, planName: event.target.value }))
              }
            >
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Premium">Premium</option>
            </select>
          </label>
          <button type="submit" disabled={isCreating}>
            {isCreating ? "Creation..." : "Creer"}
          </button>
          {creationStatus.message && (
            <div className={`password-status ${creationStatus.type}`}>{creationStatus.message}</div>
          )}
        </form>
      </section>

      <PlatformPressingsTable
        loading={loading}
        onSelectPressing={onSelectPressing}
        onUpdatePressingSubscription={onUpdatePressingSubscription}
        pressingRows={pressingRows}
      />

      <PlatformUsersTable loading={loading} platformUsers={platformUsers} />
    </div>
  );
}

function PlatformPressingsTable({
  loading,
  onSelectPressing,
  onUpdatePressingSubscription,
  pressingRows
}) {
  return (
    <section className="report-section" aria-label="Liste des pressings">
      <div className="section-heading">
        <div>
          <h2>Pressings</h2>
          <p>Date de creation et utilisation de chaque compte pressing.</p>
        </div>
        <strong>{pressingRows.length}</strong>
      </div>

      <div className="report-table">
        <div className="platform-pressing-row report-row-head">
          <span>Pressing</span>
          <span>Abonnement</span>
          <span>Creation</span>
          <span>Comptes</span>
          <span>Tickets</span>
          <span>En cours</span>
          <span>Dernier depot</span>
          <span>Total</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="empty-history">Chargement des pressings...</div>
        ) : pressingRows.length === 0 ? (
          <div className="empty-history">Aucun pressing a afficher.</div>
        ) : (
          pressingRows.map((pressing) => (
            <article className="platform-pressing-row platform-row" key={pressing.id}>
              <div>
                <strong>{pressing.name}</strong>
                <span>{pressing.ownerEmail || "Email proprietaire non renseigne"}</span>
              </div>
              <span>{SUBSCRIPTION_STATUS_LABELS[pressing.subscriptionStatus] || pressing.subscriptionStatus}</span>
              <span>{formatDateTime(pressing.createdAt)}</span>
              <strong>{pressing.users}</strong>
              <strong>{pressing.tickets}</strong>
              <span>{pressing.processingTickets}</span>
              <span>{formatDateTime(pressing.lastTicket)}</span>
              <strong>{formatMoney(pressing.totalRevenue)}</strong>
              <div className="platform-actions">
                <button type="button" onClick={() => onSelectPressing(pressing)}>
                  Fiche
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePressingSubscription(
                      pressing.id,
                      pressing.subscriptionStatus === "active" ? "suspended" : "active"
                    )
                  }
                >
                  {pressing.subscriptionStatus === "active" ? "Suspendre" : "Activer"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PlatformBillingView({
  loading,
  onUpdateInvoiceStatus,
  onUpdatePressingSubscription,
  platformInvoices,
  pressingRows
}) {
  const unpaidInvoices = platformInvoices.filter((invoice) =>
    ["pending", "overdue"].includes(invoice.status)
  );
  const monthlyRecurringRevenue = pressingRows
    .filter((pressing) => pressing.subscriptionStatus === "active")
    .reduce((sum, pressing) => sum + pressing.monthlyFee, 0);
  const unpaidAmount = unpaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="workspace-stack">
      <section className="report-grid" aria-label="Indicateurs abonnements">
        <article className="report-card">
          <span>Abonnes actifs</span>
          <strong>
            {pressingRows.filter((pressing) => pressing.subscriptionStatus === "active").length}
          </strong>
        </article>
        <article className="report-card">
          <span>Essais</span>
          <strong>
            {pressingRows.filter((pressing) => pressing.subscriptionStatus === "trial").length}
          </strong>
        </article>
        <article className="report-card">
          <span>Factures dues</span>
          <strong>{unpaidInvoices.length}</strong>
        </article>
        <article className="report-card wide">
          <span>MRR plateforme</span>
          <strong>{formatMoney(monthlyRecurringRevenue)}</strong>
        </article>
        <article className="report-card wide">
          <span>Montant du</span>
          <strong>{formatMoney(unpaidAmount)}</strong>
        </article>
      </section>

      <section className="report-section" aria-label="Plans et tarifs">
        <div className="section-heading">
          <div>
            <h2>Plans / Tarifs</h2>
            <p>Offres commerciales selon volume et accompagnement.</p>
          </div>
          <strong>3</strong>
        </div>
        <div className="role-count-grid">
          {[
            { name: "Starter", price: 10000, limit: "Petit volume" },
            { name: "Pro", price: 25000, limit: "Pressing actif" },
            { name: "Premium", price: 50000, limit: "Multi-equipe" }
          ].map((plan) => (
            <article className="role-count-card" key={plan.name}>
              <span>{plan.name}</span>
              <strong>{formatMoney(plan.price)}</strong>
              <small>{plan.limit}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" aria-label="Gestion des abonnements">
        <div className="section-heading">
          <div>
            <h2>Abonnements</h2>
            <p>Plans, montants mensuels et statut de chaque pressing.</p>
          </div>
          <strong>{pressingRows.length}</strong>
        </div>

        <div className="report-table">
          <div className="billing-subscription-row report-row-head">
            <span>Pressing</span>
            <span>Plan</span>
            <span>Mensuel</span>
            <span>Statut</span>
            <span>Debut</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div className="empty-history">Chargement des abonnements...</div>
          ) : pressingRows.length === 0 ? (
            <div className="empty-history">Aucun abonnement a afficher.</div>
          ) : (
            pressingRows.map((pressing) => (
              <article className="billing-subscription-row platform-row" key={pressing.id}>
                <div>
                  <strong>{pressing.name}</strong>
                  <span>{pressing.billingEmail || pressing.ownerEmail || "Email facturation absent"}</span>
                </div>
                <span>{pressing.planName}</span>
                <strong>{formatMoney(pressing.monthlyFee)}</strong>
                <span>
                  {SUBSCRIPTION_STATUS_LABELS[pressing.subscriptionStatus] ||
                    pressing.subscriptionStatus}
                </span>
                <span>{formatDateOnly(pressing.subscriptionStartedAt || pressing.createdAt)}</span>
                <select
                  value={pressing.subscriptionStatus}
                  onChange={(event) => onUpdatePressingSubscription(pressing.id, event.target.value)}
                >
                  {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="report-section" aria-label="Gestion des factures">
        <div className="section-heading">
          <div>
            <h2>Factures</h2>
            <p>Suivi des paiements et des factures en retard.</p>
          </div>
          <strong>{platformInvoices.length}</strong>
        </div>

        <div className="report-table">
          <div className="billing-invoice-row report-row-head">
            <span>Pressing</span>
            <span>Periode</span>
            <span>Montant</span>
            <span>Echeance</span>
            <span>Statut</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div className="empty-history">Chargement des factures...</div>
          ) : platformInvoices.length === 0 ? (
            <div className="empty-history">Aucune facture a afficher.</div>
          ) : (
            platformInvoices.map((invoice) => (
              <article className="billing-invoice-row platform-row" key={invoice.id}>
                <strong>{invoice.pressingName || invoice.pressingId}</strong>
                <span>{invoice.periodMonth}</span>
                <strong>{formatMoney(invoice.amount)}</strong>
                <span>{formatDateOnly(invoice.dueDate)}</span>
                <span>{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</span>
                <select
                  value={invoice.status}
                  onChange={(event) => onUpdateInvoiceStatus(invoice.id, event.target.value)}
                >
                  {Object.entries(INVOICE_STATUS_LABELS).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="report-section" aria-label="Rappels et relances">
        <div className="section-heading">
          <div>
            <h2>Rappels & Relances</h2>
            <p>SMS et emails pour les renouvellements d'abonnement.</p>
          </div>
          <strong>{unpaidInvoices.length}</strong>
        </div>
        <div className="client-list">
          {unpaidInvoices.length === 0 ? (
            <div className="empty-history">Aucune relance a envoyer.</div>
          ) : (
            unpaidInvoices.map((invoice) => (
              <article className="client-item" key={`reminder-${invoice.id}`}>
                <div>
                  <strong>{invoice.pressingName || invoice.pressingId}</strong>
                  <span>{invoice.periodMonth}</span>
                </div>
                <div>
                  <span>Echeance: {formatDateOnly(invoice.dueDate)}</span>
                  <span>{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</span>
                </div>
                <button className="back-button compact-button" type="button">
                  Relancer
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PlatformUsersTable({ loading, platformUsers }) {
  return (
    <section className="report-section" aria-label="Liste des utilisateurs">
      <div className="section-heading">
        <div>
          <h2>Utilisateurs</h2>
          <p>Tous les comptes, tous roles confondus, avec creation et derniere connexion.</p>
        </div>
        <strong>{platformUsers.length}</strong>
      </div>

      <div className="report-table">
        <div className="platform-user-row report-row-head">
          <span>Email</span>
          <span>Role</span>
          <span>Pressing</span>
          <span>Creation compte</span>
          <span>Derniere connexion</span>
        </div>

        {loading ? (
          <div className="empty-history">Chargement des utilisateurs...</div>
        ) : platformUsers.length === 0 ? (
          <div className="empty-history">Aucun compte utilisateur a afficher.</div>
        ) : (
          platformUsers.map((user) => (
            <article className="platform-user-row platform-row" key={user.id}>
              <strong>{user.email || "Email non renseigne"}</strong>
              <span>{ROLE_LABELS[user.role] || user.role}</span>
              <span>{user.pressingName || "Plateforme"}</span>
              <span>{formatDateTime(user.createdAt)}</span>
              <span>{formatDateTime(user.lastSignInAt)}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PlatformPressingDetailModal({ onClose, onUpdatePressingSubscription, pressing, users }) {
  if (!pressing) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="pickup-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">Fiche pressing</p>
            <h2>{pressing.name}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="pickup-summary">
          <div>
            <span>Proprietaire</span>
            <strong>{pressing.ownerEmail || "-"}</strong>
          </div>
          <div>
            <span>Employes</span>
            <strong>{users.length}</strong>
          </div>
          <div>
            <span>Statut</span>
            <strong>{SUBSCRIPTION_STATUS_LABELS[pressing.subscriptionStatus]}</strong>
          </div>
          <div>
            <span>Plan</span>
            <strong>{pressing.planName}</strong>
          </div>
        </div>

        <div className="client-detail-list">
          <article className="client-detail-ticket">
            <div className="client-detail-ticket-top">
              <div>
                <strong>Assistance technique</strong>
                <span>Prise de controle encadree du compte pressing.</span>
              </div>
              <button className="back-button compact-button" type="button">
                Preparer l'assistance
              </button>
            </div>
          </article>
          {users.map((user) => (
            <article className="client-detail-ticket" key={user.id}>
              <div className="client-detail-ticket-top">
                <div>
                  <strong>{user.email}</strong>
                  <span>{ROLE_LABELS[user.role] || user.role}</span>
                </div>
                <span>{formatDateTime(user.lastSignInAt)}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="modal-actions">
          <button className="back-button" type="button" onClick={onClose}>
            Fermer
          </button>
          <button
            className="add-button"
            type="button"
            onClick={() =>
              onUpdatePressingSubscription(
                pressing.id,
                pressing.subscriptionStatus === "active" ? "suspended" : "active"
              )
            }
          >
            {pressing.subscriptionStatus === "active" ? "Suspendre" : "Activer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformAnalyticsView({
  historyLoading,
  monthlyInvoiceRows,
  onSelectOrder,
  orderHistory,
  utilizationRows
}) {
  const maxRevenue = Math.max(1, ...monthlyInvoiceRows.map((row) => row.amount));

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Taux d'utilisation">
        <div className="section-heading">
          <div>
            <h2>Taux d'utilisation</h2>
            <p>Pressings les plus actifs et signaux d'abandon.</p>
          </div>
          <strong>{utilizationRows.length}</strong>
        </div>

        <div className="client-list">
          {utilizationRows.length === 0 ? (
            <div className="empty-history">Aucune activite a analyser.</div>
          ) : (
            utilizationRows.map((pressing) => (
              <article className="client-item" key={pressing.id}>
                <div>
                  <strong>{pressing.name}</strong>
                  <span>{pressing.usageStatus}</span>
                </div>
                <div>
                  <span>Dernier depot: {formatDateTime(pressing.lastTicket)}</span>
                  <span>{pressing.processingTickets} ticket(s) en cours</span>
                </div>
                <strong>{pressing.tickets} tickets</strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="report-section" aria-label="Rapports financiers">
        <div className="section-heading">
          <div>
            <h2>Rapports financiers</h2>
            <p>Evolution des revenus logiciel par mois.</p>
          </div>
          <strong>{monthlyInvoiceRows.length}</strong>
        </div>
        <div className="client-chart">
          {monthlyInvoiceRows.length === 0 ? (
            <div className="empty-history">Aucun paiement confirme.</div>
          ) : (
            monthlyInvoiceRows.map((row) => (
              <div className="client-bar-row" key={row.month}>
                <div>
                  <strong>{row.month}</strong>
                  <small>{formatMoney(row.amount)}</small>
                </div>
                <span>
                  <i style={{ width: `${Math.max(8, (row.amount / maxRevenue) * 100)}%` }} />
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <TicketsReport
        historyLoading={historyLoading}
        onSelectOrder={onSelectOrder}
        orderHistory={orderHistory}
        title="Commandes du reseau"
      />
    </div>
  );
}

function PlatformCommunicationView({
  onCreatePlatformAnnouncement,
  platformAnnouncements,
  platformPressings
}) {
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    audience: "all",
    message: ""
  });
  const [announcementStatus, setAnnouncementStatus] = useState({ type: "", message: "" });
  const [isPublishing, setIsPublishing] = useState(false);

  async function submitAnnouncement(event) {
    event.preventDefault();
    setAnnouncementStatus({ type: "", message: "" });

    if (announcementForm.title.trim().length < 3 || announcementForm.message.trim().length < 5) {
      setAnnouncementStatus({ type: "error", message: "Saisissez un titre et un message." });
      return;
    }

    setIsPublishing(true);
    const result = await onCreatePlatformAnnouncement(announcementForm);
    setIsPublishing(false);

    if (!result.ok) {
      setAnnouncementStatus({ type: "error", message: result.message });
      return;
    }

    setAnnouncementForm({ title: "", audience: "all", message: "" });
    setAnnouncementStatus({ type: "success", message: "Annonce publiee aux comptes pressing." });
  }

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Annonces plateforme">
        <div className="section-heading">
          <div>
            <h2>Annonces / Pop-ups</h2>
            <p>Messages globaux envoyes aux pressings.</p>
          </div>
          <strong>{platformPressings.length}</strong>
        </div>
        <form className="platform-form platform-form-wide" onSubmit={submitAnnouncement}>
          <label>
            Titre
            <input
              value={announcementForm.title}
              onChange={(event) =>
                setAnnouncementForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Maintenance prevue ce soir a 23h"
            />
          </label>
          <label>
            Audience
            <select
              value={announcementForm.audience}
              onChange={(event) =>
                setAnnouncementForm((current) => ({ ...current, audience: event.target.value }))
              }
            >
              <option value="all">Tous les pressings</option>
              <option value="active">Pressings actifs</option>
              <option value="trial">Essais</option>
            </select>
          </label>
          <label className="wide-field">
            Message
            <textarea
              value={announcementForm.message}
              onChange={(event) =>
                setAnnouncementForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Votre message aux clients SaaS"
            />
          </label>
          <button type="submit" disabled={isPublishing}>
            {isPublishing ? "Publication..." : "Publier"}
          </button>
          {announcementStatus.message && (
            <div className={`password-status ${announcementStatus.type}`}>
              {announcementStatus.message}
            </div>
          )}
        </form>
      </section>

      <section className="report-section" aria-label="Historique notifications">
        <div className="section-heading">
          <div>
            <h2>SMS & Emails systeme</h2>
            <p>Historique des notifications envoyees par la plateforme.</p>
          </div>
          <strong>{platformAnnouncements.length}</strong>
        </div>
        <div className="client-list">
          {platformAnnouncements.length === 0 ? (
            <div className="empty-history">Aucune annonce publiee.</div>
          ) : (
            platformAnnouncements.map((announcement) => (
              <article className="client-item" key={announcement.id}>
                <div>
                  <strong>{announcement.title}</strong>
                  <span>{announcement.message}</span>
                </div>
                <div>
                  <span>Audience: {announcement.audience}</span>
                  <span>Statut: {announcement.status}</span>
                </div>
                <strong>{formatDateOnly(announcement.createdAt)}</strong>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PlatformSupportView({ onUpdateSupportTicketStatus, platformSupportTickets }) {
  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Tickets support">
        <div className="section-heading">
          <div>
            <h2>Tickets de support</h2>
            <p>Demandes d'aide et bugs signales par les pressings.</p>
          </div>
          <strong>{platformSupportTickets.length}</strong>
        </div>
        <div className="report-table">
          <div className="support-row report-row-head">
            <span>Pressing</span>
            <span>Sujet</span>
            <span>Priorite</span>
            <span>Statut</span>
            <span>Date</span>
          </div>
          {platformSupportTickets.length === 0 ? (
            <div className="empty-history">Aucun ticket support ouvert.</div>
          ) : (
            platformSupportTickets.map((ticket) => (
              <article className="support-row platform-row" key={ticket.id}>
                <strong>{ticket.pressingName || ticket.pressingId}</strong>
                <span>{ticket.subject}</span>
                <span>{ticket.priority}</span>
                <select
                  value={ticket.status}
                  onChange={(event) => onUpdateSupportTicketStatus(ticket.id, event.target.value)}
                >
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Resolu</option>
                  <option value="closed">Ferme</option>
                </select>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PlatformSystemSettingsView({ pressingName, role, userEmail }) {
  const paymentModes = ["Wave", "Orange Money", "MTN", "Moov", "Stripe", "Especes"];

  return (
    <div className="workspace-stack">
      <SettingsView
        pressingName={pressingName}
        role={role}
        showTenantMessaging={false}
        userEmail={userEmail}
      />

      <section className="report-section" aria-label="Roles et permissions">
        <div className="section-heading">
          <div>
            <h2>Roles & permissions</h2>
            <p>Perimetre des profils de gestion plateforme.</p>
          </div>
        </div>
        <div className="role-count-grid">
          {["Super Admin", "Moderateur", "Support technique"].map((profile) => (
            <article className="role-count-card" key={profile}>
              <span>{profile}</span>
              <strong>{profile === "Super Admin" ? "Complet" : "Limite"}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" aria-label="Modes de paiement">
        <div className="section-heading">
          <div>
            <h2>Modes de paiement</h2>
            <p>Passerelles acceptees pour les abonnements.</p>
          </div>
          <strong>{paymentModes.length}</strong>
        </div>
        <div className="role-count-grid">
          {paymentModes.map((mode) => (
            <article className="role-count-card" key={mode}>
              <span>{mode}</span>
              <strong>Actif</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" aria-label="Informations plateforme">
        <div className="section-heading">
          <div>
            <h2>Informations plateforme</h2>
            <p>Nom du logiciel, marque et documents publics.</p>
          </div>
        </div>
        <form className="platform-form">
          <label>
            Nom du logiciel
            <input defaultValue="PressingTrack" />
          </label>
          <label>
            URL CGU
            <input placeholder="https://..." />
          </label>
          <label>
            Politique confidentialite
            <input placeholder="https://..." />
          </label>
          <button type="button">Enregistrer</button>
        </form>
      </section>
    </div>
  );
}

function PlatformSecurityLogsView({ platformUsers }) {
  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Journal d'activite">
        <div className="section-heading">
          <div>
            <h2>Journal des actions</h2>
            <p>Operations sensibles realisees sur la plateforme.</p>
          </div>
          <strong>0</strong>
        </div>
        <div className="report-table">
          <div className="activity-row report-row-head">
            <span>Utilisateur</span>
            <span>Action</span>
            <span>Cible</span>
            <span>Date</span>
          </div>
          <div className="empty-history">Aucune action sensible enregistree.</div>
        </div>
      </section>

      <PlatformUsersTable loading={false} platformUsers={platformUsers} />
    </div>
  );
}

function ClientDetailModal({ client, onClose }) {
  if (!client) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="pickup-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">Detail client</p>
            <h2>{client.phone}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="pickup-summary">
          <div>
            <span>Tickets</span>
            <strong>{client.tickets}</strong>
          </div>
          <div>
            <span>Articles</span>
            <strong>{client.items}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatMoney(client.total)}</strong>
          </div>
          <div>
            <span>Dernier retrait</span>
            <strong>{formatDateOnly(client.lastPickup)}</strong>
          </div>
        </div>

        <div className="client-detail-list">
          {client.orders.map((order) => (
            <article className="client-detail-ticket" key={order.id}>
              <div className="client-detail-ticket-top">
                <div>
                  <strong>{order.ticketNumber}</strong>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                <span className={`status-badge status-${order.status.toLowerCase()}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="client-detail-ticket-meta">
                <span>{order.itemCount} article{order.itemCount > 1 ? "s" : ""}</span>
                <span>Retrait: {formatDateTime(order.pickedUpAt)}</span>
                <strong>{formatMoney(order.total)}</strong>
              </div>
              <div className="client-detail-items">
                {order.items.map((item) => (
                  <span key={item.lineId}>
                    {item.copyTotal > 1
                      ? `${item.name} ${item.copyNumber}/${item.copyTotal}`
                      : item.name}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockView({ orderHistory }) {
  const [activeStockTab, setActiveStockTab] = useState("dirty");
  const stockRows = useMemo(() => getStockRows(orderHistory), [orderHistory]);
  const visibleStockRows = stockRows.filter((row) => row.stockStatus === activeStockTab);
  const stockCounts = STOCK_TABS.reduce(
    (counts, tab) => ({
      ...counts,
      [tab.id]: stockRows.filter((row) => row.stockStatus === tab.id).length
    }),
    {}
  );

  return (
    <section className="report-section" aria-label="Stock pressing">
      <div className="section-heading">
        <div>
          <h2>Stock</h2>
          <p>Articles presents au pressing avant retrait client.</p>
        </div>
        <strong>{stockRows.length}</strong>
      </div>

      <div className="stock-tabs" role="tablist" aria-label="Etat du stock">
        {STOCK_TABS.map((tab) => (
          <button
            className={activeStockTab === tab.id ? "stock-tab active" : "stock-tab"}
            key={tab.id}
            type="button"
            onClick={() => setActiveStockTab(tab.id)}
          >
            <span>{tab.label}</span>
            <strong>{stockCounts[tab.id] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="stock-list">
        {visibleStockRows.length === 0 ? (
          <div className="empty-history">Aucun article dans cette categorie.</div>
        ) : (
          visibleStockRows.map((row) => (
            <article className="stock-item" key={row.id}>
              <div className="stock-item-main">
                <span className="mini-icon" aria-hidden="true">
                  {row.icon}
                </span>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.reserve}</p>
                  <small>
                    {row.details.color} - {row.details.fabric} - {row.details.pattern} -{" "}
                    {row.details.design}
                    {row.details.brand !== "Non precise" ? ` - ${row.details.brand}` : ""}
                  </small>
                </div>
              </div>
              <div className="stock-meta">
                <strong>{row.ticketNumber}</strong>
                <span>{row.clientPhone}</span>
                <span>Depot: {formatDateOnly(row.createdAt)}</span>
                <span>Retrait prevu: {formatDateOnly(row.expectedPickupDate)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SettingsView({
  onCreateSupportTicket,
  clientPortalLink,
  pressingAnnouncements = [],
  pressingName,
  pressingSupportTickets = [],
  role,
  showTenantMessaging = true,
  userEmail
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportPriority, setSupportPriority] = useState("normal");
  const [supportStatus, setSupportStatus] = useState({ type: "", message: "" });
  const [isCreatingSupportTicket, setIsCreatingSupportTicket] = useState(false);

  async function submitPasswordUpdate(event) {
    event.preventDefault();
    setPasswordStatus({ type: "", message: "" });

    if (!isSupabaseConfigured) {
      setPasswordStatus({
        type: "error",
        message: "Supabase doit etre configure pour modifier le mot de passe."
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: "Le nouveau mot de passe doit contenir au moins 6 caracteres."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "Les deux mots de passe ne correspondent pas."
      });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordStatus({
        type: "error",
        message: "Modification impossible. Verifiez le mot de passe ou reconnectez-vous."
      });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus({ type: "success", message: "Mot de passe mis a jour." });
  }

  async function submitSupportTicket(event) {
    event.preventDefault();
    setSupportStatus({ type: "", message: "" });

    if (!onCreateSupportTicket) {
      setSupportStatus({ type: "error", message: "Support indisponible pour ce compte." });
      return;
    }

    if (supportSubject.trim().length < 5) {
      setSupportStatus({ type: "error", message: "Decrivez rapidement votre demande." });
      return;
    }

    setIsCreatingSupportTicket(true);
    const result = await onCreateSupportTicket({
      subject: supportSubject,
      priority: supportPriority
    });
    setIsCreatingSupportTicket(false);

    if (!result.ok) {
      setSupportStatus({ type: "error", message: result.message });
      return;
    }

    setSupportSubject("");
    setSupportPriority("normal");
    setSupportStatus({ type: "success", message: "Demande envoyee au Super Admin." });
  }

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Parametres">
        <div className="section-heading">
          <div>
            <h2>Parametres</h2>
            <p>Informations du compte connecte.</p>
          </div>
        </div>

        <div className="settings-grid">
          <article className="report-card">
            <span>Pressing</span>
            <strong>{pressingName}</strong>
          </article>
          <article className="report-card">
            <span>Role</span>
            <strong>{ROLE_LABELS[role] || role}</strong>
          </article>
        </div>

        <form className="password-settings" onSubmit={submitPasswordUpdate}>
          <div>
            <h3>Mot de passe</h3>
            <p>{userEmail || "Compte connecte"}</p>
          </div>

          <div className="password-fields">
            <label htmlFor="new-password">
              Nouveau mot de passe
              <input
                id="new-password"
                autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordStatus({ type: "", message: "" });
                }}
                placeholder="Au moins 6 caracteres"
              />
            </label>

            <label htmlFor="confirm-password">
              Confirmer le mot de passe
              <input
                id="confirm-password"
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordStatus({ type: "", message: "" });
                }}
                placeholder="Repeter le mot de passe"
              />
            </label>
          </div>

          {passwordStatus.message && (
            <div className={`password-status ${passwordStatus.type}`}>{passwordStatus.message}</div>
          )}

          <button type="submit" disabled={isUpdatingPassword}>
            {isUpdatingPassword ? "Mise a jour..." : "Modifier le mot de passe"}
          </button>
        </form>
      </section>

      {clientPortalLink && (
        <section className="report-section" aria-label="Lien client">
          <div className="section-heading">
            <div>
              <h2>Lien client</h2>
              <p>Envoyez ce lien aux clients pour qu'ils creent leur compte dans ce pressing.</p>
            </div>
          </div>
          <div className="client-link-box">
            <strong>{clientPortalLink}</strong>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(clientPortalLink)}
            >
              Copier
            </button>
          </div>
        </section>
      )}

      {showTenantMessaging && (
        <>
          <section className="report-section" aria-label="Annonces plateforme">
            <div className="section-heading">
              <div>
                <h2>Annonces plateforme</h2>
                <p>Messages envoyes par le Super Admin.</p>
              </div>
              <strong>{pressingAnnouncements.length}</strong>
            </div>

            <div className="client-list">
              {pressingAnnouncements.length === 0 ? (
                <div className="empty-history">Aucune annonce pour le moment.</div>
              ) : (
                pressingAnnouncements.map((announcement) => (
                  <article className="client-item" key={announcement.id}>
                    <div>
                      <strong>{announcement.title}</strong>
                      <span>{announcement.message}</span>
                    </div>
                    <div>
                      <span>Audience: {announcement.audience}</span>
                      <span>{formatDateTime(announcement.createdAt)}</span>
                    </div>
                    <strong>{announcement.status}</strong>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="report-section" aria-label="Support plateforme">
            <div className="section-heading">
              <div>
                <h2>Support</h2>
                <p>Envoyez une demande au Super Admin.</p>
              </div>
              <strong>{pressingSupportTickets.length}</strong>
            </div>

            <form className="platform-form" onSubmit={submitSupportTicket}>
              <label className="wide-field">
                Sujet
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  placeholder="Ex: Impossible de valider un retrait"
                />
              </label>
              <label>
                Priorite
                <select
                  value={supportPriority}
                  onChange={(event) => setSupportPriority(event.target.value)}
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
              <button type="submit" disabled={isCreatingSupportTicket}>
                {isCreatingSupportTicket ? "Envoi..." : "Envoyer"}
              </button>
              {supportStatus.message && (
                <div className={`password-status ${supportStatus.type}`}>{supportStatus.message}</div>
              )}
            </form>

            <div className="client-list">
              {pressingSupportTickets.length === 0 ? (
                <div className="empty-history">Aucune demande support envoyee.</div>
              ) : (
                pressingSupportTickets.map((ticket) => (
                  <article className="client-item" key={ticket.id}>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <span>Priorite: {ticket.priority}</span>
                    </div>
                    <div>
                      <span>Statut: {ticket.status}</span>
                      <span>{formatDateTime(ticket.createdAt)}</span>
                    </div>
                    <strong>{ticket.status}</strong>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AddArticleView({ articles, onAddArticle }) {
  const [articleName, setArticleName] = useState("");
  const [articlePrice, setArticlePrice] = useState("");
  const [articleStatus, setArticleStatus] = useState({ type: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  async function submitArticle(event) {
    event.preventDefault();
    setArticleStatus({ type: "", message: "" });

    const cleanName = articleName.trim().replace(/\s+/g, " ");
    const numericPrice = Number(articlePrice.replace(/\D/g, ""));

    if (cleanName.length < 2) {
      setArticleStatus({ type: "error", message: "Saisissez le nom de l'article." });
      return;
    }

    if (!numericPrice || numericPrice < 1) {
      setArticleStatus({ type: "error", message: "Saisissez un prix valide." });
      return;
    }

    const normalizedName = cleanName.toLocaleLowerCase("fr-FR");
    const alreadyExists = articles.some(
      (article) => article.name.toLocaleLowerCase("fr-FR") === normalizedName
    );

    if (alreadyExists) {
      setArticleStatus({ type: "error", message: "Cet article existe deja dans la liste." });
      return;
    }

    setIsSaving(true);
    const result = await onAddArticle({ name: cleanName, price: numericPrice });
    setIsSaving(false);

    if (!result.ok) {
      setArticleStatus({ type: "error", message: result.message });
      return;
    }

    setArticleName("");
    setArticlePrice("");
    setArticleStatus({ type: "success", message: "Article ajoute a la liste." });
  }

  return (
    <section className="report-section" aria-label="Ajouter un article">
      <div className="section-heading">
        <div>
          <h2>Ajouter un article</h2>
          <p>Creation d'un article absent de la liste actuelle.</p>
        </div>
      </div>

      <form className="article-create-form" onSubmit={submitArticle}>
        <label htmlFor="new-article-name">
          Nom de l'article
          <input
            id="new-article-name"
            value={articleName}
            onChange={(event) => {
              setArticleName(event.target.value);
              setArticleStatus({ type: "", message: "" });
            }}
            placeholder="Ex: Boubou"
          />
        </label>

        <label htmlFor="new-article-price">
          Prix
          <input
            id="new-article-price"
            inputMode="numeric"
            value={articlePrice}
            onChange={(event) => {
              setArticlePrice(event.target.value.replace(/\D/g, ""));
              setArticleStatus({ type: "", message: "" });
            }}
            placeholder="Ex: 2500"
          />
        </label>

        {articleStatus.message && (
          <div className={`password-status ${articleStatus.type}`}>{articleStatus.message}</div>
        )}

        <button type="submit" disabled={isSaving}>
          {isSaving ? "Enregistrement..." : "Ajouter l'article"}
        </button>
      </form>

      <div className="article-preview-list" aria-label="Articles disponibles">
        {articles.map((article) => (
          <article className="article-preview-item" key={article.id}>
            <span className="mini-icon" aria-hidden="true">
              {article.icon}
            </span>
            <div>
              <strong>{article.name}</strong>
              <small>{formatMoney(article.price)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TicketReadModal({ order, onClose }) {
  if (!order) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="pickup-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">Detail ticket</p>
            <h2>{order.ticketNumber}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="pickup-summary">
          <div>
            <span>Client</span>
            <strong>{order.clientPhone}</strong>
          </div>
          <div>
            <span>Depot</span>
            <strong>{formatDateTime(order.createdAt)}</strong>
          </div>
          <div>
            <span>Retrait</span>
            <strong>{formatDateTime(order.pickedUpAt)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatMoney(order.total)}</strong>
          </div>
        </div>

        <div className="pickup-detail-list">
          {order.items.map((item, index) => (
            <article className="pickup-detail-item" key={item.lineId || index}>
              <div>
                <span className="mini-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <strong>
                  {item.copyTotal > 1
                    ? `${item.name} ${item.copyNumber}/${item.copyTotal}`
                    : item.name}
                </strong>
              </div>
              {item.washOptionLabel && <p>{item.washOptionLabel}</p>}
              <p>{item.reserve}</p>
              <small>
                {item.details.color} - {item.details.fabric} - {item.details.pattern} -{" "}
                {item.details.design}
                {item.details.brand !== "Non precise" ? ` - ${item.details.brand}` : ""}
              </small>
              {item.details.note && <small>{item.details.note}</small>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientPortal({
  clientArticlePrices,
  clientProfile,
  clientRequests,
  onCreateClientRequest,
  onLogout,
  pressingName
}) {
  const [serviceType, setServiceType] = useState(DEFAULT_PRICE_OPTION_ID);
  const [articleId, setArticleId] = useState(MOCK_ARTICLES[0].id);
  const [quantity, setQuantity] = useState("1");
  const [items, setItems] = useState([]);
  const [collectionAddress, setCollectionAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");
  const [requestStatus, setRequestStatus] = useState({ type: "", message: "" });
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const serviceOptions = DEPOSIT_PRICE_OPTIONS;
  const selectedOptionPrices = getOptionPrices(clientArticlePrices, serviceType);
  const clientPricedArticles = MOCK_ARTICLES.map((article) => ({
    ...article,
    price:
      serviceType === DEFAULT_PRICE_OPTION_ID
        ? getOptionPrices(clientArticlePrices, DEFAULT_PRICE_OPTION_ID)[article.id] ?? article.price
        : selectedOptionPrices[article.id] ?? 0
  }));
  const selectedArticle = clientPricedArticles.find((article) => article.id === articleId) || clientPricedArticles[0];
  const estimatedTotal = items.reduce((sum, item) => sum + item.total, 0);

  function addRequestItem() {
    const itemQuantity = Math.max(1, Number(quantity.replace(/\D/g, "")) || 1);

    setItems((current) => [
      ...current,
      {
        lineId: crypto.randomUUID(),
        articleId: selectedArticle.id,
        name: selectedArticle.name,
        quantity: itemQuantity,
        unitPrice: selectedArticle.price,
        total: selectedArticle.price * itemQuantity
      }
    ]);
    setQuantity("1");
  }

  async function submitClientRequest(event) {
    event.preventDefault();
    setRequestStatus({ type: "", message: "" });

    if (items.length === 0) {
      setRequestStatus({ type: "error", message: "Ajoutez au moins un vetement." });
      return;
    }

    if (collectionAddress.trim().length < 5) {
      setRequestStatus({ type: "error", message: "Saisissez l'adresse de collecte." });
      return;
    }

    setIsSendingRequest(true);
    const result = await onCreateClientRequest({
      serviceType,
      deliveryMode: "pickup_and_delivery",
      collectionAddress: collectionAddress.trim(),
      deliveryAddress: deliveryAddress.trim() || collectionAddress.trim(),
      requestedDate,
      items,
      note: note.trim(),
      estimatedTotal
    });
    setIsSendingRequest(false);

    if (!result.ok) {
      setRequestStatus({ type: "error", message: result.message });
      return;
    }

    setItems([]);
    setCollectionAddress("");
    setDeliveryAddress("");
    setRequestedDate("");
    setNote("");
    setRequestStatus({ type: "success", message: "Demande envoyee au gerant du pressing." });
  }

  return (
    <main className="client-portal-shell">
      <header className="client-portal-header">
        <div>
          <p className="eyebrow">{pressingName}</p>
          <h1>Espace client</h1>
          <p>{clientProfile?.fullName || "Client"}</p>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          Deconnexion
        </button>
      </header>

      <section className="report-section" aria-label="Tarifs client">
        <div className="section-heading">
          <div>
            <h2>Tarifs lavage</h2>
            <p>Choisissez le type de lavage avant de declarer vos vetements.</p>
          </div>
        </div>

        <div className="price-service-tabs" role="tablist" aria-label="Types de lavage">
          {serviceOptions.map((option) => (
            <button
              className={serviceType === option.id ? "price-service-tab active" : "price-service-tab"}
              key={option.id}
              type="button"
              onClick={() => setServiceType(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="article-preview-list">
          {clientPricedArticles.map((article) => (
            <article className="article-preview-item" key={article.id}>
              <span className="mini-icon" aria-hidden="true">
                {article.icon}
              </span>
              <div>
                <strong>{article.name}</strong>
                <small>{formatMoney(article.price)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" aria-label="Nouvelle demande">
        <div className="section-heading">
          <div>
            <h2>Nouvelle demande</h2>
            <p>Ramassage et livraison a domicile.</p>
          </div>
          <strong>{formatMoney(estimatedTotal)}</strong>
        </div>

        <form className="platform-form" onSubmit={submitClientRequest}>
          <label>
            Vetement
            <select value={articleId} onChange={(event) => setArticleId(event.target.value)}>
              {clientPricedArticles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.name} - {formatMoney(article.price)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantite
            <input
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="button" onClick={addRequestItem}>
            Ajouter
          </button>

          <label className="wide-field">
            Adresse de collecte
            <input
              value={collectionAddress}
              onChange={(event) => setCollectionAddress(event.target.value)}
              placeholder="Quartier, rue, repere"
            />
          </label>
          <label className="wide-field">
            Adresse de livraison
            <input
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              placeholder="Laisser vide si identique a la collecte"
            />
          </label>
          <label>
            Date souhaitee
            <input
              type="date"
              value={requestedDate}
              onChange={(event) => setRequestedDate(event.target.value)}
            />
          </label>
          <label className="wide-field">
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Taches, instructions, urgence..."
            />
          </label>

          {requestStatus.message && (
            <div className={`password-status ${requestStatus.type}`}>{requestStatus.message}</div>
          )}

          <button type="submit" disabled={isSendingRequest}>
            {isSendingRequest ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>

        <div className="client-list">
          {items.length === 0 ? (
            <div className="empty-history">Aucun vetement ajoute.</div>
          ) : (
            items.map((item) => (
              <article className="client-item" key={item.lineId}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{getPriceOptionLabel(serviceType)}</span>
                </div>
                <div>
                  <span>Quantite: {item.quantity}</span>
                  <span>Prix unitaire: {formatMoney(item.unitPrice)}</span>
                </div>
                <strong>{formatMoney(item.total)}</strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="report-section" aria-label="Demandes client">
        <div className="section-heading">
          <div>
            <h2>Mes demandes</h2>
            <p>Suivi des demandes envoyees au pressing.</p>
          </div>
          <strong>{clientRequests.length}</strong>
        </div>

        <div className="client-list">
          {clientRequests.length === 0 ? (
            <div className="empty-history">Aucune demande envoyee.</div>
          ) : (
            clientRequests.map((request) => (
              <article className="client-item" key={request.id}>
                <div>
                  <strong>{getPriceOptionLabel(request.serviceType)}</strong>
                  <span>{request.items.length} ligne(s) - {formatDateTime(request.createdAt)}</span>
                </div>
                <div>
                  <span>{request.collectionAddress}</span>
                  <span>{CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}</span>
                </div>
                <strong>{formatMoney(request.estimatedTotal)}</strong>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function ClientRequestsView({ clientRequests, onUpdateClientRequestStatus }) {
  return (
    <section className="report-section" aria-label="Demandes clients">
      <div className="section-heading">
        <div>
          <h2>Demandes clients</h2>
          <p>Demandes envoyees depuis le lien client du pressing.</p>
        </div>
        <strong>{clientRequests.length}</strong>
      </div>

      <div className="client-list">
        {clientRequests.length === 0 ? (
          <div className="empty-history">Aucune demande client recue.</div>
        ) : (
          clientRequests.map((request) => (
            <article className="client-detail-ticket" key={request.id}>
              <div className="client-detail-ticket-top">
                <div>
                  <strong>{request.clientName}</strong>
                  <span>
                    {request.clientPhone} - {request.clientEmail}
                  </span>
                </div>
                <span className="status-badge status-in_processing">
                  {CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}
                </span>
              </div>
              <div className="client-detail-ticket-meta">
                <span>{getPriceOptionLabel(request.serviceType)}</span>
                <span>Collecte: {request.collectionAddress}</span>
                <strong>{formatMoney(request.estimatedTotal)}</strong>
              </div>
              <div className="client-detail-items">
                {request.items.map((item) => (
                  <span key={item.lineId || item.articleId}>
                    {item.name} x{item.quantity}
                  </span>
                ))}
              </div>
              {request.note && <p>{request.note}</p>}
              <div className="history-actions">
                <button
                  className="picked-up-button"
                  type="button"
                  onClick={() => onUpdateClientRequestStatus(request.id, "accepted")}
                >
                  Accepter
                </button>
                <button
                  className="back-button compact-button"
                  type="button"
                  onClick={() => onUpdateClientRequestStatus(request.id, "awaiting_deposit")}
                >
                  Attente depot
                </button>
                <button
                  className="back-button compact-button"
                  type="button"
                  onClick={() => onUpdateClientRequestStatus(request.id, "deposit_confirmed")}
                >
                  Depot confirme
                </button>
                <button
                  className="delete-ticket-button"
                  type="button"
                  onClick={() => onUpdateClientRequestStatus(request.id, "refused")}
                >
                  Refuser
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SupervisorDashboard({
  onCreateSupportTicket,
  databaseError,
  historyLoading,
  onLogout,
  orderHistory,
  pressingAnnouncements,
  pressingId,
  pressingName,
  pressingSupportTickets,
  role,
  selectedOrder,
  setSelectedOrder,
  userEmail
}) {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <AppShell
      activeView={activeView}
      menuItems={SUPERVISOR_MENU}
      onLogout={onLogout}
      onSelectView={setActiveView}
      pressingName={pressingName}
      role={role}
    >
      {databaseError && <div className="database-error">{databaseError}</div>}

      {activeView === "dashboard" && (
        <div className="workspace-stack">
          <ReportStatsGrid orderHistory={orderHistory} />
          <DashboardCharts orderHistory={orderHistory} />
          <TicketsReport
            historyLoading={historyLoading}
            onSelectOrder={setSelectedOrder}
            orderHistory={orderHistory.slice(0, 8)}
            title="Derniers tickets"
          />
        </div>
      )}

      {(activeView === "reports" || activeView === "tickets") && (
        <TicketsReport
          historyLoading={historyLoading}
          onSelectOrder={setSelectedOrder}
          orderHistory={orderHistory}
          title={activeView === "reports" ? "Rapports" : "Tickets"}
        />
      )}

      {activeView === "stock" && <StockView orderHistory={orderHistory} />}

      {activeView === "clients" && <ClientsReport orderHistory={orderHistory} />}

      {activeView === "settings" && (
        <SettingsView
          clientPortalLink={
            pressingId ? getClientPortalLink(pressingId, pressingName) : ""
          }
          onCreateSupportTicket={onCreateSupportTicket}
          pressingAnnouncements={pressingAnnouncements}
          pressingName={pressingName}
          pressingSupportTickets={pressingSupportTickets}
          role={role}
          userEmail={userEmail}
        />
      )}

      <TicketReadModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </AppShell>
  );
}

function LoginPage({ clientInvitePressingId, clientInvitePressingName, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isClientSignup, setIsClientSignup] = useState(Boolean(clientInvitePressingId));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isClientInvite = Boolean(clientInvitePressingId);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase doit etre configure pour activer la connexion securisee.");
      return;
    }

    setIsSubmitting(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setIsSubmitting(false);

    if (authError || !data.session) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    const role = getSessionRole(data.session);
    const hasScope = Boolean(getSessionPressingId(data.session)) || isPlatformAdminRole(role);

    if (isClientRole(role)) {
      onLogin(data.session);
      return;
    }

    if (!canAccessDashboard(role) || !hasScope) {
      await supabase.auth.signOut();
      setError("Ce compte n'a pas le role admin/superviseur ou aucun pressing associe.");
      return;
    }

    onLogin(data.session);
  }

  async function submitClientSignup(event) {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase doit etre configure pour creer un compte client.");
      return;
    }

    if (!clientInvitePressingId) {
      setError("Lien client invalide: aucun pressing n'est associe.");
      return;
    }

    if (clientName.trim().length < 2 || clientPhone.trim().length < 6) {
      setError("Saisissez votre nom et votre numero de telephone.");
      return;
    }

    setIsSubmitting(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: "client",
          full_name: clientName.trim(),
          phone: clientPhone.trim(),
          pressing_id: clientInvitePressingId,
          pressing_name: clientInvitePressingName
        }
      }
    });
    setIsSubmitting(false);

    if (signupError) {
      setError("Creation impossible. Verifiez l'email ou le mot de passe.");
      return;
    }

    if (data.session) {
      onLogin(data.session);
      return;
    }

    setError("Compte cree. Verifiez votre email puis reconnectez-vous.");
    setIsClientSignup(false);
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Connexion administrateur ou superviseur">
        <div>
          <p className="eyebrow">{isClientInvite ? clientInvitePressingName : "PressingTrack"}</p>
          <h1>{isClientInvite ? "Espace client" : "Connexion"}</h1>
          <p className="login-copy">
            {isClientInvite
              ? "Creez votre compte pour envoyer une demande de lavage au pressing."
              : "Acces reserve au comptoir, aux rapports et a l'historique."}
          </p>
        </div>

        {isClientInvite && (
          <div className="price-service-tabs" role="tablist" aria-label="Mode client">
            <button
              className={isClientSignup ? "price-service-tab active" : "price-service-tab"}
              type="button"
              onClick={() => {
                setIsClientSignup(true);
                setError("");
              }}
            >
              Creer compte
            </button>
            <button
              className={!isClientSignup ? "price-service-tab active" : "price-service-tab"}
              type="button"
              onClick={() => {
                setIsClientSignup(false);
                setError("");
              }}
            >
              Connexion
            </button>
          </div>
        )}

        <form className="login-form" onSubmit={isClientSignup ? submitClientSignup : submitLogin}>
          {isClientSignup && (
            <>
              <label htmlFor="client-name">
                Nom complet
                <input
                  id="client-name"
                  autoComplete="name"
                  value={clientName}
                  onChange={(event) => {
                    setClientName(event.target.value);
                    setError("");
                  }}
                  placeholder="Votre nom"
                />
              </label>

              <label htmlFor="client-phone">
                Numero de telephone
                <input
                  id="client-phone"
                  autoComplete="tel"
                  value={clientPhone}
                  onChange={(event) => {
                    setClientPhone(event.target.value);
                    setError("");
                  }}
                  placeholder="Ex: 0700000000"
                />
              </label>
            </>
          )}

          <label htmlFor="admin-email">
            Email
            <input
              id="admin-email"
              autoComplete="username"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="admin@pressingtrack.com"
            />
          </label>

          <label htmlFor="admin-password">
            Mot de passe
            <input
              id="admin-password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Mot de passe"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Patientez..." : isClientSignup ? "Creer mon compte" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [adminSession, setAdminSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [articlePrices, setArticlePrices] = useState(getStoredArticlePrices);
  const [customArticles, setCustomArticles] = useState(getStoredCustomArticles);
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);
  const [activePriceOption, setActivePriceOption] = useState(DEFAULT_PRICE_OPTION_ID);
  const [fanicoQuantity, setFanicoQuantity] = useState("");
  const [fanicoPrice, setFanicoPrice] = useState("");
  const [ticketItems, setTicketItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedWashOption, setSelectedWashOption] = useState(DEFAULT_PRICE_OPTION_ID);
  const [selectedReserves, setSelectedReserves] = useState([]);
  const [isDetailsStep, setIsDetailsStep] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [detailItems, setDetailItems] = useState(createDetailsList(1));
  const [phone, setPhone] = useState("");
  const [validatedOrder, setValidatedOrder] = useState(null);
  const [historyPeriod, setHistoryPeriod] = useState("day");
  const [orderHistory, setOrderHistory] = useState(getStoredHistory);
  const [historyLoading, setHistoryLoading] = useState(isSupabaseConfigured);
  const [databaseError, setDatabaseError] = useState("");
  const [platformPressings, setPlatformPressings] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [platformInvoices, setPlatformInvoices] = useState([]);
  const [platformAnnouncements, setPlatformAnnouncements] = useState([]);
  const [platformSupportTickets, setPlatformSupportTickets] = useState([]);
  const [pressingAnnouncements, setPressingAnnouncements] = useState([]);
  const [pressingSupportTickets, setPressingSupportTickets] = useState([]);
  const [clientProfile, setClientProfile] = useState(null);
  const [clientRequests, setClientRequests] = useState([]);
  const [pressingClientRequests, setPressingClientRequests] = useState([]);
  const [clientArticlePrices, setClientArticlePrices] = useState(createEmptyPriceOptions);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [pickupQuery, setPickupQuery] = useState("");
  const [selectedPickupOrder, setSelectedPickupOrder] = useState(null);
  const [selectedReportOrder, setSelectedReportOrder] = useState(null);
  const [activeAdminView, setActiveAdminView] = useState("deposit");
  const currentRole = getSessionRole(adminSession);
  const currentPressingId = getSessionPressingId(adminSession);
  const currentPressingName = getSessionPressingName(adminSession);
  const isAdmin = isAdminRole(currentRole);
  const isPlatformAdmin = isPlatformAdminRole(currentRole);
  const isClient = isClientRole(currentRole);
  const hasPressingScope = Boolean(currentPressingId) || isPlatformAdmin;
  const clientInvitePressingId = new URLSearchParams(window.location.search).get("client_pressing");
  const clientInvitePressingName =
    new URLSearchParams(window.location.search).get("pressing_name") || "Votre pressing";

  const total = useMemo(
    () => ticketItems.reduce((sum, item) => sum + item.price, 0),
    [ticketItems]
  );
  const normalArticlePrices = getOptionPrices(articlePrices, DEFAULT_PRICE_OPTION_ID);
  const activeArticlePrices = getOptionPrices(articlePrices, activePriceOption);
  const pricedArticles = useMemo(
    () => [
      ...MOCK_ARTICLES.map((article) => ({
        ...article,
        price: normalArticlePrices[article.id] ?? article.price
      })),
      ...customArticles.map((article) => ({
        ...article,
        price: normalArticlePrices[article.id] ?? article.price
      }))
    ],
    [normalArticlePrices, customArticles]
  );
  const activePricedArticles = useMemo(
    () =>
      pricedArticles.map((article) => ({
        ...article,
        price:
          activePriceOption === DEFAULT_PRICE_OPTION_ID
            ? article.price
            : activeArticlePrices[article.id] ?? 0
      })),
    [activeArticlePrices, activePriceOption, pricedArticles]
  );
  const selectedArticlePriceOptions = useMemo(() => {
    if (!selectedArticle) {
      return [];
    }

    return DEPOSIT_PRICE_OPTIONS.map((option) => {
      const optionPrices = getOptionPrices(articlePrices, option.id);
      const price =
        option.id === DEFAULT_PRICE_OPTION_ID
          ? selectedArticle.price
          : optionPrices[selectedArticle.id] ?? 0;

      return {
        ...option,
        price
      };
    });
  }, [articlePrices, selectedArticle]);
  const fanicoRows = useMemo(() => {
    const fanicoPrices = getOptionPrices(articlePrices, FANICO_PRICE_OPTION_ID);

    return Object.entries(fanicoPrices)
      .filter(([bundleId]) => bundleId.startsWith(FANICO_BUNDLE_PREFIX))
      .map(([bundleId, price]) => ({
        id: bundleId,
        quantity: getFanicoBundleQuantity(bundleId),
        price
      }))
      .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0)
      .sort((a, b) => a.quantity - b.quantity);
  }, [articlePrices]);

  const canValidate = ticketItems.length > 0 && phone.length >= 8;
  const visibleHistory = useMemo(() => {
    const nowKey = getPeriodKey(new Date(), historyPeriod);
    return orderHistory.filter((order) => getPeriodKey(order.createdAt, historyPeriod) === nowKey);
  }, [historyPeriod, orderHistory]);
  const pickupMatches = useMemo(() => {
    const normalizedQuery = pickupQuery.trim().replace(/^#/, "").toUpperCase();

    if (normalizedQuery.length < 2) {
      return [];
    }

    return orderHistory
      .filter((order) =>
        order.ticketNumber.replace(/^#/, "").toUpperCase().includes(normalizedQuery)
      )
      .slice(0, 8);
  }, [pickupQuery, orderHistory]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      localStorage.removeItem("pressingtrack-ticket-history");
      return;
    }

    localStorage.setItem("pressingtrack-ticket-history", JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      localStorage.removeItem("pressingtrack-article-prices");
      return;
    }

    localStorage.setItem("pressingtrack-article-prices", JSON.stringify(articlePrices));
  }, [articlePrices]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      localStorage.removeItem(CUSTOM_ARTICLES_STORAGE_KEY);
      return;
    }

    localStorage.setItem(CUSTOM_ARTICLES_STORAGE_KEY, JSON.stringify(customArticles));
  }, [customArticles]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const role = getSessionRole(session);
      const hasScope = Boolean(getSessionPressingId(session)) || isPlatformAdminRole(role);

      if (!isMounted) {
        return;
      }

      setAdminSession((canAccessDashboard(role) && hasScope) || isClientRole(role) ? session : null);
      setAuthLoading(false);
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = getSessionRole(session);
      const hasScope = Boolean(getSessionPressingId(session)) || isPlatformAdminRole(role);
      setAdminSession((canAccessDashboard(role) && hasScope) || isClientRole(role) ? session : null);
      setAuthLoading(false);
    });

    loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !hasPressingScope || isClientRole(currentRole)) {
      setHistoryLoading(false);
      return;
    }

    async function loadTickets() {
      setHistoryLoading(true);
      setDatabaseError("");

      let query = supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (currentPressingId) {
        query = query.eq("pressing_id", currentPressingId);
      }

      const { data, error } = await query;

      if (error) {
        setDatabaseError("Lecture Supabase impossible. Mode local conserve.");
        setHistoryLoading(false);
        return;
      }

      setOrderHistory(data.map(fromDatabaseTicket));
      setHistoryLoading(false);
    }

    loadTickets();
  }, [adminSession, currentPressingId, currentRole, hasPressingScope]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !currentPressingId || !isAdmin) {
      setPressingClientRequests([]);
      return;
    }

    async function loadPressingClientRequests() {
      const { data, error } = await supabase
        .from("client_service_requests")
        .select("*")
        .eq("pressing_id", currentPressingId)
        .order("created_at", { ascending: false });

      if (error) {
        setDatabaseError("Lecture des demandes clients impossible.");
        return;
      }

      setPressingClientRequests(data.map(fromDatabaseClientRequest));
    }

    loadPressingClientRequests();
  }, [adminSession, currentPressingId, isAdmin]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !isClientRole(currentRole)) {
      setClientProfile(null);
      setClientRequests([]);
      return;
    }

    async function loadClientPortalData() {
      const { data: profilesData, error: profileError } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", adminSession.user.id)
        .limit(1);

      if (profileError) {
        setDatabaseError("Lecture du profil client impossible.");
        return;
      }

      let profile = profilesData[0] ? fromDatabaseClientProfile(profilesData[0]) : null;
      const metadataPressingId = getSessionPressingId(adminSession);

      if (!profile && metadataPressingId) {
        const row = {
          user_id: adminSession.user.id,
          pressing_id: metadataPressingId,
          full_name: adminSession.user.user_metadata?.full_name || "Client",
          email: adminSession.user.email,
          phone: adminSession.user.user_metadata?.phone || ""
        };
        const { data: insertedProfile, error: insertError } = await supabase
          .from("client_profiles")
          .insert(row)
          .select("*")
          .single();

        if (insertError) {
          setDatabaseError("Creation du profil client impossible.");
          return;
        }

        profile = fromDatabaseClientProfile(insertedProfile);
      }

      if (!profile) {
        setDatabaseError("Ce compte client n'est associe a aucun pressing.");
        return;
      }

      setClientProfile(profile);

      const [{ data: requestsData, error: requestsError }, { data: pricesData, error: pricesError }] =
        await Promise.all([
          supabase
            .from("client_service_requests")
            .select("*")
            .eq("client_user_id", adminSession.user.id)
            .order("created_at", { ascending: false }),
          supabase.from("article_prices").select("*").eq("pressing_id", profile.pressingId)
        ]);

      if (requestsError || pricesError) {
        setDatabaseError("Lecture des demandes ou tarifs client impossible.");
        return;
      }

      const nextPrices = createEmptyPriceOptions();
      pricesData.forEach((row) => {
        const { priceOptionId, articleId } = parsePriceRowId(row.article_id);
        nextPrices[priceOptionId][articleId] = row.price;
      });

      setClientRequests(requestsData.map(fromDatabaseClientRequest));
      setClientArticlePrices(nextPrices);
    }

    loadClientPortalData();
  }, [adminSession, currentRole]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !isAdmin || !currentPressingId) {
      return;
    }

    async function loadArticlePrices() {
      const { data, error } = await supabase
        .from("article_prices")
        .select("*")
        .eq("pressing_id", currentPressingId);

      if (error) {
        setDatabaseError("Lecture des prix Supabase impossible. Prix locaux conserves.");
        return;
      }

      const nextPrices = createEmptyPriceOptions();
      data.forEach((row) => {
        const { priceOptionId, articleId } = parsePriceRowId(row.article_id);
        nextPrices[priceOptionId][articleId] = row.price;
      });
      const nextCustomArticles = data
        .filter((row) => {
          const { priceOptionId, articleId } = parsePriceRowId(row.article_id);
          return priceOptionId === DEFAULT_PRICE_OPTION_ID && !DEFAULT_ARTICLE_IDS.has(articleId);
        })
        .map((row) =>
          createCustomArticle({
            id: parsePriceRowId(row.article_id).articleId,
            name: row.article_name,
            price: row.price
          })
        )
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));

      setArticlePrices(nextPrices);
      setCustomArticles(nextCustomArticles);
    }

    loadArticlePrices();
  }, [adminSession, currentPressingId, isAdmin]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || isPlatformAdmin || !currentPressingId) {
      setPressingAnnouncements([]);
      setPressingSupportTickets([]);
      return;
    }

    async function loadPressingPlatformMessages() {
      const [
        { data: announcementsData, error: announcementsError },
        { data: supportTicketsData, error: supportTicketsError }
      ] = await Promise.all([
        supabase
          .from("platform_announcements")
          .select("*")
          .eq("status", "published")
          .in("audience", ["all", "active", "trial"])
          .order("created_at", { ascending: false }),
        supabase
          .from("platform_support_tickets")
          .select("*")
          .eq("pressing_id", currentPressingId)
          .order("created_at", { ascending: false })
      ]);

      if (announcementsError || supportTicketsError) {
        setDatabaseError("Lecture messagerie/support impossible dans Supabase.");
        return;
      }

      setPressingAnnouncements(announcementsData.map(fromDatabaseAnnouncement));
      setPressingSupportTickets(supportTicketsData.map(fromDatabaseSupportTicket));
    }

    loadPressingPlatformMessages();
  }, [adminSession, currentPressingId, isPlatformAdmin]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !isPlatformAdmin) {
      setPlatformLoading(false);
      setPlatformPressings([]);
      setPlatformUsers([]);
      setPlatformInvoices([]);
      setPlatformAnnouncements([]);
      setPlatformSupportTickets([]);
      return;
    }

    async function loadPlatformData() {
      setPlatformLoading(true);
      setDatabaseError("");

      const [
        { data: pressingsData, error: pressingsError },
        { data: usersData, error: usersError },
        { data: invoicesData, error: invoicesError },
        { data: announcementsData, error: announcementsError },
        { data: supportTicketsData, error: supportTicketsError }
      ] = await Promise.all([
          supabase.from("pressings").select("*").order("created_at", { ascending: false }),
          supabase.from("platform_user_accounts").select("*").order("created_at", { ascending: false }),
          supabase
            .from("pressing_invoices")
            .select("*, pressings(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("platform_announcements")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("platform_support_tickets")
            .select("*, pressings(name)")
            .order("created_at", { ascending: false })
        ]);

      if (
        pressingsError ||
        usersError ||
        invoicesError ||
        announcementsError ||
        supportTicketsError
      ) {
        setDatabaseError(
          "Lecture plateforme incomplete. Executez la mise a jour SQL pour activer utilisateurs, abonnements, messagerie et support."
        );
        setPlatformLoading(false);
        return;
      }

      setPlatformPressings(pressingsData.map(fromDatabasePressing));
      setPlatformUsers(usersData.map(fromDatabasePlatformUser));
      setPlatformInvoices(invoicesData.map(fromDatabaseInvoice));
      setPlatformAnnouncements(announcementsData.map(fromDatabaseAnnouncement));
      setPlatformSupportTickets(supportTicketsData.map(fromDatabaseSupportTicket));
      setPlatformLoading(false);
    }

    loadPlatformData();
  }, [adminSession, isPlatformAdmin]);

  async function updatePressingSubscription(pressingId, subscriptionStatus) {
    setPlatformPressings((current) =>
      current.map((pressing) =>
        pressing.id === pressingId
          ? { ...pressing, subscriptionStatus, updatedAt: new Date().toISOString() }
          : pressing
      )
    );

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      return;
    }

    const { error } = await supabase
      .from("pressings")
      .update({ subscription_status: subscriptionStatus, updated_at: new Date().toISOString() })
      .eq("id", pressingId);

    if (error) {
      setDatabaseError("Mise a jour de l'abonnement echouee dans Supabase.");
      return;
    }

    setDatabaseError("");
  }

  async function updateInvoiceStatus(invoiceId, status) {
    const paidAt = status === "paid" ? new Date().toISOString() : null;

    setPlatformInvoices((current) =>
      current.map((invoice) => (invoice.id === invoiceId ? { ...invoice, status, paidAt } : invoice))
    );

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      return;
    }

    const { error } = await supabase
      .from("pressing_invoices")
      .update({ status, paid_at: paidAt, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (error) {
      setDatabaseError("Mise a jour de la facture echouee dans Supabase.");
      return;
    }

    setDatabaseError("");
  }

  async function createPlatformPressing({ name, ownerEmail, contact, planName }) {
    const planFees = {
      Starter: 10000,
      Pro: 25000,
      Premium: 50000
    };
    const row = {
      name: name.trim(),
      owner_email: ownerEmail.trim() || null,
      billing_email: ownerEmail.trim() || contact.trim() || null,
      plan_name: planName,
      monthly_fee: planFees[planName] || 0,
      subscription_status: "trial",
      subscription_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      const localPressing = fromDatabasePressing({
        ...row,
        id: crypto.randomUUID(),
        ticket_counter: 103,
        created_at: new Date().toISOString()
      });
      setPlatformPressings((current) => [localPressing, ...current]);
      return { ok: true };
    }

    const { data, error } = await supabase.from("pressings").insert(row).select("*").single();

    if (error) {
      setDatabaseError("Creation du pressing echouee dans Supabase.");
      return { ok: false, message: "Creation impossible dans Supabase." };
    }

    setPlatformPressings((current) => [fromDatabasePressing(data), ...current]);
    setDatabaseError("");
    return { ok: true };
  }

  async function createPlatformAnnouncement({ title, audience, message }) {
    const row = {
      title: title.trim(),
      message: message.trim(),
      audience,
      status: "published",
      updated_at: new Date().toISOString()
    };

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      const localAnnouncement = fromDatabaseAnnouncement({
        ...row,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      });
      setPlatformAnnouncements((current) => [localAnnouncement, ...current]);
      return { ok: true };
    }

    const { data, error } = await supabase
      .from("platform_announcements")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      setDatabaseError("Publication de l'annonce echouee dans Supabase.");
      return { ok: false, message: "Publication impossible dans Supabase." };
    }

    setPlatformAnnouncements((current) => [fromDatabaseAnnouncement(data), ...current]);
    setDatabaseError("");
    return { ok: true };
  }

  async function createSupportTicket({ subject, priority }) {
    if (!currentPressingId) {
      return { ok: false, message: "Aucun pressing n'est associe a ce compte." };
    }

    const row = {
      pressing_id: currentPressingId,
      subject: subject.trim(),
      priority,
      status: "open",
      updated_at: new Date().toISOString()
    };

    if (!isSupabaseConfigured) {
      const localTicket = fromDatabaseSupportTicket({
        ...row,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      });
      setPressingSupportTickets((current) => [localTicket, ...current]);
      return { ok: true };
    }

    const { data, error } = await supabase
      .from("platform_support_tickets")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      setDatabaseError("Envoi de la demande support echoue dans Supabase.");
      return { ok: false, message: "Envoi impossible dans Supabase." };
    }

    setPressingSupportTickets((current) => [fromDatabaseSupportTicket(data), ...current]);
    setDatabaseError("");
    return { ok: true };
  }

  async function updateSupportTicketStatus(ticketId, status) {
    setPlatformSupportTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status, updatedAt: new Date().toISOString() } : ticket
      )
    );

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      return;
    }

    const { error } = await supabase
      .from("platform_support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) {
      setDatabaseError("Mise a jour du support echouee dans Supabase.");
      return;
    }

    setDatabaseError("");
  }

  async function createClientServiceRequest(requestInput) {
    if (!clientProfile) {
      return { ok: false, message: "Profil client introuvable." };
    }

    const request = {
      ...requestInput,
      pressingId: clientProfile.pressingId,
      clientProfileId: clientProfile.id,
      clientUserId: adminSession.user.id,
      clientName: clientProfile.fullName,
      clientEmail: clientProfile.email,
      clientPhone: clientProfile.phone,
      status: "submitted"
    };

    if (!isSupabaseConfigured) {
      const localRequest = {
        ...request,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setClientRequests((current) => [localRequest, ...current]);
      return { ok: true };
    }

    const { data, error } = await supabase
      .from("client_service_requests")
      .insert(toDatabaseClientRequest(request))
      .select("*")
      .single();

    if (error) {
      setDatabaseError("Envoi de la demande client echoue dans Supabase.");
      return { ok: false, message: "Envoi impossible dans Supabase." };
    }

    setClientRequests((current) => [fromDatabaseClientRequest(data), ...current]);
    setDatabaseError("");
    return { ok: true };
  }

  async function updateClientRequestStatus(requestId, status) {
    setPressingClientRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status, updatedAt: new Date().toISOString() } : request
      )
    );

    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    const { error } = await supabase
      .from("client_service_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("pressing_id", currentPressingId)
      .eq("id", requestId);

    if (error) {
      setDatabaseError("Mise a jour de la demande client echouee.");
      return;
    }

    setDatabaseError("");
  }

  function resetArticleModal() {
    setSelectedWashOption(DEFAULT_PRICE_OPTION_ID);
    setSelectedReserves([]);
    setIsDetailsStep(false);
    setQuantity(1);
    setDetailItems(createDetailsList(1));
  }

  function openArticle(article) {
    setSelectedArticle(article);
    resetArticleModal();
  }

  async function saveArticlePrice(articleId, price, priceOptionId = DEFAULT_PRICE_OPTION_ID) {
    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    const article = pricedArticles.find((item) => item.id === articleId);
    const { error } = await supabase
      .from("article_prices")
      .upsert(
        {
          pressing_id: currentPressingId,
          article_id: getPriceRowId(priceOptionId, articleId),
          article_name: article?.name || articleId,
          price,
          updated_at: new Date().toISOString()
        },
        { onConflict: "pressing_id,article_id" }
      );

    if (error) {
      setDatabaseError("Sauvegarde du prix echouee dans Supabase.");
      return;
    }

    setDatabaseError("");
  }

  async function addCustomArticle({ name, price }) {
    const baseId = `custom-${slugifyArticleName(name)}`;
    const existingIds = new Set(pricedArticles.map((article) => article.id));
    let articleId = baseId;
    let suffix = 2;

    while (existingIds.has(articleId)) {
      articleId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const article = createCustomArticle({ id: articleId, name, price });

    if (isSupabaseConfigured && currentPressingId) {
      const { error } = await supabase
        .from("article_prices")
        .upsert(
          {
            pressing_id: currentPressingId,
            article_id: article.id,
            article_name: article.name,
            price: article.price,
            updated_at: new Date().toISOString()
          },
          { onConflict: "pressing_id,article_id" }
        );

      if (error) {
        setDatabaseError("Ajout de l'article echoue dans Supabase.");
        return { ok: false, message: "Ajout impossible dans Supabase." };
      }
    }

    setCustomArticles((current) => [...current, article].sort((a, b) => a.name.localeCompare(b.name, "fr")));
    setArticlePrices((current) => ({
      ...current,
      [DEFAULT_PRICE_OPTION_ID]: {
        ...getOptionPrices(current, DEFAULT_PRICE_OPTION_ID),
        [article.id]: article.price
      }
    }));
    setDatabaseError("");
    return { ok: true };
  }

  function updateArticlePrice(articleId, value, priceOptionId = DEFAULT_PRICE_OPTION_ID) {
    const nextPrice = Number(value.replace(/\D/g, ""));
    const safePrice = Number.isNaN(nextPrice) ? 0 : nextPrice;
    setArticlePrices((current) => ({
      ...current,
      [priceOptionId]: {
        ...getOptionPrices(current, priceOptionId),
        [articleId]: safePrice
      }
    }));
    saveArticlePrice(articleId, safePrice, priceOptionId);
  }

  async function saveFanicoBundlePrice(bundleId, quantity, price) {
    if (!isSupabaseConfigured || !currentPressingId) {
      return true;
    }

    const { error } = await supabase
      .from("article_prices")
      .upsert(
        {
          pressing_id: currentPressingId,
          article_id: getPriceRowId(FANICO_PRICE_OPTION_ID, bundleId),
          article_name: `${quantity} vetements`,
          price,
          updated_at: new Date().toISOString()
        },
        { onConflict: "pressing_id,article_id" }
      );

    if (error) {
      setDatabaseError("Sauvegarde du tarif Fanico echouee dans Supabase.");
      return false;
    }

    setDatabaseError("");
    return true;
  }

  async function upsertFanicoBundle(event) {
    event.preventDefault();

    const quantityValue = Number(fanicoQuantity.replace(/\D/g, ""));
    const priceValue = Number(fanicoPrice.replace(/\D/g, ""));

    if (!quantityValue || !priceValue) {
      setDatabaseError("Saisissez une quantite et un prix Fanico valides.");
      return;
    }

    const bundleId = getFanicoBundleId(quantityValue);
    const saved = await saveFanicoBundlePrice(bundleId, quantityValue, priceValue);

    if (!saved) {
      return;
    }

    setArticlePrices((current) => ({
      ...current,
      [FANICO_PRICE_OPTION_ID]: {
        ...getOptionPrices(current, FANICO_PRICE_OPTION_ID),
        [bundleId]: priceValue
      }
    }));
    setFanicoQuantity("");
    setFanicoPrice("");
  }

  async function deleteFanicoBundle(bundleId) {
    setArticlePrices((current) => {
      const nextFanicoPrices = { ...getOptionPrices(current, FANICO_PRICE_OPTION_ID) };
      delete nextFanicoPrices[bundleId];

      return {
        ...current,
        [FANICO_PRICE_OPTION_ID]: nextFanicoPrices
      };
    });

    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    const { error } = await supabase
      .from("article_prices")
      .delete()
      .eq("pressing_id", currentPressingId)
      .eq("article_id", getPriceRowId(FANICO_PRICE_OPTION_ID, bundleId));

    if (error) {
      setDatabaseError("Suppression du tarif Fanico echouee dans Supabase.");
      return;
    }

    setDatabaseError("");
  }

  async function resetArticlePrices(priceOptionId = DEFAULT_PRICE_OPTION_ID) {
    setArticlePrices((current) => ({
      ...current,
      [priceOptionId]:
        priceOptionId === DEFAULT_PRICE_OPTION_ID
          ? customArticles.reduce((prices, article) => {
        prices[article.id] = article.price;
        return prices;
      }, {})
          : {}
    }));

    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    if (priceOptionId === FANICO_PRICE_OPTION_ID) {
      const { error } = await supabase
        .from("article_prices")
        .delete()
        .eq("pressing_id", currentPressingId)
        .like("article_id", `${FANICO_PRICE_OPTION_ID}${PRICE_OPTION_SEPARATOR}%`);

      if (error) {
        setDatabaseError("Reinitialisation des prix Supabase echouee.");
        return;
      }

      setDatabaseError("");
      return;
    }

    const articleIds =
      priceOptionId === DEFAULT_PRICE_OPTION_ID
        ? MOCK_ARTICLES.map((article) => article.id)
        : pricedArticles.map((article) => getPriceRowId(priceOptionId, article.id));

    const { error } = await supabase
      .from("article_prices")
      .delete()
      .eq("pressing_id", currentPressingId)
      .in("article_id", articleIds);

    if (error) {
      setDatabaseError("Reinitialisation des prix Supabase echouee.");
      return;
    }

    setDatabaseError("");
  }

  function updateQuantity(nextQuantity) {
    setQuantity(nextQuantity);
    setDetailItems((current) =>
      Array.from({ length: nextQuantity }, (_, index) => current[index] || { ...EMPTY_DETAILS })
    );
  }

  function updateDetailAt(index, field, value) {
    setDetailItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function toggleReserve(reserve) {
    setSelectedReserves((current) => {
      if (reserve === "RAS") {
        return current.includes("RAS") ? [] : ["RAS"];
      }

      const withoutRas = current.filter((item) => item !== "RAS");
      return withoutRas.includes(reserve)
        ? withoutRas.filter((item) => item !== reserve)
        : [...withoutRas, reserve];
    });
  }

  function addArticles() {
    const selectedOption = selectedArticlePriceOptions.find(
      (option) => option.id === selectedWashOption
    );
    const selectedPrice = selectedOption?.price ?? selectedArticle.price;

    const itemsToAdd = detailItems.map((details, index) => ({
      lineId: crypto.randomUUID(),
      ...selectedArticle,
      price: selectedPrice,
      washOptionId: selectedWashOption,
      washOptionLabel: getPriceOptionLabel(selectedWashOption),
      copyNumber: index + 1,
      copyTotal: quantity,
      reserves: selectedReserves,
      reserve: selectedReserves.join(" + "),
      details: {
        ...details,
        brand: details.brand.trim() || "Non precise",
        note: details.note.trim()
      }
    }));

    setTicketItems((current) => [...current, ...itemsToAdd]);
    setSelectedArticle(null);
    resetArticleModal();
    setValidatedOrder(null);
  }

  function addFanicoBundleToTicket(row) {
    setTicketItems((current) => [
      ...current,
      {
        lineId: crypto.randomUUID(),
        id: `${FANICO_PRICE_OPTION_ID}-${row.id}`,
        name: `Fanico ${row.quantity} vetement${row.quantity > 1 ? "s" : ""}`,
        icon: "FA",
        price: row.price,
        washOptionId: FANICO_PRICE_OPTION_ID,
        washOptionLabel: "Fanico",
        copyNumber: 1,
        copyTotal: 1,
        reserves: ["Lot Fanico"],
        reserve: `${row.quantity} vetement${row.quantity > 1 ? "s" : ""}`,
        details: {
          ...EMPTY_DETAILS,
          brand: "Non precise",
          note: `Lot Fanico: ${row.quantity} vetement${row.quantity > 1 ? "s" : ""}`
        }
      }
    ]);
    setValidatedOrder(null);
  }

  function closeModal() {
    setSelectedArticle(null);
    resetArticleModal();
  }

  function removeItem(lineId) {
    setTicketItems((current) => current.filter((item) => item.lineId !== lineId));
    setValidatedOrder(null);
  }

  function tapKey(key) {
    setValidatedOrder(null);

    if (key === "Effacer") {
      setPhone("");
      return;
    }

    if (key === "Retour") {
      setPhone((current) => current.slice(0, -1));
      return;
    }

    setPhone((current) => (current.length < 14 ? current + key : current));
  }

  async function getNextTicketNumber() {
    if (!isSupabaseConfigured) {
      return createTicketNumber(orderHistory);
    }

    const { data, error } = await supabase.rpc("next_ticket_number");
    if (error) {
      throw error;
    }

    const existingTicketNumbers = new Set(orderHistory.map((order) => order.ticketNumber));
    let candidate = data;

    while (existingTicketNumbers.has(candidate)) {
      candidate = "#A-" + (getTicketNumberValue(candidate) + 1);
    }

    return candidate;
  }

  async function validateDeposit() {
    if (!canValidate) return;

    if (isSupabaseConfigured && !currentPressingId) {
      setDatabaseError("Aucun pressing n'est associe a ce compte.");
      return;
    }

    setDatabaseError("");

    let ticketNumber;
    try {
      ticketNumber = await getNextTicketNumber();
    } catch {
      setDatabaseError("Numero Supabase impossible. Ticket local genere.");
      ticketNumber = createTicketNumber(orderHistory);
    }

    const readyDate = getReadyDate();
    const createdAt = new Date().toISOString();
    const whatsappPhone = normalizeWhatsAppPhone(phone);
    const message = buildWhatsAppMessage({
      ticketNumber,
      readyDate,
      total,
      items: ticketItems
    });
    const order = {
      id: crypto.randomUUID(),
      pressingId: currentPressingId,
      ticketNumber,
      status: "IN_PROCESSING",
      createdAt,
      clientPhone: phone,
      whatsappPhone,
      total,
      itemCount: ticketItems.length,
      items: ticketItems,
      readyDate,
      whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`,
      message
    };

    setValidatedOrder(order);
    setOrderHistory((current) => [order, ...current]);

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.from("tickets").insert(toDatabaseTicket(order));

    if (error) {
      setDatabaseError("Sauvegarde Supabase echouee. Ticket conserve en local.");
      return;
    }

    setDatabaseError("");
  }

  async function markTicketPickedUp(orderId) {
    const pickedUpAt = new Date().toISOString();

    setDatabaseError("");
    setOrderHistory((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "PICKED_UP", pickedUpAt } : order
      )
    );

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "PICKED_UP", picked_up_at: pickedUpAt })
      .eq("pressing_id", currentPressingId)
      .eq("id", orderId);

    if (error) {
      setDatabaseError("Mise a jour du statut echouee dans Supabase.");
      setOrderHistory((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: "IN_PROCESSING", pickedUpAt: null } : order
        )
      );
    }
  }

  async function deleteTicket(orderId) {
    const orderToDelete = orderHistory.find((order) => order.id === orderId);

    if (!orderToDelete) {
      return;
    }

    const canDelete = window.confirm(
      `Supprimer le ticket ${orderToDelete.ticketNumber} de l'historique ?`
    );

    if (!canDelete) {
      return;
    }

    setDatabaseError("");
    setOrderHistory((current) => current.filter((order) => order.id !== orderId));
    setSelectedPickupOrder((current) => (current && current.id === orderId ? null : current));
    setValidatedOrder((current) => (current && current.id === orderId ? null : current));

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("pressing_id", currentPressingId)
      .eq("id", orderId);

    if (error) {
      setDatabaseError("Suppression Supabase echouee. Ticket restaure en local.");
      setOrderHistory((current) =>
        [orderToDelete, ...current].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    }
  }

  async function validatePickup(orderId) {
    await markTicketPickedUp(orderId);
    setSelectedPickupOrder((current) =>
      current && current.id === orderId
        ? {
            ...current,
            status: "PICKED_UP",
            pickedUpAt: current.pickedUpAt || new Date().toISOString()
          }
        : current
    );
  }

  async function logoutAdmin() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }

    setAdminSession(null);
    setOrderHistory([]);
    setValidatedOrder(null);
    setSelectedPickupOrder(null);
    setSelectedReportOrder(null);
    setPlatformPressings([]);
    setPlatformUsers([]);
    setPlatformInvoices([]);
    setPlatformAnnouncements([]);
    setPlatformSupportTickets([]);
    setPressingAnnouncements([]);
    setPressingSupportTickets([]);
    setClientProfile(null);
    setClientRequests([]);
    setPressingClientRequests([]);
  }

  if (authLoading) {
    return (
      <main className="login-shell">
        <section className="login-panel" aria-label="Verification de session">
          <p className="eyebrow">PressingTrack</p>
          <h1>Verification</h1>
          <p className="login-copy">Controle de la session en cours.</p>
        </section>
      </main>
    );
  }

  if (!adminSession) {
    return (
      <LoginPage
        clientInvitePressingId={clientInvitePressingId}
        clientInvitePressingName={clientInvitePressingName}
        onLogin={setAdminSession}
      />
    );
  }

  if (isClient) {
    return (
      <ClientPortal
        clientArticlePrices={clientArticlePrices}
        clientProfile={clientProfile}
        clientRequests={clientRequests}
        onCreateClientRequest={createClientServiceRequest}
        onLogout={logoutAdmin}
        pressingName={getSessionPressingName(adminSession) || clientInvitePressingName}
      />
    );
  }

  if (isPlatformAdmin) {
    return (
      <PlatformDashboard
        databaseError={databaseError}
        historyLoading={historyLoading}
        onCreatePressing={createPlatformPressing}
        onCreatePlatformAnnouncement={createPlatformAnnouncement}
        onLogout={logoutAdmin}
        onUpdateInvoiceStatus={updateInvoiceStatus}
        onUpdatePressingSubscription={updatePressingSubscription}
        onUpdateSupportTicketStatus={updateSupportTicketStatus}
        orderHistory={orderHistory}
        platformAnnouncements={platformAnnouncements}
        platformInvoices={platformInvoices}
        platformLoading={platformLoading}
        platformPressings={platformPressings}
        platformSupportTickets={platformSupportTickets}
        platformUsers={platformUsers}
        pressingName="Super Admin"
        role={currentRole}
        selectedOrder={selectedReportOrder}
        setSelectedOrder={setSelectedReportOrder}
        userEmail={adminSession.user.email}
      />
    );
  }

  if (!isAdmin) {
    return (
      <SupervisorDashboard
        databaseError={databaseError}
        historyLoading={historyLoading}
        onCreateSupportTicket={createSupportTicket}
        onLogout={logoutAdmin}
        orderHistory={orderHistory}
        pressingAnnouncements={pressingAnnouncements}
        pressingId={currentPressingId}
        pressingName={currentPressingName}
        pressingSupportTickets={pressingSupportTickets}
        role={currentRole}
        selectedOrder={selectedReportOrder}
        setSelectedOrder={setSelectedReportOrder}
        userEmail={adminSession.user.email}
      />
    );
  }

  if (activeAdminView !== "deposit") {
    return (
      <AppShell
        activeView={activeAdminView}
        menuItems={ADMIN_MENU}
        onLogout={logoutAdmin}
        onSelectView={setActiveAdminView}
        pressingName={currentPressingName}
        role={currentRole}
      >
        {databaseError && <div className="database-error">{databaseError}</div>}

        {activeAdminView === "dashboard" && (
          <div className="workspace-stack">
            <ReportStatsGrid orderHistory={orderHistory} />
            <DashboardCharts orderHistory={orderHistory} />
            <TicketsReport
              historyLoading={historyLoading}
              onSelectOrder={setSelectedReportOrder}
              orderHistory={orderHistory.slice(0, 8)}
              title="Derniers tickets"
            />
          </div>
        )}

        {activeAdminView === "pickups" && (
          <section className="report-section" aria-label="Retraits">
            <div className="section-heading">
              <div>
                <h2>Retraits</h2>
                <p>Recherche et validation des tickets a retirer.</p>
              </div>
            </div>

            <label className="pickup-label" htmlFor="workspace-pickup-ticket">
              Numero du ticket
            </label>
            <input
              id="workspace-pickup-ticket"
              className="pickup-input"
              value={pickupQuery}
              onChange={(event) => setPickupQuery(event.target.value)}
              placeholder="Ex: A-104"
            />

            <div className="pickup-results">
              {pickupQuery.trim().length < 2 ? (
                <div className="empty-history">Saisissez au moins 2 caracteres du ticket.</div>
              ) : pickupMatches.length === 0 ? (
                <div className="empty-history">Aucun ticket trouve.</div>
              ) : (
                pickupMatches.map((order) => (
                  <article className="history-item" key={order.id}>
                    <div>
                      <strong>{order.ticketNumber}</strong>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                    <p>
                      {order.itemCount} article{order.itemCount > 1 ? "s" : ""} - {order.clientPhone}
                    </p>
                    <footer>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <strong>{formatMoney(order.total)}</strong>
                    </footer>
                    <div className="history-actions">
                      <button
                        className="picked-up-button"
                        type="button"
                        disabled={order.status === "PICKED_UP"}
                        onClick={() => validatePickup(order.id)}
                      >
                        Valider le retrait
                      </button>
                      <button
                        className="back-button compact-button"
                        type="button"
                        onClick={() => setSelectedReportOrder(order)}
                      >
                        Voir detail
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeAdminView === "tickets" && (
          <TicketsReport
            historyLoading={historyLoading}
            onSelectOrder={setSelectedReportOrder}
            orderHistory={orderHistory}
            title="Tickets"
          />
        )}

        {activeAdminView === "clientRequests" && (
          <ClientRequestsView
            clientRequests={pressingClientRequests}
            onUpdateClientRequestStatus={updateClientRequestStatus}
          />
        )}

        {activeAdminView === "stock" && <StockView orderHistory={orderHistory} />}

        {activeAdminView === "clients" && <ClientsReport orderHistory={orderHistory} />}

        {activeAdminView === "addArticle" && (
          <AddArticleView articles={pricedArticles} onAddArticle={addCustomArticle} />
        )}

        {activeAdminView === "prices" && (
          <section className="report-section" aria-label="Prix">
            <div className="section-heading">
              <div>
                <h2>Prix</h2>
                <p>Grilles tarifaires par type de lavage.</p>
              </div>
              <button
                className="price-editor-toggle"
                type="button"
                onClick={() => resetArticlePrices(activePriceOption)}
              >
                {activePriceOption === FANICO_PRICE_OPTION_ID ? "Vider Fanico" : "Prix par defaut"}
              </button>
            </div>

            <div className="price-service-tabs" role="tablist" aria-label="Type de lavage">
              {PRICE_OPTIONS.map((option) => (
                <button
                  className={
                    activePriceOption === option.id
                      ? "price-service-tab active"
                      : "price-service-tab"
                  }
                  key={option.id}
                  type="button"
                  onClick={() => setActivePriceOption(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {activePriceOption === FANICO_PRICE_OPTION_ID ? (
              <div className="fanico-pricing-panel">
                <div className="fanico-pricing-note">
                  Ajoutez autant de cas que necessaire: 5, 10, 15, 20 vetements ou plus.
                </div>

                <form className="fanico-price-form" onSubmit={upsertFanicoBundle}>
                  <label htmlFor="fanico-quantity">
                    Nombre de vetements
                    <input
                      id="fanico-quantity"
                      inputMode="numeric"
                      value={fanicoQuantity}
                      onChange={(event) => setFanicoQuantity(event.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 5"
                    />
                  </label>

                  <label htmlFor="fanico-price">
                    Prix du lot
                    <input
                      id="fanico-price"
                      inputMode="numeric"
                      value={fanicoPrice}
                      onChange={(event) => setFanicoPrice(event.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 2500"
                    />
                  </label>

                  <button type="submit">Ajouter / modifier ce cas</button>
                </form>

                <div className="fanico-quantity-presets" aria-label="Quantites rapides Fanico">
                  {FANICO_QUANTITY_PRESETS.map((preset) => (
                    <button
                      className={fanicoQuantity === String(preset) ? "selected" : ""}
                      key={preset}
                      type="button"
                      onClick={() => setFanicoQuantity(String(preset))}
                    >
                      {preset} vetements
                    </button>
                  ))}
                </div>

                <div className="fanico-price-list">
                  {fanicoRows.length === 0 ? (
                    <div className="empty-history">Aucun tarif Fanico defini.</div>
                  ) : (
                    fanicoRows.map((row) => (
                      <article className="fanico-price-item" key={row.id}>
                        <div>
                          <strong>
                            {row.quantity} vetement{row.quantity > 1 ? "s" : ""}
                          </strong>
                          <small>{formatMoney(row.price)}</small>
                        </div>
                        <button type="button" onClick={() => deleteFanicoBundle(row.id)}>
                          Supprimer
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="price-editor-grid">
                {activePricedArticles.map((article) => (
                  <label className="price-field" key={article.id}>
                    <span>
                      <strong>{article.name}</strong>
                      <small>{article.icon}</small>
                    </span>
                    <input
                      inputMode="numeric"
                      value={article.price}
                      onChange={(event) =>
                        updateArticlePrice(article.id, event.target.value, activePriceOption)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

        {activeAdminView === "settings" && (
          <SettingsView
            clientPortalLink={
              currentPressingId ? getClientPortalLink(currentPressingId, currentPressingName) : ""
            }
            onCreateSupportTicket={createSupportTicket}
            pressingAnnouncements={pressingAnnouncements}
            pressingName={currentPressingName}
            pressingSupportTickets={pressingSupportTickets}
            role={currentRole}
            userEmail={adminSession.user.email}
          />
        )}

        <TicketReadModal order={selectedReportOrder} onClose={() => setSelectedReportOrder(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell
      activeView={activeAdminView}
      menuItems={ADMIN_MENU}
      onLogout={logoutAdmin}
      onSelectView={setActiveAdminView}
      pressingName={currentPressingName}
      role={currentRole}
    >
    <div className="pos-shell">
      <section className="selection-panel" aria-label="Selection des articles">
        <div className="selection-header">
          <div className="brand-row">
            <div>
              <p className="eyebrow">{currentPressingName}</p>
              <h1>Depot client</h1>
            </div>
            <div className="operator-actions">
              <div className="operator-badge">{ROLE_LABELS[currentRole] || "Admin"}</div>
              <button className="logout-button" type="button" onClick={logoutAdmin}>
                Deconnexion
              </button>
            </div>
          </div>

          <div className="section-heading">
            <div>
              <h2>Articles</h2>
              <p>Selection tactile rapide, details au clic.</p>
            </div>
            <button
              className="price-editor-toggle"
              type="button"
              onClick={() => setIsPriceEditorOpen((current) => !current)}
            >
              Modifier les prix
            </button>
          </div>

          {isPriceEditorOpen && (
            <div className="price-editor">
              <div className="price-editor-header">
                <strong>Prix de lavage</strong>
                <button type="button" onClick={resetArticlePrices}>
                  Prix par defaut
                </button>
              </div>
              <div className="price-editor-grid">
                {pricedArticles.map((article) => (
                  <label className="price-field" key={article.id}>
                    <span>
                      <strong>{article.name}</strong>
                      <small>{article.icon}</small>
                    </span>
                    <input
                      inputMode="numeric"
                      value={article.price}
                      onChange={(event) => updateArticlePrice(article.id, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="article-scroll" aria-label="Liste des articles disponibles">
          <div className="article-grid">
            {pricedArticles.map((article) => (
              <button
                className="article-button"
                key={article.id}
                type="button"
                onClick={() => openArticle(article)}
              >
                <span className="article-icon" aria-hidden="true">
                  {article.icon}
                </span>
                <span className="article-name">{article.name}</span>
                <strong>{formatMoney(article.price)}</strong>
              </button>
            ))}
          </div>

          <section className="deposit-fanico-section" aria-label="Fanico">
            <div className="deposit-fanico-heading">
              <div>
                <h2>Fanico</h2>
                <p>Selectionnez le tarif correspondant au nombre de vetements.</p>
              </div>
            </div>

            {fanicoRows.length === 0 ? (
              <div className="empty-history">
                Ajoutez plusieurs cas dans Prix &gt; Fanico: 5, 10, 15 vetements ou plus.
              </div>
            ) : (
              <div className="deposit-fanico-grid">
                {fanicoRows.map((row) => (
                  <button
                    className="deposit-fanico-button"
                    key={row.id}
                    type="button"
                    onClick={() => addFanicoBundleToTicket(row)}
                  >
                    <span>
                      {row.quantity} vetement{row.quantity > 1 ? "s" : ""}
                    </span>
                    <strong>{formatMoney(row.price)}</strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <aside className="ticket-panel" aria-label="Ticket en cours">
        <div className="ticket-top">
          <div>
            <p className="eyebrow">Ticket en cours</p>
            <h2>
              {ticketItems.length} article{ticketItems.length > 1 ? "s" : ""}
            </h2>
          </div>
          <button
            className="clear-button"
            type="button"
            onClick={() => {
              setTicketItems([]);
              setValidatedOrder(null);
            }}
          >
            Vider
          </button>
        </div>

        <div className="ticket-list">
          {ticketItems.length === 0 ? (
            <div className="empty-ticket">Touchez un article a gauche pour demarrer.</div>
          ) : (
            ticketItems.map((item) => (
              <div className="ticket-line" key={item.lineId}>
                <div className="line-main">
                  <span className="mini-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <strong>
                      {item.name}
                      {item.copyTotal > 1 ? ` ${item.copyNumber}/${item.copyTotal}` : ""}
                    </strong>
                    {item.washOptionLabel && <p>{item.washOptionLabel}</p>}
                    <p>{item.reserve}</p>
                    <small>
                      {item.details.color} - {item.details.fabric} - {item.details.pattern} -{" "}
                      {item.details.design}
                      {item.details.brand !== "Non precise" ? ` - ${item.details.brand}` : ""}
                    </small>
                    {item.details.note && <small>{item.details.note}</small>}
                  </div>
                </div>
                <div className="line-actions">
                  <strong>{formatMoney(item.price)}</strong>
                  <button type="button" onClick={() => removeItem(item.lineId)}>
                    Retirer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="total-row">
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>

        <label className="phone-label" htmlFor="client-phone">
          Telephone du client
        </label>
        <input
          id="client-phone"
          className="phone-display"
          inputMode="numeric"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value.replace(/\D/g, "").slice(0, 14));
            setValidatedOrder(null);
          }}
          placeholder="Ex: 0700000000"
        />

        <div className="keypad" aria-label="Pave numerique tactile">
          {KEYPAD.map((key) => (
            <button
              className={key === "Effacer" || key === "Retour" ? "key utility-key" : "key"}
              key={key}
              type="button"
              onClick={() => tapKey(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          className="validate-button"
          type="button"
          disabled={!canValidate}
          onClick={validateDeposit}
        >
          VALIDER LE DEPOT ET EMETTRE LE TICKET
        </button>

        {validatedOrder && (
          <div className="confirmation">
            <div>
              <strong>{validatedOrder.ticketNumber}</strong>
              <span>{getStatusLabel(validatedOrder.status)}</span>
            </div>
            <p>{validatedOrder.message}</p>
            <a href={validatedOrder.whatsappUrl} target="_blank" rel="noreferrer">
              Ouvrir WhatsApp
            </a>
          </div>
        )}

        <section className="pickup-panel" aria-label="Verification retrait client">
          <div>
            <p className="eyebrow">Retrait client</p>
            <h2>Verifier un ticket</h2>
          </div>

          <label className="pickup-label" htmlFor="pickup-ticket">
            Numero du ticket
          </label>
          <input
            id="pickup-ticket"
            className="pickup-input"
            value={pickupQuery}
            onChange={(event) => setPickupQuery(event.target.value)}
            placeholder="Ex: A-104"
          />

          <div className="pickup-results">
            {pickupQuery.trim().length < 2 ? (
              <div className="empty-history">Saisissez au moins 2 caracteres du ticket.</div>
            ) : pickupMatches.length === 0 ? (
              <div className="empty-history">Aucun ticket trouve.</div>
            ) : (
              pickupMatches.map((order) => (
                <button
                  className="pickup-result"
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedPickupOrder(order)}
                >
                  <span>
                    <strong>{order.ticketNumber}</strong>
                    <small>{formatDateTime(order.createdAt)}</small>
                  </span>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="history-panel" aria-label="Tickets stockes">
          <div className="history-header">
            <div>
              <p className="eyebrow">Tickets stockes</p>
              <h2>Historique</h2>
            </div>
            <strong>{visibleHistory.length}</strong>
          </div>

          {databaseError && <div className="database-error">{databaseError}</div>}

          <div className="period-tabs" role="tablist" aria-label="Periode historique">
            {HISTORY_PERIODS.map((period) => (
              <button
                className={historyPeriod === period.id ? "period-tab active" : "period-tab"}
                key={period.id}
                type="button"
                onClick={() => setHistoryPeriod(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="history-list">
            {historyLoading ? (
              <div className="empty-history">Chargement des tickets...</div>
            ) : visibleHistory.length === 0 ? (
              <div className="empty-history">Aucun ticket valide sur cette periode.</div>
            ) : (
              visibleHistory.map((order) => (
                <article className="history-item" key={order.id}>
                  <div>
                    <strong>{order.ticketNumber}</strong>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  <p>
                    {order.itemCount} article{order.itemCount > 1 ? "s" : ""} - {order.clientPhone}
                  </p>
                  <footer>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <strong>{formatMoney(order.total)}</strong>
                  </footer>
                  <div
                    className={
                      order.status === "IN_PROCESSING"
                        ? "history-actions"
                        : "history-actions single"
                    }
                  >
                    {order.status === "IN_PROCESSING" && (
                      <button
                        className="picked-up-button"
                        type="button"
                        onClick={() => markTicketPickedUp(order.id)}
                      >
                        Marquer comme retire
                      </button>
                    )}
                    <button
                      className="delete-ticket-button"
                      type="button"
                      onClick={() => deleteTicket(order.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </aside>

      {selectedArticle && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="reserve-modal">
            <div className="modal-title-row">
              <div>
                <p className="eyebrow">
                  {isDetailsStep ? "Quantite et details" : "Reserve / tache"}
                </p>
                <h2>
                  <span className="title-icon">{selectedArticle.icon}</span> {selectedArticle.name}
                </h2>
              </div>
              <button type="button" onClick={closeModal}>
                Fermer
              </button>
            </div>

            {!isDetailsStep ? (
              <div className="reserve-step">
                <div className="wash-option-group">
                  <p>Type de lavage</p>
                  <div className="wash-option-grid">
                    {selectedArticlePriceOptions.map((option) => (
                      <button
                        className={
                          selectedWashOption === option.id
                            ? "wash-option-button selected"
                            : "wash-option-button"
                        }
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedWashOption(option.id)}
                      >
                        <span>{option.label}</span>
                        <strong>{formatMoney(option.price)}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reserve-grid">
                  {MOCK_RESERVES.map((reserve) => {
                    const isSelected = selectedReserves.includes(reserve);
                    const reserveClassNames = [
                      "reserve-button",
                      reserve === "RAS" ? "ras-button" : "",
                      isSelected ? "selected" : ""
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        className={reserveClassNames}
                        key={reserve}
                        type="button"
                        onClick={() => toggleReserve(reserve)}
                      >
                        <span>{isSelected ? "Selectionne" : "Choisir"}</span>
                        {reserve}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="continue-button"
                  type="button"
                  disabled={selectedReserves.length === 0}
                  onClick={() => setIsDetailsStep(true)}
                >
                  Continuer avec {selectedReserves.length} reserve
                  {selectedReserves.length > 1 ? "s" : ""}
                </button>
              </div>
            ) : (
              <div className="details-form">
                <div className="selected-reserve">
                  Reserves: <strong>{selectedReserves.join(" + ")}</strong>
                </div>

                <div className="selected-reserve">
                  Lavage: <strong>{getPriceOptionLabel(selectedWashOption)}</strong> -{" "}
                  <strong>
                    {formatMoney(
                      selectedArticlePriceOptions.find((option) => option.id === selectedWashOption)
                        ?.price ?? selectedArticle.price
                    )}
                  </strong>
                </div>

                <div className="quantity-group">
                  <p>Nombre d'articles identiques</p>
                  <div className="quantity-grid">
                    {QUANTITY_OPTIONS.map((option) => (
                      <button
                        className={quantity === option ? "quantity-button selected" : "quantity-button"}
                        key={option}
                        type="button"
                        onClick={() => updateQuantity(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detail-cards">
                  {detailItems.map((itemDetails, index) => (
                    <div className="detail-card" key={index}>
                      <div className="detail-card-title">
                        <span>{selectedArticle.icon}</span>
                        <strong>
                          {selectedArticle.name} {index + 1}
                        </strong>
                      </div>

                      <DetailPills
                        label="Design"
                        value={itemDetails.design}
                        options={DETAIL_OPTIONS.designs}
                        onChange={(value) => updateDetailAt(index, "design", value)}
                      />

                      <DetailPills
                        label="Couleur"
                        value={itemDetails.color}
                        options={DETAIL_OPTIONS.colors}
                        onChange={(value) => updateDetailAt(index, "color", value)}
                      />

                      <DetailPills
                        label="Motifs"
                        value={itemDetails.pattern}
                        options={DETAIL_OPTIONS.patterns}
                        onChange={(value) => updateDetailAt(index, "pattern", value)}
                      />

                      <DetailPills
                        label="Qualite du tissu"
                        value={itemDetails.fabric}
                        options={DETAIL_OPTIONS.fabrics}
                        onChange={(value) => updateDetailAt(index, "fabric", value)}
                      />

                      <div className="text-fields">
                        <label>
                          Marque
                          <input
                            value={itemDetails.brand}
                            onChange={(event) => updateDetailAt(index, "brand", event.target.value)}
                            placeholder="Ex: Zara, Nike, Hugo Boss"
                          />
                        </label>
                        <label>
                          Note rapide
                          <input
                            value={itemDetails.note}
                            onChange={(event) => updateDetailAt(index, "note", event.target.value)}
                            placeholder="Ex: logo poitrine, boutons dores"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button className="back-button" type="button" onClick={() => setIsDetailsStep(false)}>
                    Retour reserves
                  </button>
                  <button className="add-button" type="button" onClick={addArticles}>
                    Ajouter {quantity} au ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPickupOrder && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="pickup-modal">
            <div className="modal-title-row">
              <div>
                <p className="eyebrow">Verification retrait</p>
                <h2>{selectedPickupOrder.ticketNumber}</h2>
              </div>
              <button type="button" onClick={() => setSelectedPickupOrder(null)}>
                Fermer
              </button>
            </div>

            <div className="pickup-summary">
              <div>
                <span>Statut</span>
                <strong>{getStatusLabel(selectedPickupOrder.status)}</strong>
              </div>
              <div>
                <span>Telephone</span>
                <strong>{selectedPickupOrder.clientPhone}</strong>
              </div>
              <div>
                <span>Depot</span>
                <strong>{formatDateTime(selectedPickupOrder.createdAt)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatMoney(selectedPickupOrder.total)}</strong>
              </div>
            </div>

            <div className="pickup-detail-list">
              {selectedPickupOrder.items.map((item, index) => (
                <article className="pickup-detail-item" key={item.lineId || index}>
                  <div>
                    <span className="mini-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <strong>
                      {item.copyTotal > 1
                        ? `${item.name} ${item.copyNumber}/${item.copyTotal}`
                        : item.name}
                    </strong>
                  </div>
                  {item.washOptionLabel && <p>{item.washOptionLabel}</p>}
                  <p>{item.reserve}</p>
                  <small>
                    {item.details.color} - {item.details.fabric} - {item.details.pattern} -{" "}
                    {item.details.design}
                    {item.details.brand !== "Non precise" ? ` - ${item.details.brand}` : ""}
                  </small>
                  {item.details.note && <small>{item.details.note}</small>}
                </article>
              ))}
            </div>

            <div className="modal-actions">
              <button className="back-button" type="button" onClick={() => setSelectedPickupOrder(null)}>
                Annuler
              </button>
              <button
                className="add-button"
                type="button"
                disabled={selectedPickupOrder.status === "PICKED_UP"}
                onClick={() => validatePickup(selectedPickupOrder.id)}
              >
                Valider le retrait
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
