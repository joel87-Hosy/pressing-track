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

const ROLE_LABELS = {
  admin: "Admin",
  supervisor: "Superviseur",
  platform_admin: "Plateforme"
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

function getSessionPressingId(session) {
  return session?.user.app_metadata?.pressing_id || null;
}

function getSessionPressingName(session) {
  return session?.user.app_metadata?.pressing_name || "PressingTrack";
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

function createTicketNumber() {
  return "#A-" + Math.floor(104 + Math.random() * 80);
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
    return {};
  }

  try {
    return JSON.parse(localStorage.getItem("pressingtrack-article-prices")) || {};
  } catch {
    return {};
  }
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
  { id: "pickups", label: "Retraits" },
  { id: "stock", label: "Stock" },
  { id: "tickets", label: "Tickets" },
  { id: "clients", label: "Clients" },
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
      lastPickup: null
    };

    current.tickets += 1;
    current.items += order.itemCount;
    current.total += order.total;
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

  return Array.from(clients.values()).sort(
    (a, b) => new Date(b.lastDeposit).getTime() - new Date(a.lastDeposit).getTime()
  );
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

function AppShell({ activeView, children, menuItems, onLogout, onSelectView, pressingName, role }) {
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar" aria-label="Menu principal">
        <div>
          <p className="eyebrow">{pressingName}</p>
          <h1>PressingTrack</h1>
        </div>

        <nav className="workspace-nav">
          {menuItems.map((item) => (
            <button
              className={activeView === item.id ? "workspace-nav-item active" : "workspace-nav-item"}
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
            >
              {item.label}
            </button>
          ))}
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

  return (
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
            <article className="client-item" key={client.phone}>
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
            </article>
          ))
        )}
      </div>
    </section>
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

function SettingsView({ pressingName, role }) {
  return (
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

function SupervisorDashboard({
  databaseError,
  historyLoading,
  onLogout,
  orderHistory,
  pressingName,
  role,
  selectedOrder,
  setSelectedOrder
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

      {activeView === "settings" && <SettingsView pressingName={pressingName} role={role} />}

      <TicketReadModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </AppShell>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const role = data.session.user.app_metadata?.role;
    const hasScope = Boolean(getSessionPressingId(data.session)) || isPlatformAdminRole(role);

    if (!canAccessDashboard(role) || !hasScope) {
      await supabase.auth.signOut();
      setError("Ce compte n'a pas le role admin/superviseur ou aucun pressing associe.");
      return;
    }

    onLogin(data.session);
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Connexion administrateur ou superviseur">
        <div>
          <p className="eyebrow">PressingTrack</p>
          <h1>Connexion</h1>
          <p className="login-copy">Acces reserve au comptoir, aux rapports et a l'historique.</p>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
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
            {isSubmitting ? "Connexion..." : "Se connecter"}
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
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);
  const [ticketItems, setTicketItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
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
  const [pickupQuery, setPickupQuery] = useState("");
  const [selectedPickupOrder, setSelectedPickupOrder] = useState(null);
  const [selectedReportOrder, setSelectedReportOrder] = useState(null);
  const [activeAdminView, setActiveAdminView] = useState("deposit");
  const currentRole = adminSession?.user.app_metadata?.role;
  const currentPressingId = getSessionPressingId(adminSession);
  const currentPressingName = getSessionPressingName(adminSession);
  const isAdmin = isAdminRole(currentRole);
  const isPlatformAdmin = isPlatformAdminRole(currentRole);
  const hasPressingScope = Boolean(currentPressingId) || isPlatformAdmin;

  const total = useMemo(
    () => ticketItems.reduce((sum, item) => sum + item.price, 0),
    [ticketItems]
  );
  const pricedArticles = useMemo(
    () =>
      MOCK_ARTICLES.map((article) => ({
        ...article,
        price: articlePrices[article.id] ?? article.price
      })),
    [articlePrices]
  );

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
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const role = session?.user.app_metadata?.role;
      const hasScope = Boolean(getSessionPressingId(session)) || isPlatformAdminRole(role);

      if (!isMounted) {
        return;
      }

      setAdminSession(canAccessDashboard(role) && hasScope ? session : null);
      setAuthLoading(false);
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user.app_metadata?.role;
      const hasScope = Boolean(getSessionPressingId(session)) || isPlatformAdminRole(role);
      setAdminSession(canAccessDashboard(role) && hasScope ? session : null);
      setAuthLoading(false);
    });

    loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminSession || !hasPressingScope) {
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
  }, [adminSession, currentPressingId, hasPressingScope]);

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

      const nextPrices = data.reduce(
        (prices, row) => ({
          ...prices,
          [row.article_id]: row.price
        }),
        {}
      );

      setArticlePrices(nextPrices);
    }

    loadArticlePrices();
  }, [adminSession, currentPressingId, isAdmin]);

  function resetArticleModal() {
    setSelectedReserves([]);
    setIsDetailsStep(false);
    setQuantity(1);
    setDetailItems(createDetailsList(1));
  }

  function openArticle(article) {
    setSelectedArticle(article);
    resetArticleModal();
  }

  async function saveArticlePrice(articleId, price) {
    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    const article = MOCK_ARTICLES.find((item) => item.id === articleId);
    const { error } = await supabase
      .from("article_prices")
      .upsert(
        {
          pressing_id: currentPressingId,
          article_id: articleId,
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

  function updateArticlePrice(articleId, value) {
    const nextPrice = Number(value.replace(/\D/g, ""));
    const safePrice = Number.isNaN(nextPrice) ? 0 : nextPrice;
    setArticlePrices((current) => ({
      ...current,
      [articleId]: safePrice
    }));
    saveArticlePrice(articleId, safePrice);
  }

  async function resetArticlePrices() {
    setArticlePrices({});

    if (!isSupabaseConfigured || !currentPressingId) {
      return;
    }

    const { error } = await supabase
      .from("article_prices")
      .delete()
      .eq("pressing_id", currentPressingId)
      .neq("article_id", "");

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
    const itemsToAdd = detailItems.map((details, index) => ({
      lineId: crypto.randomUUID(),
      ...selectedArticle,
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
      return createTicketNumber();
    }

    const { data, error } = await supabase.rpc("next_ticket_number");
    if (error) {
      throw error;
    }

    return data;
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
      ticketNumber = createTicketNumber();
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
    return <LoginPage onLogin={setAdminSession} />;
  }

  if (!isAdmin) {
    return (
      <SupervisorDashboard
        databaseError={databaseError}
        historyLoading={historyLoading}
        onLogout={logoutAdmin}
        orderHistory={orderHistory}
        pressingName={currentPressingName}
        role={currentRole}
        selectedOrder={selectedReportOrder}
        setSelectedOrder={setSelectedReportOrder}
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

        {activeAdminView === "stock" && <StockView orderHistory={orderHistory} />}

        {activeAdminView === "clients" && <ClientsReport orderHistory={orderHistory} />}

        {activeAdminView === "prices" && (
          <section className="report-section" aria-label="Prix">
            <div className="section-heading">
              <div>
                <h2>Prix</h2>
                <p>Prix personnalises pour ce pressing.</p>
              </div>
              <button className="price-editor-toggle" type="button" onClick={resetArticlePrices}>
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
          </section>
        )}

        {activeAdminView === "settings" && (
          <SettingsView pressingName={currentPressingName} role={currentRole} />
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
