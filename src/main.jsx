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
  try {
    return JSON.parse(localStorage.getItem("pressingtrack-ticket-history")) || [];
  } catch {
    return [];
  }
}

function getStoredArticlePrices() {
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
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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
    ticket_number: order.ticketNumber,
    status: order.status,
    created_at: order.createdAt,
    client_phone: order.clientPhone,
    total: order.total,
    item_count: order.itemCount,
    items: order.items,
    ready_date: order.readyDate,
    whatsapp_url: order.whatsappUrl,
    message: order.message
  };
}

function fromDatabaseTicket(row) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    status: row.status,
    createdAt: row.created_at,
    clientPhone: row.client_phone,
    total: row.total,
    itemCount: row.item_count,
    items: row.items || [],
    readyDate: row.ready_date,
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

function App() {
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
    localStorage.setItem("pressingtrack-ticket-history", JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem("pressingtrack-article-prices", JSON.stringify(articlePrices));
  }, [articlePrices]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHistoryLoading(false);
      return;
    }

    async function loadTickets() {
      setHistoryLoading(true);
      setDatabaseError("");

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setDatabaseError("Lecture Supabase impossible. Mode local conserve.");
        setHistoryLoading(false);
        return;
      }

      setOrderHistory(data.map(fromDatabaseTicket));
      setHistoryLoading(false);
    }

    loadTickets();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    async function loadArticlePrices() {
      const { data, error } = await supabase.from("article_prices").select("*");

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
  }, []);

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
    if (!isSupabaseConfigured) {
      return;
    }

    const article = MOCK_ARTICLES.find((item) => item.id === articleId);
    const { error } = await supabase.from("article_prices").upsert({
      article_id: articleId,
      article_name: article?.name || articleId,
      price,
      updated_at: new Date().toISOString()
    });

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

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.from("article_prices").delete().neq("article_id", "");

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
    setDatabaseError("");
    setOrderHistory((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "PICKED_UP" } : order
      )
    );

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "PICKED_UP" })
      .eq("id", orderId);

    if (error) {
      setDatabaseError("Mise a jour du statut echouee dans Supabase.");
      setOrderHistory((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: "IN_PROCESSING" } : order
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

    const { error } = await supabase.from("tickets").delete().eq("id", orderId);

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
      current && current.id === orderId ? { ...current, status: "PICKED_UP" } : current
    );
  }

  return (
    <main className="pos-shell">
      <section className="selection-panel" aria-label="Selection des articles">
        <div className="selection-header">
          <div className="brand-row">
            <div>
              <p className="eyebrow">PressingTrack</p>
              <h1>Depot client</h1>
            </div>
            <div className="operator-badge">Comptoir</div>
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

          <div className={isSupabaseConfigured ? "database-badge online" : "database-badge"}>
            {isSupabaseConfigured ? "Supabase connecte" : "Mode local: configurez Supabase"}
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
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
