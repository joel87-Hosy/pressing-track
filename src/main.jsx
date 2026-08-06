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
const LANGUAGE_STORAGE_KEY = "pressingtrack-language";
const PROFILE_AVATAR_BUCKET = "profile-avatars";
const PROFILE_AVATAR_MAX_SIZE = 2 * 1024 * 1024;
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

const CLIENT_REQUEST_CONFIRMATION_MESSAGES = {
  awaiting_deposit:
    "Bonjour, votre pressing a bien recu votre commande. Un coursier passera recuperer vos vetements afin que notre equipe puisse les verifier avant la confirmation du depot. Merci pour votre confiance.",
  deposit_confirmed:
    "Bonjour, votre depot a ete confirme apres verification par le pressing. Votre ticket sera genere et transmis dans les meilleurs delais via votre compte client ou par WhatsApp. Merci pour votre confiance."
};

const PICKUP_REMINDER_LEVELS = {
  ready: 1,
  overdue_1_day: 2,
  overdue_1_week: 3
};

const PICKUP_REMINDER_MESSAGES = {
  ready:
    "Bonjour, votre depot est pret pour le retrait. Vous pouvez passer le recuperer directement au pressing, ou commander un livreur depuis votre compte client. Merci pour votre confiance.",
  overdue_1_day:
    "Bonjour, nous vous rappelons que votre depot est pret depuis hier. Vous pouvez passer au pressing pour le recuperer ou commander un livreur depuis votre compte client. Merci de votre attention.",
  overdue_1_week:
    "Bonjour, votre depot est pret depuis plus d'une semaine. Nous vous invitons a le recuperer rapidement ou a commander un livreur depuis votre compte client. Passe ce delai, le pressing decline toute responsabilite en cas de perte ou de deterioration."
};

const ROLE_LABELS = {
  admin: "Admin",
  supervisor: "Superviseur",
  platform_admin: "Super Admin",
  client: "Client"
};

const ROLE_LABELS_BY_LANGUAGE = {
  fr: ROLE_LABELS,
  en: {
    admin: "Manager",
    supervisor: "Supervisor",
    platform_admin: "Super Admin",
    client: "Client"
  }
};

const LANGUAGE_OPTIONS = [
  { id: "fr", label: "FR" },
  { id: "en", label: "EN" }
];

const COOKIE_CONSENT_STORAGE_KEY = "pressingtrack-cookie-consent";

const LEGAL_PAGES = {
  privacy: {
    fr: {
      title: "Confidentialite",
      intro: "Cette page explique comment PressingTrack protege les informations des clients, gerants et pressings.",
      sections: [
        {
          title: "Donnees collectees",
          body: "Nous enregistrons les informations utiles au service: nom, telephone, email, pressing rattache, demandes client, tickets, articles, prix, statuts et messages de suivi."
        },
        {
          title: "Utilisation",
          body: "Ces donnees servent a gerer les depots, retraits, livraisons, notifications, historiques et rapports du pressing."
        },
        {
          title: "Protection",
          body: "Les acces sont limites selon le role du compte. Un client voit ses propres demandes. Un gerant voit les donnees de son pressing. Le super admin gere la plateforme."
        },
        {
          title: "Conservation",
          body: "Les donnees sont conservees aussi longtemps que necessaire pour le suivi du service, la preuve des tickets et les obligations de gestion."
        }
      ]
    },
    en: {
      title: "Privacy",
      intro: "This page explains how PressingTrack protects information from clients, managers, and pressings.",
      sections: [
        { title: "Collected data", body: "We store service data: name, phone, email, linked pressing, client requests, tickets, items, prices, statuses, and follow-up messages." },
        { title: "Use", body: "This data is used to manage deposits, pickups, deliveries, notifications, history, and pressing reports." },
        { title: "Protection", body: "Access is limited by account role. A client sees their own requests. A manager sees their pressing data. The super admin manages the platform." },
        { title: "Retention", body: "Data is kept as long as needed for service tracking, ticket proof, and management obligations." }
      ]
    }
  },
  terms: {
    fr: {
      title: "Politiques generales",
      intro: "Ces politiques fixent les regles d'utilisation de PressingTrack pour les pressings et leurs clients.",
      sections: [
        { title: "Responsabilites du pressing", body: "Le pressing doit verifier les vetements, renseigner des informations correctes et traiter les demandes client avec soin." },
        { title: "Responsabilites du client", body: "Le client doit fournir des informations exactes, verifier ses tickets et recuperer ses articles dans les delais annonces." },
        { title: "Tickets et retraits", body: "Le ticket sert de reference principale pour le suivi. Les rappels de retrait aident le client a recuperer son depot a temps." },
        { title: "Livraison", body: "Une demande de livreur depuis le compte client est transmise au gerant, qui organise ensuite le traitement selon ses conditions." }
      ]
    },
    en: {
      title: "General policies",
      intro: "These policies define how PressingTrack is used by pressings and their clients.",
      sections: [
        { title: "Pressing responsibilities", body: "The pressing must check clothes, enter correct information, and handle client requests carefully." },
        { title: "Client responsibilities", body: "The client must provide accurate information, check tickets, and collect items within the announced timeframe." },
        { title: "Tickets and pickups", body: "The ticket is the main tracking reference. Pickup reminders help the client collect their deposit on time." },
        { title: "Delivery", body: "A delivery request from the client account is sent to the manager, who handles it according to their conditions." }
      ]
    }
  },
  cookies: {
    fr: {
      title: "Cookies",
      intro: "PressingTrack utilise des cookies et donnees locales pour faire fonctionner l'application et ameliorer l'experience.",
      sections: [
        { title: "Cookies necessaires", body: "Ils permettent de garder la session, la langue choisie, les preferences et certaines donnees locales lorsque Supabase n'est pas configure." },
        { title: "Cookies de confort", body: "Ils memorisent des choix comme la langue ou le consentement pour eviter de redemander la meme chose." },
        { title: "Choix utilisateur", body: "Vous pouvez accepter, refuser ou personnaliser les cookies non essentiels depuis le pop-up cookies." }
      ]
    },
    en: {
      title: "Cookies",
      intro: "PressingTrack uses cookies and local data to run the app and improve the experience.",
      sections: [
        { title: "Required cookies", body: "They keep the session, chosen language, preferences, and some local data when Supabase is not configured." },
        { title: "Comfort cookies", body: "They remember choices such as language or consent so the app does not ask again every time." },
        { title: "User choice", body: "You can accept, reject, or customize non-essential cookies from the cookie pop-up." }
      ]
    }
  }
};

const LEGAL_LINK_LABELS = {
  fr: {
    privacy: "Confidentialite",
    terms: "Politiques generales",
    cookies: "Cookies"
  },
  en: {
    privacy: "Privacy",
    terms: "General policies",
    cookies: "Cookies"
  }
};

const TEXT_NODE_ORIGINALS = new WeakMap();
const ATTRIBUTE_ORIGINALS = new WeakMap();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label"];
const UI_TRANSLATIONS_EN = {
  "Langue / Language": "Language",
  "Choisir la langue": "Choose language",
  "Pages legales": "Legal pages",
  "Preferences cookies": "Cookie preferences",
  "Fermer": "Close",
  "Fermer le menu": "Close menu",
  "Menu principal": "Main menu",
  "Verification": "Checking",
  "Controle de la session en cours.": "Checking the current session.",
  "Connexion": "Login",
  "Espace client": "Client area",
  "Acces reserve au comptoir, aux rapports et a l'historique.": "Access reserved for counter operations, reports, and history.",
  "Creez votre compte pour envoyer une demande de lavage au pressing.": "Create your account to send a cleaning request to the pressing.",
  "Creer compte": "Create account",
  "Se connecter": "Log in",
  "Nom complet": "Full name",
  "Votre nom": "Your name",
  "Genre": "Gender",
  "Numero de telephone": "Phone number",
  "Mot de passe": "Password",
  "Patientez...": "Please wait...",
  "Creer mon compte": "Create my account",
  "Email ou mot de passe incorrect.": "Incorrect email or password.",
  "Saisissez votre nom et votre numero de telephone.": "Enter your name and phone number.",
  "Creation impossible. Verifiez l'email ou le mot de passe.": "Account creation failed. Check the email or password.",
  "Compte cree. Verifiez votre email puis reconnectez-vous.": "Account created. Check your email, then log in again.",
  "Tableau de bord": "Dashboard",
  "Compte rattache a": "Account linked to",
  "Tickets deposes": "Deposited tickets",
  "Tickets retires": "Picked up tickets",
  "En traitement": "Processing",
  "Clients": "Clients",
  "Total depots": "Total deposits",
  "Statuts tickets": "Ticket statuses",
  "Part des tickets retires et en traitement.": "Share of picked up and processing tickets.",
  "Depots sur 7 jours": "Deposits over 7 days",
  "Volume quotidien des tickets enregistres.": "Daily volume of recorded tickets.",
  "Alertes stock": "Stock alerts",
  "Articles prets ou depasses avant retrait.": "Items ready or overdue before pickup.",
  "Pret retrait": "Ready for pickup",
  "Depasse": "Overdue",
  "Top clients": "Top clients",
  "Clients classes par montant total depose.": "Clients ranked by total deposited amount.",
  "Aucune activite client a afficher.": "No client activity to display.",
  "Rapport des depots et dates de retrait.": "Report of deposits and pickup dates.",
  "Filtrer les tickets par periode": "Filter tickets by period",
  "Ticket": "Ticket",
  "Client": "Client",
  "Depot": "Deposit",
  "Retrait": "Pickup",
  "Statut": "Status",
  "Total": "Total",
  "Chargement des tickets...": "Loading tickets...",
  "Aucun ticket a afficher.": "No ticket to display.",
  "Liste des clients avec depots et retraits.": "Client list with deposits and pickups.",
  "Aucun client a afficher.": "No client to display.",
  "Voir detail": "View details",
  "Retraits": "Pickups",
  "Recherche et validation des tickets a retirer.": "Search and validate tickets to pick up.",
  "Numero du ticket": "Ticket number",
  "Saisissez au moins 2 caracteres du ticket.": "Enter at least 2 ticket characters.",
  "Aucun ticket trouve.": "No ticket found.",
  "Valider le retrait": "Validate pickup",
  "Prix": "Prices",
  "Grilles tarifaires par type de lavage.": "Price grids by cleaning type.",
  "Type de lavage": "Cleaning type",
  "Ajouter / modifier ce cas": "Add / edit this case",
  "Aucun tarif Fanico defini.": "No Fanico price set.",
  "Flux du pressing": "Pressing flow",
  "Journal des mouvements pour preparer le rapport au superviseur.": "Movement log to prepare the supervisor report.",
  "Suivi des depots, retraits, retards et recettes du pressing.": "Track deposits, pickups, delays, and pressing revenue.",
  "Point par periode": "Period summary",
  "Jour, semaine ou mois selon le rapport souhaite.": "Day, week, or month depending on the report needed.",
  "Periode du flux": "Flow period",
  "Telecharger Excel": "Download Excel",
  "Telecharger PDF": "Download PDF",
  "Periode": "Period",
  "Depasses": "Overdue",
  "Recette": "Revenue",
  "Chargement du flux...": "Loading flow...",
  "Aucun flux a afficher.": "No flow to display.",
  "Derniers mouvements": "Latest movements",
  "Prix de chaque depot et statut actuel.": "Price of each deposit and current status.",
  "Statut flux": "Flow status",
  "Prix depot": "Deposit price",
  "Aucun mouvement recent.": "No recent movement.",
  "Recettes du mois": "Monthly revenue",
  "Recettes totales": "Total revenue",
  "Ajouter un article": "Add item",
  "Creation d'un article absent de la liste actuelle.": "Create an item missing from the current list.",
  "Nom de l'article": "Item name",
  "Articles disponibles": "Available items",
  "Detail ticket": "Ticket details",
  "Pressing rattache": "Linked pressing",
  "Demandes totales": "Total requests",
  "En cours": "In progress",
  "Terminees": "Completed",
  "Derniere demande": "Latest request",
  "Total estime": "Estimated total",
  "Montant en cours": "Pending amount",
  "Graphiques client": "Client charts",
  "Activite sur 7 jours": "7-day activity",
  "Nombre de demandes envoyees par jour.": "Number of requests sent per day.",
  "Courbe des demandes client": "Client request chart",
  "Statuts": "Statuses",
  "Repartition de vos demandes.": "Breakdown of your requests.",
  "Aucune demande a analyser.": "No request to analyze.",
  "Derniere activite": "Latest activity",
  "Resume de la demande la plus recente.": "Summary of the most recent request.",
  "Aucune demande envoyee pour le moment.": "No request sent yet.",
  "Tarifs lavage": "Cleaning prices",
  "Choisissez le type de lavage avant de declarer vos vetements.": "Choose the cleaning type before declaring your clothes.",
  "Nouvelle demande": "New request",
  "Ramassage et livraison a domicile.": "Home pickup and delivery.",
  "Adresse de collecte": "Pickup address",
  "Adresse de livraison": "Delivery address",
  "Date souhaitee": "Preferred date",
  "Note": "Note",
  "Envoyer la demande": "Send request",
  "Envoi...": "Sending...",
  "Aucun vetement ajoute.": "No clothing item added.",
  "Mes demandes": "My requests",
  "Suivi des demandes envoyees au pressing.": "Track requests sent to the pressing.",
  "Aucune demande envoyee.": "No request sent.",
  "Confirmation du pressing": "Pressing confirmation",
  "Retrait disponible": "Pickup available",
  "Commander un livreur": "Order a courier",
  "Informations client": "Client information",
  "Coordonnees rattachees a votre compte.": "Contact details linked to your account.",
  "Nom": "Name",
  "Telephone": "Phone",
  "Demandes clients": "Client requests",
  "Demandes envoyees depuis le lien client du pressing.": "Requests sent from the pressing client link.",
  "Aucune demande client recue.": "No client request received.",
  "Confirmation envoyee": "Confirmation sent",
  "Demande de livraison": "Delivery request",
  "Accepter": "Accept",
  "Attente depot": "Awaiting deposit",
  "Depot confirme": "Deposit confirmed",
  "Refuser": "Reject",
  "Tableau": "Dashboard",
  "Rapports": "Reports",
  "Stock": "Stock",
  "Parametres": "Settings",
  "Ajouter article": "Add item",
  "Tickets": "Tickets",
  "Jour": "Day",
  "Semaine": "Week",
  "Mois": "Month",
  "Pressings actifs": "Active pressings",
  "Inactifs": "Inactive",
  "Tickets reseau": "Network tickets",
  "Expirent bientot": "Expiring soon",
  "Chiffre pressings": "Pressing revenue",
  "Factures dues": "Due invoices",
  "Utilisateurs par role": "Users by role",
  "Alertes": "Alerts",
  "Ajouter un pressing": "Add a pressing",
  "Pressings": "Pressings",
  "Abonnement": "Subscription",
  "Creation": "Created",
  "Comptes": "Accounts",
  "Dernier depot": "Last deposit",
  "Actions": "Actions",
  "Clients finaux": "End clients",
  "Clients inscrits": "Registered clients",
  "Actifs": "Active",
  "Suspendus": "Suspended",
  "Abonnes actifs": "Active subscribers",
  "Essais": "Trials",
  "Montant du": "Amount due",
  "Plans / Tarifs": "Plans / Prices",
  "Abonnements": "Subscriptions",
  "Mensuel": "Monthly",
  "Debut": "Start",
  "Action": "Action",
  "Factures": "Invoices",
  "Montant": "Amount",
  "Echeance": "Due date",
  "Rappels & Relances": "Reminders & Follow-ups",
  "Utilisateurs": "Users",
  "Role": "Role",
  "Creation compte": "Account created",
  "Derniere connexion": "Last login",
  "Assistance technique": "Technical support",
  "Taux d'utilisation": "Usage rate",
  "Rapports financiers": "Financial reports",
  "Annonces / Pop-ups": "Announcements / Pop-ups",
  "Audience": "Audience",
  "Message": "Message",
  "Publier": "Publish",
  "SMS & Emails systeme": "System SMS & emails",
  "Tickets de support": "Support tickets",
  "Sujet": "Subject",
  "Priorite": "Priority",
  "Date": "Date",
  "Roles & permissions": "Roles & permissions",
  "Modes de paiement": "Payment methods",
  "Informations plateforme": "Platform information",
  "Enregistrer": "Save",
  "Journal des actions": "Action log",
  "Utilisateur": "User",
  "Cible": "Target",
  "Mon profil": "My profile",
  "Photo, informations du compte et securite.": "Photo, account information, and security.",
  "Photo": "Photo",
  "Mot de passe": "Password",
  "Lien client": "Client link",
  "Annonces plateforme": "Platform announcements",
  "Support": "Support",
  "Envoyez une demande au Super Admin.": "Send a request to the Super Admin.",
  "Depot client": "Client deposit",
  "Articles": "Items",
  "Selection tactile rapide, details au clic.": "Fast touch selection, details on click.",
  "Prix de lavage": "Cleaning prices",
  "Liste des articles disponibles": "Available item list",
  "Ticket en cours": "Current ticket",
  "Touchez un article a gauche pour demarrer.": "Tap an item on the left to start.",
  "Numero WhatsApp du client avec indicatif": "Client WhatsApp number with country code",
  "Pave numerique tactile": "Touch keypad",
  "Retrait client": "Client pickup",
  "Verifier un ticket": "Check a ticket",
  "Tickets stockes": "Stored tickets",
  "Historique": "History",
  "Periode historique": "History period",
  "Aucun ticket valide sur cette periode.": "No valid ticket for this period.",
  "Quantite et details": "Quantity and details",
  "Reserve / tache": "Issue / stain",
  "Nombre d'articles identiques": "Number of identical items",
  "Verification retrait": "Pickup check",
  "Annuler": "Cancel",
  "Valider le retrait": "Validate pickup",
  "Deconnexion": "Log out"
};

const UI_TRANSLATION_REPLACEMENTS_EN = [
  ["Recu le", "Received on"],
  ["Mis a jour:", "Updated:"],
  ["Genre:", "Gender:"],
  ["Collecte:", "Pickup:"],
  ["Livraison:", "Delivery:"],
  ["Quantite:", "Quantity:"],
  ["Prix unitaire:", "Unit price:"],
  ["Priorite:", "Priority:"],
  ["Statut:", "Status:"],
  ["Pressing:", "Pressing:"],
  ["Derniere demande:", "Latest request:"],
  ["Livreur demande le", "Courier requested on"],
  ["articles", "items"],
  ["article", "item"],
  ["vetements", "clothing items"],
  ["vetement", "clothing item"]
];

function translateInterfaceText(originalText, language) {
  if (language !== "en") {
    return originalText;
  }

  const trimmedText = originalText.trim();
  const leadingSpace = originalText.match(/^\s*/)?.[0] || "";
  const trailingSpace = originalText.match(/\s*$/)?.[0] || "";
  let translatedText = UI_TRANSLATIONS_EN[trimmedText];

  if (!translatedText) {
    translatedText = trimmedText;
    UI_TRANSLATION_REPLACEMENTS_EN.forEach(([from, to]) => {
      translatedText = translatedText.replaceAll(from, to);
    });
  }

  return translatedText === trimmedText ? originalText : `${leadingSpace}${translatedText}${trailingSpace}`;
}

function translateInterfaceElement(root, language) {
  if (!root) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (
        !parent ||
        ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION"].includes(parent.tagName) ||
        !node.nodeValue.trim()
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    if (!TEXT_NODE_ORIGINALS.has(node)) {
      TEXT_NODE_ORIGINALS.set(node, node.nodeValue);
    }

    const nextText = translateInterfaceText(TEXT_NODE_ORIGINALS.get(node), language);

    if (node.nodeValue !== nextText) {
      node.nodeValue = nextText;
    }
  });

  root.querySelectorAll(TRANSLATABLE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(",")).forEach((element) => {
    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) {
        return;
      }

      let originals = ATTRIBUTE_ORIGINALS.get(element);

      if (!originals) {
        originals = {};
        ATTRIBUTE_ORIGINALS.set(element, originals);
      }

      if (!originals[attribute]) {
        originals[attribute] = element.getAttribute(attribute);
      }

      const nextAttributeValue = translateInterfaceText(originals[attribute], language);

      if (element.getAttribute(attribute) !== nextAttributeValue) {
        element.setAttribute(attribute, nextAttributeValue);
      }
    });
  });
}

const CLIENT_GENDER_OPTIONS = [
  { id: "", label: "Non renseigne" },
  { id: "female", label: "Femme" },
  { id: "male", label: "Homme" },
  { id: "other", label: "Autre" }
];

function getClientGenderLabel(gender) {
  return CLIENT_GENDER_OPTIONS.find((option) => option.id === gender)?.label || "Non renseigne";
}

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

function getInitials(name, fallback = "CL") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback;
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
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

function getPeriodLabel(dateValue, period) {
  const date = new Date(dateValue);

  if (period === "day") {
    return formatDateOnly(dateValue);
  }

  if (period === "week") {
    return getWeekKey(date);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(date);
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
  { id: "dashboard", label: "Tableau", help: "Voir les chiffres importants du pressing en un coup d'oeil." },
  { id: "deposit", label: "Depot", help: "Enregistrer les vetements recus et creer un ticket pour le client." },
  { id: "clientRequests", label: "Demandes clients", help: "Suivre les demandes envoyees par les clients depuis leur compte." },
  { id: "pressingFlow", label: "Flux du pressing", help: "Voir les depots, retraits, retards et recettes par periode." },
  { id: "pickups", label: "Retraits", help: "Verifier un ticket et confirmer que le client a recupere ses vetements." },
  { id: "stock", label: "Stock", help: "Voir les vetements en attente, prets ou en retard de retrait." },
  { id: "tickets", label: "Tickets", help: "Consulter la liste des tickets et ouvrir leur detail." },
  { id: "clients", label: "Clients", help: "Voir les clients, leurs depots et leurs montants." },
  { id: "addArticle", label: "Ajouter article", help: "Ajouter un type de vetement qui n'existe pas encore." },
  { id: "prices", label: "Prix", help: "Modifier les tarifs des articles et des services." },
  { id: "settings", label: "Parametres", help: "Gerer le profil, le lien client et les reglages du pressing." }
];

const SUPERVISOR_MENU = [
  { id: "dashboard", label: "Tableau", help: "Voir la situation generale du pressing." },
  { id: "reports", label: "Rapports", help: "Analyser les depots, retraits et montants du pressing." },
  { id: "pressingFlow", label: "Flux du pressing", help: "Suivre les depots, retraits, retards et recettes du pressing." },
  { id: "stock", label: "Stock", help: "Controler les vetements encore au pressing." },
  { id: "tickets", label: "Tickets", help: "Retrouver les tickets par jour, semaine ou mois." },
  { id: "clients", label: "Clients", help: "Consulter l'activite de chaque client." },
  { id: "settings", label: "Parametres", help: "Voir les informations et options du compte." }
];

const PLATFORM_MENU = [
  { id: "endClients", label: "Clients finaux" },
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

const MENU_HELP_BY_ROLE = {
  platform_admin: {
    endClients: "Voir les clients inscrits dans les pressings.",
    dashboard: "Voir l'activite globale de la plateforme.",
    pressings: "Gerer les pressings clients et leurs comptes.",
    billing: "Suivre les abonnements, factures et paiements.",
    analytics: "Analyser les revenus, l'utilisation et les commandes.",
    communication: "Publier des annonces aux pressings.",
    support: "Lire et traiter les demandes d'aide.",
    settings: "Voir les reglages de la plateforme.",
    security: "Consulter les actions et traces importantes."
  },
  client: {
    dashboard: "Voir le resume de vos demandes et leur avancement.",
    prices: "Consulter les tarifs du pressing avant de commander.",
    request: "Envoyer une nouvelle demande de lavage ou de livraison.",
    history: "Suivre vos demandes, confirmations, tickets et rappels.",
    account: "Voir vos informations personnelles."
  }
};

const MENU_TRANSLATIONS = {
  en: {
    admin: {
      dashboard: {
        label: "Dashboard",
        help: "See the pressing's important numbers at a glance."
      },
      deposit: {
        label: "Deposit",
        help: "Register received clothes and create a ticket for the client."
      },
      clientRequests: {
        label: "Client requests",
        help: "Follow requests sent by clients from their account."
      },
      pressingFlow: {
        label: "Pressing flow",
        help: "See deposits, pickups, delays, and revenue by period."
      },
      pickups: {
        label: "Pickups",
        help: "Check a ticket and confirm that the client collected the clothes."
      },
      stock: {
        label: "Stock",
        help: "See clothes waiting, ready, or late for pickup."
      },
      tickets: {
        label: "Tickets",
        help: "View the ticket list and open details."
      },
      clients: {
        label: "Clients",
        help: "See clients, their deposits, and their totals."
      },
      addArticle: {
        label: "Add item",
        help: "Add a clothing type that is not in the list yet."
      },
      prices: {
        label: "Prices",
        help: "Change article and service prices."
      },
      settings: {
        label: "Settings",
        help: "Manage the profile, client link, and pressing settings."
      }
    },
    supervisor: {
      dashboard: { label: "Dashboard", help: "See the overall situation of the pressing." },
      reports: { label: "Reports", help: "Analyze deposits, pickups, and amounts." },
      pressingFlow: { label: "Pressing flow", help: "Track deposits, pickups, delays, and pressing revenue." },
      stock: { label: "Stock", help: "Check clothes still at the pressing." },
      tickets: { label: "Tickets", help: "Find tickets by day, week, or month." },
      clients: { label: "Clients", help: "View each client's activity." },
      settings: { label: "Settings", help: "View account information and options." }
    },
    platform_admin: {
      endClients: { label: "End clients", help: "See clients registered in pressings." },
      dashboard: { label: "Dashboard", help: "See global platform activity." },
      pressings: { label: "Pressings", help: "Manage client pressings and their accounts." },
      billing: { label: "Subscriptions", help: "Follow subscriptions, invoices, and payments." },
      analytics: { label: "Analytics", help: "Analyze revenue, usage, and orders." },
      communication: { label: "Messages", help: "Publish announcements to pressings." },
      support: { label: "Support", help: "Read and handle help requests." },
      settings: { label: "Settings", help: "View platform settings." },
      security: { label: "Security / Logs", help: "Review important actions and logs." }
    },
    client: {
      dashboard: { label: "Dashboard", help: "See a summary of your requests and progress." },
      prices: { label: "Prices", help: "Check pressing prices before ordering." },
      request: { label: "New request", help: "Send a new washing or delivery request." },
      history: { label: "My requests", help: "Follow your requests, confirmations, tickets, and reminders." },
      account: { label: "My profile", help: "View your personal information." }
    }
  }
};

function getStoredLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "fr";
  } catch {
    return "fr";
  }
}

function getMenuItemLabel(item, role, language) {
  return MENU_TRANSLATIONS[language]?.[role]?.[item.id]?.label || item.label;
}

function getMenuItemHelp(item, role, language = "fr") {
  return MENU_TRANSLATIONS[language]?.[role]?.[item.id]?.help || item.help || MENU_HELP_BY_ROLE[role]?.[item.id] || "";
}

function getRoleLabel(role, language = "fr") {
  return ROLE_LABELS_BY_LANGUAGE[language]?.[role] || ROLE_LABELS[role] || role;
}

function LanguageSelector({ language, onLanguageChange = () => {} }) {
  return (
    <label className="language-selector">
      <span>Langue / Language</span>
      <select
        aria-label="Choisir la langue"
        value={language}
        onChange={(event) => onLanguageChange(event.target.value)}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LegalLinks({ language = "fr" }) {
  const labels = LEGAL_LINK_LABELS[language] || LEGAL_LINK_LABELS.fr;

  return (
    <nav className="legal-links" aria-label="Pages legales">
      {Object.entries(labels).map(([pageId, label]) => (
        <a href={`#legal-${pageId}`} key={pageId}>
          {label}
        </a>
      ))}
    </nav>
  );
}

function useLegalPageFromHash() {
  const [legalPageId, setLegalPageId] = useState(() =>
    window.location.hash.replace("#legal-", "")
  );

  useEffect(() => {
    function updateLegalPage() {
      setLegalPageId(window.location.hash.replace("#legal-", ""));
    }

    window.addEventListener("hashchange", updateLegalPage);
    return () => window.removeEventListener("hashchange", updateLegalPage);
  }, []);

  return LEGAL_PAGES[legalPageId] ? legalPageId : "";
}

function LegalPageOverlay({ language = "fr" }) {
  const pageId = useLegalPageFromHash();

  if (!pageId) {
    return null;
  }

  const page = LEGAL_PAGES[pageId][language] || LEGAL_PAGES[pageId].fr;

  function closeLegalPage() {
    history.pushState("", document.title, window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <div className="legal-page-backdrop" role="dialog" aria-modal="true" aria-labelledby="legal-page-title">
      <article className="legal-page">
        <div className="legal-page-header">
          <div>
            <p className="eyebrow">PressingTrack</p>
            <h2 id="legal-page-title">{page.title}</h2>
          </div>
          <button type="button" onClick={closeLegalPage}>
            {language === "en" ? "Close" : "Fermer"}
          </button>
        </div>
        <p className="legal-page-intro">{page.intro}</p>
        <div className="legal-page-sections">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

function CookieConsentPopup({ language = "fr" }) {
  const [consent, setConsent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    comfort: true,
    analytics: false
  });

  if (consent) {
    return null;
  }

  const copy =
    language === "en"
      ? {
          title: "Cookie preferences",
          body: "We use required cookies for the app to work, and optional cookies to remember choices and improve the experience.",
          accept: "Accept all",
          reject: "Reject optional",
          customize: "Customize",
          save: "Save choices",
          necessary: "Required",
          comfort: "Comfort",
          analytics: "Analytics",
          requiredNote: "Always active"
        }
      : {
          title: "Preferences cookies",
          body: "Nous utilisons des cookies necessaires au fonctionnement de l'app, et des cookies optionnels pour memoriser vos choix et ameliorer l'experience.",
          accept: "Tout accepter",
          reject: "Refuser l'optionnel",
          customize: "Personnaliser",
          save: "Enregistrer mes choix",
          necessary: "Necessaires",
          comfort: "Confort",
          analytics: "Analyse",
          requiredNote: "Toujours actif"
        };

  function saveConsent(nextPreferences) {
    const nextConsent = {
      ...nextPreferences,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(nextConsent));
    setConsent(nextConsent);
  }

  return (
    <div className="cookie-consent" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="cookie-consent-main">
        <div>
          <p className="eyebrow">PressingTrack</p>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        {isCustomizing && (
          <div className="cookie-preferences" aria-label="Preferences cookies">
            <label>
              <input checked readOnly type="checkbox" />
              <span>{copy.necessary}</span>
              <small>{copy.requiredNote}</small>
            </label>
            <label>
              <input
                checked={preferences.comfort}
                type="checkbox"
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, comfort: event.target.checked }))
                }
              />
              <span>{copy.comfort}</span>
            </label>
            <label>
              <input
                checked={preferences.analytics}
                type="checkbox"
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, analytics: event.target.checked }))
                }
              />
              <span>{copy.analytics}</span>
            </label>
          </div>
        )}
      </div>
      <div className="cookie-actions">
        <button type="button" onClick={() => saveConsent({ necessary: true, comfort: true, analytics: true })}>
          {copy.accept}
        </button>
        <button type="button" onClick={() => saveConsent({ necessary: true, comfort: false, analytics: false })}>
          {copy.reject}
        </button>
        <button
          className="cookie-secondary-button"
          type="button"
          onClick={() => (isCustomizing ? saveConsent(preferences) : setIsCustomizing(true))}
        >
          {isCustomizing ? copy.save : copy.customize}
        </button>
      </div>
    </div>
  );
}

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

function getPickupReminderForRequest(request, order) {
  if (!request?.ticketNumber || !order || order.status === "PICKED_UP") {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expectedPickupDate = getExpectedPickupDate(order);
  const daysAfterPickupDate = Math.floor(
    (today.getTime() - expectedPickupDate.getTime()) / 86400000
  );

  if (daysAfterPickupDate >= 7) {
    return { level: "overdue_1_week", message: PICKUP_REMINDER_MESSAGES.overdue_1_week };
  }

  if (daysAfterPickupDate >= 1) {
    return { level: "overdue_1_day", message: PICKUP_REMINDER_MESSAGES.overdue_1_day };
  }

  if (daysAfterPickupDate >= 0) {
    return { level: "ready", message: PICKUP_REMINDER_MESSAGES.ready };
  }

  return null;
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

function getFlowStatus(order) {
  if (order.status === "PICKED_UP") {
    return "Retire";
  }

  const expectedPickupDate = getExpectedPickupDate(order);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expectedPickupDate < today ? "Depasse" : "En traitement";
}

function getPressingFlowRows(orderHistory, period) {
  const groups = new Map();

  orderHistory.forEach((order) => {
    const key = getPeriodKey(order.createdAt, period);
    const row = groups.get(key) || {
      key,
      label: getPeriodLabel(order.createdAt, period),
      deposits: 0,
      pickups: 0,
      processing: 0,
      overdue: 0,
      revenue: 0,
      orders: []
    };
    const flowStatus = getFlowStatus(order);

    row.deposits += 1;
    row.pickups += order.status === "PICKED_UP" ? 1 : 0;
    row.processing += flowStatus === "En traitement" ? 1 : 0;
    row.overdue += flowStatus === "Depasse" ? 1 : 0;
    row.revenue += order.total;
    row.orders.push(order);
    groups.set(key, row);
  });

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPressingFlowPdf({ flowRows, language = "fr", orderHistory, period, pressingName }) {
  const labels =
    language === "en"
      ? {
          title: "Pressing flow report",
          period: "Period",
          generated: "Generated on",
          deposits: "Deposits",
          pickups: "Pickups",
          processing: "Processing",
          overdue: "Overdue",
          monthlyRevenue: "Monthly revenue",
          revenue: "Revenue"
        }
      : {
          title: "Rapport flux du pressing",
          period: "Periode",
          generated: "Genere le",
          deposits: "Depots",
          pickups: "Retraits",
          processing: "En traitement",
          overdue: "Depasses",
          monthlyRevenue: "Recettes du mois",
          revenue: "Recette"
        };
  const monthlyRevenue = orderHistory
    .filter((order) => getPeriodKey(order.createdAt, "month") === getPeriodKey(new Date(), "month"))
    .reduce((sum, order) => sum + order.total, 0);
  const summaryRows = [
    [labels.deposits, orderHistory.length],
    [labels.pickups, orderHistory.filter((order) => order.status === "PICKED_UP").length],
    [labels.processing, orderHistory.filter((order) => getFlowStatus(order) === "En traitement").length],
    [labels.monthlyRevenue, formatMoney(monthlyRevenue)]
  ];
  const tableRows = [
    [labels.period, labels.deposits, labels.pickups, labels.processing, labels.overdue, labels.revenue],
    ...flowRows.map((row) => [
      row.label,
      row.deposits,
      row.pickups,
      row.processing,
      row.overdue,
      formatMoney(row.revenue)
    ])
  ];
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const rowHeight = 20;
  const columnX = [40, 160, 220, 290, 380, 455];
  const contentStreams = [];
  let commands = [];
  let y = pageHeight - margin;

  function addText(text, x, textY, size = 10, bold = false) {
    commands.push(`BT /F${bold ? 2 : 1} ${size} Tf ${x} ${textY} Td (${sanitizePdfText(text)}) Tj ET`);
  }

  function newPage() {
    if (commands.length > 0) {
      contentStreams.push(commands.join("\n"));
    }
    commands = [];
    y = pageHeight - margin;
  }

  addText(labels.title, margin, y, 18, true);
  y -= 26;
  addText(`${pressingName} - ${labels.period}: ${period} - ${labels.generated}: ${formatDateTime(new Date())}`, margin, y, 10);
  y -= 34;
  summaryRows.forEach(([label, value], index) => {
    const x = margin + (index % 2) * 255;
    const boxY = y - Math.floor(index / 2) * 54;
    commands.push(`${x} ${boxY - 30} 225 42 re S`);
    addText(label, x + 10, boxY - 8, 9, true);
    addText(value, x + 10, boxY - 25, 13, true);
  });
  y -= 116;

  tableRows.forEach((row, index) => {
    if (y < 70) {
      newPage();
    }

    if (index === 0) {
      commands.push(`0.06 0.13 0.25 rg ${margin} ${y - 5} 515 22 re f 0 0 0 rg`);
    }

    row.forEach((cell, cellIndex) => {
      addText(cell, columnX[cellIndex], y, index === 0 ? 8 : 8, index === 0);
    });
    y -= rowHeight;
  });

  newPage();

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  const pageObjectIds = [];
  const contentObjectIds = [];

  contentStreams.forEach((stream) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = objects.length + 2;
    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function exportPressingFlowCsv({ orderHistory, period, pressingName }) {
  const rows = [
    ["Pressing", "Periode", "Ticket", "Client", "Depot", "Retrait", "Statut", "Articles", "Montant"]
  ];

  orderHistory.forEach((order) => {
    rows.push([
      pressingName,
      getPeriodLabel(order.createdAt, period),
      order.ticketNumber,
      order.clientPhone,
      formatDateTime(order.createdAt),
      formatDateTime(order.pickedUpAt),
      getFlowStatus(order),
      order.itemCount,
      order.total
    ]);
  });

  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
  downloadTextFile(
    `flux-pressing-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
    "\ufeff" + csv,
    "text/csv;charset=utf-8"
  );
}

function exportPressingFlowPdf({ flowRows, language = "fr", orderHistory, period, pressingName }) {
  downloadBlob(
    `flux-pressing-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
    createPressingFlowPdf({ flowRows, language, orderHistory, period, pressingName })
  );
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
    pressingName: row.pressings?.name || "",
    fullName: row.full_name,
    gender: row.gender || "",
    email: row.email,
    phone: row.phone,
    status: row.status || "active",
    createdAt: row.created_at
  };
}

function fromDatabaseClientRequest(row) {
  return {
    id: row.id,
    pressingId: row.pressing_id,
    pressingName: row.pressings?.name || "",
    clientProfileId: row.client_profile_id,
    clientUserId: row.client_user_id,
    clientName: row.client_name,
    clientGender: row.client_gender || "",
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
    confirmationMessage: row.confirmation_message || "",
    confirmationSentAt: row.confirmation_sent_at,
    pickupReminderLevel: row.pickup_reminder_level || "",
    pickupReminderMessage: row.pickup_reminder_message || "",
    pickupReminderSentAt: row.pickup_reminder_sent_at,
    deliveryRequestStatus: row.delivery_request_status || "",
    deliveryRequestedAt: row.delivery_requested_at,
    deliveryRequestNote: row.delivery_request_note || "",
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    ticketMessage: row.ticket_message,
    ticketWhatsappUrl: row.ticket_whatsapp_url,
    ticketSentAt: row.ticket_sent_at,
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
    client_gender: request.clientGender || "",
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

function AppShell({
  activeView,
  badgeCounts = {},
  children,
  language = "fr",
  menuItems,
  onLanguageChange,
  onLogout,
  onSelectView,
  pressingName,
  role
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function selectView(viewId) {
    onSelectView(viewId);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className={isMobileMenuOpen ? "workspace-shell menu-open" : "workspace-shell"}>
      <header className="mobile-workspace-header">
        <button
          aria-expanded={isMobileMenuOpen}
          aria-controls="workspace-sidebar"
          className="mobile-menu-button"
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          {isMobileMenuOpen ? "Fermer" : "Menu"}
        </button>
        <div>
          <p className="eyebrow">{pressingName}</p>
          <strong>PressingTrack</strong>
        </div>
        <div className="mobile-role-chip">{getRoleLabel(role, language)}</div>
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
            ) : (() => {
              const helpText = getMenuItemHelp(item, role, language);
              const labelText = getMenuItemLabel(item, role, language);

              return (
                <button
                  aria-describedby={helpText ? `help-${role}-${item.id}` : undefined}
                  className={activeView === item.id ? "workspace-nav-item active" : "workspace-nav-item"}
                  key={item.id}
                  title={helpText}
                  type="button"
                  onClick={() => selectView(item.id)}
                >
                  <span className="nav-label">{labelText}</span>
                  <span className="nav-item-side">
                    {badgeCounts[item.id] > 0 && (
                      <strong className="nav-notification-badge">{badgeCounts[item.id]}</strong>
                    )}
                    {helpText && (
                      <span className="nav-help">
                        <span aria-hidden="true">?</span>
                        <span className="nav-help-bubble" id={`help-${role}-${item.id}`} role="tooltip">
                          {helpText}
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })()
          )}
        </nav>

        <div className="workspace-account">
          <LanguageSelector language={language} onLanguageChange={onLanguageChange} />
          <div className="operator-badge">{getRoleLabel(role, language)}</div>
          <button className="logout-button" type="button" onClick={onLogout}>
            {language === "en" ? "Log out" : "Deconnexion"}
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        {children}
        <LegalLinks language={language} />
      </main>
      <LegalPageOverlay language={language} />
      <CookieConsentPopup language={language} />
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

function TicketsReport({
  enablePeriodFilter = false,
  historyLoading,
  onSelectOrder,
  orderHistory,
  title = "Tickets"
}) {
  const [ticketPeriod, setTicketPeriod] = useState("day");
  const visibleOrderHistory = useMemo(() => {
    if (!enablePeriodFilter) {
      return orderHistory;
    }

    const currentPeriodKey = getPeriodKey(new Date(), ticketPeriod);
    return orderHistory.filter(
      (order) => getPeriodKey(order.createdAt, ticketPeriod) === currentPeriodKey
    );
  }, [enablePeriodFilter, orderHistory, ticketPeriod]);

  return (
    <section className="report-section" aria-label={title}>
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>Rapport des depots et dates de retrait.</p>
        </div>
        <strong>{visibleOrderHistory.length}</strong>
      </div>

      {enablePeriodFilter && (
        <div className="period-tabs" role="tablist" aria-label="Filtrer les tickets par periode">
          {HISTORY_PERIODS.map((period) => (
            <button
              className={ticketPeriod === period.id ? "period-tab active" : "period-tab"}
              key={period.id}
              type="button"
              onClick={() => setTicketPeriod(period.id)}
            >
              {period.label}
            </button>
          ))}
        </div>
      )}

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
        ) : visibleOrderHistory.length === 0 ? (
          <div className="empty-history">Aucun ticket a afficher.</div>
        ) : (
          visibleOrderHistory.map((order) => (
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

function getPlatformEndClientRows(clientProfiles, clientRequests) {
  return clientProfiles
    .map((client) => {
      const requests = clientRequests.filter((request) => request.clientProfileId === client.id);
      const lastRequest = requests[0]?.createdAt || null;
      const estimatedTotal = requests.reduce((sum, request) => sum + request.estimatedTotal, 0);

      return {
        ...client,
        requests,
        requestCount: requests.length,
        lastRequest,
        estimatedTotal
      };
    })
    .sort((a, b) => new Date(b.lastRequest || b.createdAt).getTime() - new Date(a.lastRequest || a.createdAt).getTime());
}

function PlatformDashboard({
  databaseError,
  historyLoading,
  language,
  onCreatePressing,
  onCreatePlatformAnnouncement,
  onLanguageChange,
  onLogout,
  orderHistory,
  onUpdateInvoiceStatus,
  onUpdateEndClientStatus,
  onUpdatePressingSubscription,
  onUpdateSupportTicketStatus,
  platformAnnouncements,
  platformClientProfiles,
  platformClientRequests,
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
  const [selectedEndClient, setSelectedEndClient] = useState(null);
  const pressingRows = useMemo(
    () => getPlatformPressingRows(platformPressings, orderHistory, platformUsers),
    [orderHistory, platformPressings, platformUsers]
  );
  const endClientRows = useMemo(
    () => getPlatformEndClientRows(platformClientProfiles, platformClientRequests),
    [platformClientProfiles, platformClientRequests]
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
      language={language}
      menuItems={PLATFORM_MENU}
      onLanguageChange={onLanguageChange}
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

      {activeView === "endClients" && (
        <PlatformEndClientsView
          endClientRows={endClientRows}
          onSelectClient={setSelectedEndClient}
          onUpdateEndClientStatus={onUpdateEndClientStatus}
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
      <PlatformEndClientDetailModal
        client={selectedEndClient}
        onClose={() => setSelectedEndClient(null)}
        onUpdateEndClientStatus={onUpdateEndClientStatus}
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

function PlatformEndClientsView({ endClientRows, onSelectClient, onUpdateEndClientStatus }) {
  const activeClients = endClientRows.filter((client) => client.status === "active");
  const suspendedClients = endClientRows.filter((client) => client.status === "suspended");

  return (
    <div className="workspace-stack">
      <section className="report-grid" aria-label="Indicateurs clients finaux">
        <article className="report-card">
          <span>Clients inscrits</span>
          <strong>{endClientRows.length}</strong>
        </article>
        <article className="report-card">
          <span>Actifs</span>
          <strong>{activeClients.length}</strong>
        </article>
        <article className="report-card">
          <span>Suspendus</span>
          <strong>{suspendedClients.length}</strong>
        </article>
        <article className="report-card wide">
          <span>Demandes clients</span>
          <strong>{endClientRows.reduce((sum, client) => sum + client.requestCount, 0)}</strong>
        </article>
      </section>

      <section className="report-section" aria-label="Clients finaux">
        <div className="section-heading">
          <div>
            <h2>Clients finaux</h2>
            <p>Tous les clients inscrits via les liens des pressings.</p>
          </div>
          <strong>{endClientRows.length}</strong>
        </div>

        <div className="client-list">
          {endClientRows.length === 0 ? (
            <div className="empty-history">Aucun client final inscrit.</div>
          ) : (
            endClientRows.map((client) => (
              <article className="client-item" key={client.id}>
                <div>
                  <strong>{client.fullName}</strong>
                  <span>{getClientGenderLabel(client.gender)} - {client.phone} - {client.email}</span>
                </div>
                <div>
                  <span>Pressing: {client.pressingName || client.pressingId}</span>
                  <span>Derniere demande: {formatDateTime(client.lastRequest)}</span>
                </div>
                <div className="platform-actions">
                  <button type="button" onClick={() => onSelectClient(client)}>
                    Voir
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEndClientStatus(
                        client.id,
                        client.status === "active" ? "suspended" : "active"
                      )
                    }
                  >
                    {client.status === "active" ? "Suspendre" : "Activer"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PlatformEndClientDetailModal({ client, onClose, onUpdateEndClientStatus }) {
  if (!client) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="pickup-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">Client final</p>
            <h2>{client.fullName}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="pickup-summary">
          <div>
            <span>Pressing</span>
            <strong>{client.pressingName || "-"}</strong>
          </div>
          <div>
            <span>Telephone</span>
            <strong>{client.phone}</strong>
          </div>
          <div>
            <span>Genre</span>
            <strong>{getClientGenderLabel(client.gender)}</strong>
          </div>
          <div>
            <span>Demandes</span>
            <strong>{client.requestCount}</strong>
          </div>
          <div>
            <span>Statut</span>
            <strong>{client.status}</strong>
          </div>
        </div>

        <div className="client-detail-list">
          {client.requests.length === 0 ? (
            <div className="empty-history">Aucune demande pour ce client.</div>
          ) : (
            client.requests.map((request) => (
              <article className="client-detail-ticket" key={request.id}>
                <div className="client-detail-ticket-top">
                  <div>
                    <strong>{getPriceOptionLabel(request.serviceType)}</strong>
                    <span>{formatDateTime(request.createdAt)}</span>
                  </div>
                  <span>{CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}</span>
                </div>
                <div className="client-detail-ticket-meta">
                  <span>Collecte: {request.collectionAddress}</span>
                  <span>Livraison: {request.deliveryAddress || request.collectionAddress}</span>
                  <strong>{formatMoney(request.estimatedTotal)}</strong>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="back-button" type="button" onClick={onClose}>
            Fermer
          </button>
          <button
            className="add-button"
            type="button"
            onClick={() =>
              onUpdateEndClientStatus(
                client.id,
                client.status === "active" ? "suspended" : "active"
              )
            }
          >
            {client.status === "active" ? "Suspendre le client" : "Activer le client"}
          </button>
        </div>
      </div>
    </div>
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
        enablePeriodFilter
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

function AccountProfilePanel({ displayName, email, phone }) {
  const [avatarPreview, setAvatarPreview] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState({ type: "", message: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    async function loadAvatar() {
      const { data } = await supabase.auth.getUser();
      setAvatarPreview(data.user?.user_metadata?.avatar_url || "");
    }

    loadAvatar();
  }, []);

  async function updateAvatar(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileStatus({ type: "error", message: "Choisissez une image valide." });
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_SIZE) {
      setProfileStatus({ type: "error", message: "La photo ne doit pas depasser 2 Mo." });
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
    setProfileStatus({ type: "", message: "" });

    if (!isSupabaseConfigured) {
      setProfileStatus({ type: "success", message: "Photo mise a jour localement." });
      return;
    }

    setIsUpdatingProfile(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setIsUpdatingProfile(false);
      setProfileStatus({ type: "error", message: "Utilisateur connecte introuvable." });
      return;
    }

    const previousAvatarPath = user.user_metadata?.avatar_path;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
    const avatarPath = `${user.id}/avatar-${Date.now()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(avatarPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      setIsUpdatingProfile(false);
      setProfileStatus({
        type: "error",
        message: "Upload impossible. Verifiez que le bucket profile-avatars existe."
      });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .getPublicUrl(avatarPath);
    const avatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_path: avatarPath,
        avatar_url: avatarUrl,
        avatar_updated_at: new Date().toISOString()
      }
    });

    if (previousAvatarPath && previousAvatarPath !== avatarPath) {
      await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([previousAvatarPath]);
    }

    setIsUpdatingProfile(false);

    if (updateError) {
      setProfileStatus({ type: "error", message: "Photo envoyee, mais metadata non mises a jour." });
      return;
    }

    setAvatarPreview(avatarUrl);
    setProfileStatus({ type: "success", message: "Photo de profil mise a jour." });
  }

  async function submitPasswordUpdate(event) {
    event.preventDefault();
    setProfileStatus({ type: "", message: "" });

    if (!isSupabaseConfigured) {
      setProfileStatus({
        type: "error",
        message: "Supabase doit etre configure pour modifier le mot de passe."
      });
      return;
    }

    if (newPassword.length < 6) {
      setProfileStatus({
        type: "error",
        message: "Le nouveau mot de passe doit contenir au moins 6 caracteres."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileStatus({
        type: "error",
        message: "Les deux mots de passe ne correspondent pas."
      });
      return;
    }

    setIsUpdatingProfile(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingProfile(false);

    if (error) {
      setProfileStatus({
        type: "error",
        message: "Modification impossible. Reconnectez-vous puis reessayez."
      });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setProfileStatus({ type: "success", message: "Mot de passe mis a jour." });
  }

  async function sendPasswordReset() {
    setProfileStatus({ type: "", message: "" });

    if (!email) {
      setProfileStatus({ type: "error", message: "Aucun email n'est associe a ce compte." });
      return;
    }

    if (!isSupabaseConfigured) {
      setProfileStatus({
        type: "error",
        message: "Supabase doit etre configure pour envoyer une reinitialisation."
      });
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setIsSendingReset(false);

    if (error) {
      setProfileStatus({ type: "error", message: "Envoi du lien de reinitialisation impossible." });
      return;
    }

    setProfileStatus({ type: "success", message: "Lien de reinitialisation envoye par email." });
  }

  return (
    <section className="report-section" aria-label="Mon profil">
      <div className="section-heading">
        <div>
          <h2>Mon profil</h2>
          <p>Photo, informations du compte et securite.</p>
        </div>
      </div>

      <div className="profile-panel">
        <div className="profile-avatar">
          {avatarPreview ? <img alt="Photo de profil" src={avatarPreview} /> : <span>Photo</span>}
        </div>
        <div className="profile-info">
          <strong>{displayName || "Compte connecte"}</strong>
          <span>{email || "Email non renseigne"}</span>
          {phone && <span>{phone}</span>}
          <label className="profile-upload">
            Changer la photo
            <input accept="image/*" type="file" onChange={updateAvatar} />
          </label>
        </div>
      </div>

      <form className="password-settings" onSubmit={submitPasswordUpdate}>
        <div>
          <h3>Mot de passe</h3>
          <p>{email || "Compte connecte"}</p>
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
                setProfileStatus({ type: "", message: "" });
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
                setProfileStatus({ type: "", message: "" });
              }}
              placeholder="Repeter le mot de passe"
            />
          </label>
        </div>

        <div className="profile-actions">
          <button type="submit" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? "Mise a jour..." : "Modifier le mot de passe"}
          </button>
          <button type="button" disabled={isSendingReset} onClick={sendPasswordReset}>
            {isSendingReset ? "Envoi..." : "Envoyer un lien de reinitialisation"}
          </button>
        </div>

        {profileStatus.message && (
          <div className={`password-status ${profileStatus.type}`}>{profileStatus.message}</div>
        )}
      </form>
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
  const [supportSubject, setSupportSubject] = useState("");
  const [supportPriority, setSupportPriority] = useState("normal");
  const [supportStatus, setSupportStatus] = useState({ type: "", message: "" });
  const [isCreatingSupportTicket, setIsCreatingSupportTicket] = useState(false);

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
      </section>

      <AccountProfilePanel
        displayName={pressingName}
        email={userEmail}
      />

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

function PressingFlowView({ historyLoading, language = "fr", orderHistory, pressingName, viewer = "admin" }) {
  const [flowPeriod, setFlowPeriod] = useState("day");
  const flowRows = useMemo(
    () => getPressingFlowRows(orderHistory, flowPeriod),
    [flowPeriod, orderHistory]
  );
  const currentMonthKey = getPeriodKey(new Date(), "month");
  const monthlyRevenue = orderHistory
    .filter((order) => getPeriodKey(order.createdAt, "month") === currentMonthKey)
    .reduce((sum, order) => sum + order.total, 0);
  const pickedUpCount = orderHistory.filter((order) => order.status === "PICKED_UP").length;
  const processingCount = orderHistory.filter((order) => getFlowStatus(order) === "En traitement").length;
  const overdueCount = orderHistory.filter((order) => getFlowStatus(order) === "Depasse").length;
  const totalRevenue = orderHistory.reduce((sum, order) => sum + order.total, 0);
  const latestOrders = orderHistory.slice(0, 12);

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Flux du pressing">
        <div className="section-heading">
          <div>
            <h2>Flux du pressing</h2>
            <p>
              {viewer === "supervisor"
                ? "Suivi des depots, retraits, retards et recettes du pressing."
                : "Journal des mouvements pour preparer le rapport au superviseur."}
            </p>
          </div>
          <strong>{orderHistory.length}</strong>
        </div>

        <div className="report-grid">
          <article className="report-card">
            <span>Depots</span>
            <strong>{orderHistory.length}</strong>
          </article>
          <article className="report-card">
            <span>Retraits</span>
            <strong>{pickedUpCount}</strong>
          </article>
          <article className="report-card">
            <span>En traitement</span>
            <strong>{processingCount}</strong>
          </article>
          <article className="report-card">
            <span>Depasses</span>
            <strong>{overdueCount}</strong>
          </article>
          <article className="report-card wide">
            <span>Recettes du mois</span>
            <strong>{formatMoney(monthlyRevenue)}</strong>
          </article>
          <article className="report-card wide">
            <span>Recettes totales</span>
            <strong>{formatMoney(totalRevenue)}</strong>
          </article>
        </div>
      </section>

      <section className="report-section" aria-label="Point du flux par periode">
        <div className="section-heading">
          <div>
            <h2>Point par periode</h2>
            <p>Jour, semaine ou mois selon le rapport souhaite.</p>
          </div>
        </div>

        <div className="flow-toolbar">
          <div className="period-tabs" role="tablist" aria-label="Periode du flux">
            {HISTORY_PERIODS.map((period) => (
              <button
                className={flowPeriod === period.id ? "period-tab active" : "period-tab"}
                key={period.id}
                type="button"
                onClick={() => setFlowPeriod(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
          <div className="flow-export-actions">
            <button
              type="button"
              onClick={() =>
                exportPressingFlowCsv({ orderHistory, period: flowPeriod, pressingName })
              }
            >
              Telecharger Excel
            </button>
            <button
              type="button"
              onClick={() =>
                exportPressingFlowPdf({ flowRows, language, orderHistory, period: flowPeriod, pressingName })
              }
            >
              Telecharger PDF
            </button>
          </div>
        </div>

        <div className="report-table">
          <div className="flow-row flow-row-head">
            <span>Periode</span>
            <span>Depots</span>
            <span>Retraits</span>
            <span>En traitement</span>
            <span>Depasses</span>
            <span>Recette</span>
          </div>

          {historyLoading ? (
            <div className="empty-history">Chargement du flux...</div>
          ) : flowRows.length === 0 ? (
            <div className="empty-history">Aucun flux a afficher.</div>
          ) : (
            flowRows.map((row) => (
              <article className="flow-row flow-row-item" key={row.key}>
                <strong>{row.label}</strong>
                <span>{row.deposits}</span>
                <span>{row.pickups}</span>
                <span>{row.processing}</span>
                <span>{row.overdue}</span>
                <strong>{formatMoney(row.revenue)}</strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="report-section" aria-label="Derniers mouvements du pressing">
        <div className="section-heading">
          <div>
            <h2>Derniers mouvements</h2>
            <p>Prix de chaque depot et statut actuel.</p>
          </div>
          <strong>{latestOrders.length}</strong>
        </div>

        <div className="report-table">
          <div className="report-row report-row-head">
            <span>Ticket</span>
            <span>Client</span>
            <span>Depot</span>
            <span>Retrait</span>
            <span>Statut flux</span>
            <span>Prix depot</span>
          </div>
          {latestOrders.length === 0 ? (
            <div className="empty-history">Aucun mouvement recent.</div>
          ) : (
            latestOrders.map((order) => (
              <article className="report-row report-row-button" key={order.id}>
                <strong>{order.ticketNumber}</strong>
                <span>{order.clientPhone}</span>
                <span>{formatDateTime(order.createdAt)}</span>
                <span>{formatDateTime(order.pickedUpAt)}</span>
                <span>{getFlowStatus(order)}</span>
                <strong>{formatMoney(order.total)}</strong>
              </article>
            ))
          )}
        </div>
      </section>
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

function ClientDashboard({ clientProfile, clientRequests, pressingName }) {
  const [dashboardAvatarUrl, setDashboardAvatarUrl] = useState("");
  const dashboardRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const requests = clientRequests.filter((request) => request.createdAt?.slice(0, 10) === key);

      return {
        key,
        label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date),
        requests: requests.length,
        total: requests.reduce((sum, request) => sum + request.estimatedTotal, 0)
      };
    });
  }, [clientRequests]);
  const statusCounts = clientRequests.reduce((counts, request) => {
    counts[request.status] = (counts[request.status] || 0) + 1;
    return counts;
  }, {});
  const activeRequests = clientRequests.filter((request) =>
    ["submitted", "accepted", "awaiting_deposit", "deposit_confirmed", "in_processing", "ready"].includes(request.status)
  );
  const completedRequests = clientRequests.filter((request) => request.status === "completed");
  const totalSpent = clientRequests.reduce((sum, request) => sum + request.estimatedTotal, 0);
  const pendingTotal = activeRequests.reduce((sum, request) => sum + request.estimatedTotal, 0);
  const lastRequest = clientRequests[0];
  const maxRequests = Math.max(1, ...dashboardRows.map((row) => row.requests));
  const linePoints = dashboardRows
    .map((row, index) => {
      const x = 24 + index * 56;
      const y = 116 - (row.requests / maxRequests) * 84;
      return `${x},${y}`;
    })
    .join(" ");
  const clientInitials = getInitials(clientProfile?.fullName, "CL");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    async function loadDashboardAvatar() {
      const { data } = await supabase.auth.getUser();
      setDashboardAvatarUrl(data.user?.user_metadata?.avatar_url || "");
    }

    loadDashboardAvatar();
  }, []);

  return (
    <div className="workspace-stack">
      <section className="report-section" aria-label="Tableau de bord client">
        <div className="section-heading">
          <div>
            <h2>Tableau de bord</h2>
            <p>Compte rattache a {pressingName}</p>
          </div>
          <div className="client-dashboard-profile" aria-label="Profil client">
            <div className="client-dashboard-avatar">
              {dashboardAvatarUrl ? (
                <img alt="Photo du client" src={dashboardAvatarUrl} />
              ) : (
                <span>{clientInitials}</span>
              )}
            </div>
            <div>
              <strong>{clientInitials}</strong>
              <span>{clientProfile?.fullName || "Client"}</span>
            </div>
          </div>
        </div>

        <div className="report-grid">
          <article className="report-card wide">
            <span>Pressing rattache</span>
            <strong>{pressingName}</strong>
          </article>
          <article className="report-card">
            <span>Demandes totales</span>
            <strong>{clientRequests.length}</strong>
          </article>
          <article className="report-card">
            <span>En cours</span>
            <strong>{activeRequests.length}</strong>
          </article>
          <article className="report-card">
            <span>Terminees</span>
            <strong>{completedRequests.length}</strong>
          </article>
          <article className="report-card">
            <span>Derniere demande</span>
            <strong>{formatDateOnly(lastRequest?.createdAt)}</strong>
          </article>
          <article className="report-card wide">
            <span>Total estime</span>
            <strong>{formatMoney(totalSpent)}</strong>
          </article>
          <article className="report-card wide">
            <span>Montant en cours</span>
            <strong>{formatMoney(pendingTotal)}</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-charts client-dashboard-charts" aria-label="Graphiques client">
        <article className="chart-panel wide-chart">
          <div className="chart-heading">
            <div>
              <h2>Activite sur 7 jours</h2>
              <p>Nombre de demandes envoyees par jour.</p>
            </div>
          </div>
          <div className="client-line-chart">
            <svg viewBox="0 0 384 140" role="img" aria-label="Courbe des demandes client">
              <polyline className="client-line-grid" points="24,116 360,116" />
              <polyline className="client-line-path" points={linePoints} />
              {dashboardRows.map((row, index) => {
                const x = 24 + index * 56;
                const y = 116 - (row.requests / maxRequests) * 84;

                return <circle className="client-line-dot" cx={x} cy={y} key={row.key} r="5" />;
              })}
            </svg>
            <div className="client-line-labels">
              {dashboardRows.map((row) => (
                <span key={row.key}>
                  <strong>{row.requests}</strong>
                  <small>{row.label}</small>
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Statuts</h2>
              <p>Repartition de vos demandes.</p>
            </div>
          </div>
          <div className="client-status-list">
            {Object.keys(statusCounts).length === 0 ? (
              <div className="empty-history">Aucune demande a analyser.</div>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <div key={status}>
                  <span>{CLIENT_REQUEST_STATUS_LABELS[status] || status}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Derniere activite</h2>
              <p>Resume de la demande la plus recente.</p>
            </div>
          </div>
          {lastRequest ? (
            <div className="client-dashboard-detail">
              <strong>{getPriceOptionLabel(lastRequest.serviceType)}</strong>
              <span>{CLIENT_REQUEST_STATUS_LABELS[lastRequest.status] || lastRequest.status}</span>
              <span>{lastRequest.items.length} ligne(s)</span>
              <span>{formatDateTime(lastRequest.createdAt)}</span>
              <strong>{formatMoney(lastRequest.estimatedTotal)}</strong>
            </div>
          ) : (
            <div className="empty-history">Aucune demande envoyee pour le moment.</div>
          )}
        </article>
      </section>
    </div>
  );
}

function ClientPortal({
  clientArticlePrices,
  clientProfile,
  clientRequests,
  historyBadgeCount = 0,
  language,
  onOpenHistory,
  onCreateClientRequest,
  onRequestDelivery,
  onLanguageChange,
  onLogout,
  pressingName
}) {
  const CLIENT_PORTAL_MENU = [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "prices", label: "Tarifs" },
    { id: "request", label: "Nouvelle demande" },
    { id: "history", label: "Mes demandes" },
    { id: "account", label: "Mon profil" }
  ];
  const [activeClientView, setActiveClientView] = useState("dashboard");
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [serviceType, setServiceType] = useState(DEFAULT_PRICE_OPTION_ID);
  const [articleId, setArticleId] = useState(MOCK_ARTICLES[0].id);
  const [fanicoBundleId, setFanicoBundleId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [items, setItems] = useState([]);
  const [collectionAddress, setCollectionAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");
  const [requestStatus, setRequestStatus] = useState({ type: "", message: "" });
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestingDeliveryId, setRequestingDeliveryId] = useState("");
  const [locatingAddress, setLocatingAddress] = useState("");
  const serviceOptions = PRICE_OPTIONS;
  const isClientSuspended = clientProfile?.status === "suspended";
  const selectedOptionPrices = getOptionPrices(clientArticlePrices, serviceType);
  const clientFanicoRows = useMemo(() => {
    const fanicoPrices = getOptionPrices(clientArticlePrices, FANICO_PRICE_OPTION_ID);

    return Object.entries(fanicoPrices)
      .filter(([bundleId]) => bundleId.startsWith(FANICO_BUNDLE_PREFIX))
      .map(([bundleId, price]) => ({
        id: bundleId,
        quantity: getFanicoBundleQuantity(bundleId),
        price
      }))
      .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0)
      .sort((a, b) => a.quantity - b.quantity);
  }, [clientArticlePrices]);
  const clientPricedArticles = MOCK_ARTICLES.map((article) => ({
    ...article,
    price:
      serviceType === DEFAULT_PRICE_OPTION_ID
        ? getOptionPrices(clientArticlePrices, DEFAULT_PRICE_OPTION_ID)[article.id] ?? article.price
        : selectedOptionPrices[article.id] ?? 0
  }));
  const selectedArticle = clientPricedArticles.find((article) => article.id === articleId) || clientPricedArticles[0];
  const selectedFanicoBundle =
    clientFanicoRows.find((row) => row.id === fanicoBundleId) || clientFanicoRows[0];
  const estimatedTotal = items.reduce((sum, item) => sum + item.total, 0);

  function selectClientView(viewId) {
    setActiveClientView(viewId);
    setIsClientMenuOpen(false);

    if (viewId === "history") {
      onOpenHistory?.();
    }
  }

  function addRequestItem() {
    if (serviceType === FANICO_PRICE_OPTION_ID) {
      if (!selectedFanicoBundle) {
        setRequestStatus({
          type: "error",
          message: "Aucun forfait Fanico n'est configure par ce pressing."
        });
        return;
      }

      setItems((current) => [
        ...current,
        {
          lineId: crypto.randomUUID(),
          articleId: selectedFanicoBundle.id,
          name: `Fanico ${selectedFanicoBundle.quantity} vetement${
            selectedFanicoBundle.quantity > 1 ? "s" : ""
          }`,
          quantity: selectedFanicoBundle.quantity,
          unitPrice: selectedFanicoBundle.price,
          total: selectedFanicoBundle.price
        }
      ]);
      setRequestStatus({ type: "", message: "" });
      return;
    }

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

  function setGpsAddress(addressType, coordinates) {
    const latitude = coordinates.latitude.toFixed(6);
    const longitude = coordinates.longitude.toFixed(6);
    const gpsAddress = `Position GPS: ${latitude}, ${longitude} - https://www.google.com/maps?q=${latitude},${longitude}`;

    if (addressType === "collection") {
      setCollectionAddress(gpsAddress);
      return;
    }

    setDeliveryAddress(gpsAddress);
  }

  function useCurrentPositionForAddress(addressType) {
    setRequestStatus({ type: "", message: "" });

    if (!navigator.geolocation) {
      setRequestStatus({
        type: "error",
        message: "La geolocalisation n'est pas disponible sur cet appareil."
      });
      return;
    }

    setLocatingAddress(addressType);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsAddress(addressType, position.coords);
        setLocatingAddress("");
        setRequestStatus({
          type: "success",
          message: addressType === "collection"
            ? "Position GPS ajoutee comme adresse de collecte."
            : "Position GPS ajoutee comme adresse de livraison."
        });
      },
      () => {
        setLocatingAddress("");
        setRequestStatus({
          type: "error",
          message: "Position GPS impossible a recuperer. Verifiez l'autorisation du navigateur."
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 12000
      }
    );
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

  async function requestDeliveryForPickup(request) {
    setRequestingDeliveryId(request.id);
    setRequestStatus({ type: "", message: "" });

    const result = await onRequestDelivery(request.id);
    setRequestingDeliveryId("");
    setRequestStatus({
      type: result?.ok ? "success" : "error",
      message: result?.message || "Demande de livreur impossible."
    });
  }

  return (
    <main className="client-portal-shell">
      <header className="client-portal-header">
        <button
          aria-expanded={isClientMenuOpen}
          className="mobile-menu-button client-menu-toggle"
          type="button"
          onClick={() => setIsClientMenuOpen((current) => !current)}
        >
          {isClientMenuOpen ? "Fermer" : "Menu"}
        </button>
        <div>
          <p className="eyebrow">{pressingName}</p>
          <h1>Espace client</h1>
          <p>{clientProfile?.fullName || "Client"}</p>
        </div>
        <div className="client-portal-header-actions">
          <LanguageSelector language={language} onLanguageChange={onLanguageChange} />
          <div className="mobile-role-chip">Client</div>
          <button className="logout-button client-header-logout" type="button" onClick={onLogout}>
            Deconnexion
          </button>
        </div>
      </header>

      {isClientMenuOpen && (
        <button
          aria-label="Fermer le menu client"
          className="workspace-menu-backdrop client-menu-backdrop"
          type="button"
          onClick={() => setIsClientMenuOpen(false)}
        />
      )}

      <nav
        className={isClientMenuOpen ? "client-portal-nav open" : "client-portal-nav"}
        aria-label="Menu client"
      >
        {CLIENT_PORTAL_MENU.map((item) => (
          <button
            aria-describedby={`help-client-${item.id}`}
            className={activeClientView === item.id ? "workspace-nav-item active" : "workspace-nav-item"}
            key={item.id}
            title={getMenuItemHelp(item, "client", language)}
            type="button"
            onClick={() => selectClientView(item.id)}
          >
            <span className="nav-label">{getMenuItemLabel(item, "client", language)}</span>
            <span className="nav-item-side">
              {item.id === "history" && historyBadgeCount > 0 && (
                <strong className="nav-notification-badge">{historyBadgeCount}</strong>
              )}
              <span className="nav-help">
                <span aria-hidden="true">?</span>
                <span className="nav-help-bubble" id={`help-client-${item.id}`} role="tooltip">
                  {getMenuItemHelp(item, "client", language)}
                </span>
              </span>
            </span>
          </button>
        ))}
      </nav>

      {activeClientView === "dashboard" && (
        <ClientDashboard
          clientProfile={clientProfile}
          clientRequests={clientRequests}
          pressingName={pressingName}
        />
      )}

      {activeClientView === "prices" && (
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

        {serviceType === FANICO_PRICE_OPTION_ID ? (
          <div className="article-preview-list">
            {clientFanicoRows.length === 0 ? (
              <div className="empty-history">
                Aucun tarif Fanico n'est encore configure par ce pressing.
              </div>
            ) : (
              clientFanicoRows.map((row) => (
                <article className="article-preview-item" key={row.id}>
                  <span className="mini-icon" aria-hidden="true">
                    FA
                  </span>
                  <div>
                    <strong>
                      Fanico {row.quantity} vetement{row.quantity > 1 ? "s" : ""}
                    </strong>
                    <small>{formatMoney(row.price)}</small>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
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
        )}
      </section>
      )}

      {activeClientView === "request" && (
      <section className="report-section" aria-label="Nouvelle demande">
        <div className="section-heading">
          <div>
            <h2>Nouvelle demande</h2>
            <p>Ramassage et livraison a domicile.</p>
          </div>
          <strong>{formatMoney(estimatedTotal)}</strong>
        </div>

        {isClientSuspended && (
          <div className="database-error">
            Votre compte client est suspendu. Contactez le pressing pour reactiver l'acces.
          </div>
        )}

        <form className="platform-form" onSubmit={submitClientRequest}>
          {serviceType === FANICO_PRICE_OPTION_ID ? (
            <label>
              Forfait Fanico
              <select
                value={selectedFanicoBundle?.id || ""}
                onChange={(event) => setFanicoBundleId(event.target.value)}
              >
                {clientFanicoRows.length === 0 ? (
                  <option value="">Aucun forfait Fanico configure</option>
                ) : (
                  clientFanicoRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.quantity} vetement{row.quantity > 1 ? "s" : ""} - {formatMoney(row.price)}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <>
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
            </>
          )}
          <button type="button" onClick={addRequestItem}>
            Ajouter
          </button>

          <div className="wide-field address-field">
            <label htmlFor="collection-address">Adresse de collecte</label>
            <div className="address-input-row">
              <input
                id="collection-address"
                value={collectionAddress}
                onChange={(event) => setCollectionAddress(event.target.value)}
                placeholder="Quartier, rue, repere"
              />
              <button
                type="button"
                disabled={locatingAddress === "collection"}
                onClick={() => useCurrentPositionForAddress("collection")}
              >
                {locatingAddress === "collection" ? "Localisation..." : "Utiliser ma position"}
              </button>
            </div>
          </div>
          <div className="wide-field address-field">
            <label htmlFor="delivery-address">Adresse de livraison</label>
            <div className="address-input-row">
              <input
                id="delivery-address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Laisser vide si identique a la collecte"
              />
              <button
                type="button"
                disabled={locatingAddress === "delivery"}
                onClick={() => useCurrentPositionForAddress("delivery")}
              >
                {locatingAddress === "delivery" ? "Localisation..." : "Utiliser ma position"}
              </button>
            </div>
          </div>
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

          <button type="submit" disabled={isSendingRequest || isClientSuspended}>
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
      )}

      {activeClientView === "history" && (
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
                {request.confirmationMessage && (
                  <div className="ticket-message-panel client-confirmation-message">
                    <div>
                      <strong>Confirmation du pressing</strong>
                      <span>
                        {request.confirmationSentAt
                          ? `Recu le ${formatDateTime(request.confirmationSentAt)}`
                          : CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}
                      </span>
                    </div>
                    <p>{request.confirmationMessage}</p>
                  </div>
                )}
                {request.pickupReminderMessage && (
                  <div className="ticket-message-panel client-pickup-reminder">
                    <div>
                      <strong>Retrait disponible</strong>
                      <span>
                        {request.pickupReminderSentAt
                          ? `Recu le ${formatDateTime(request.pickupReminderSentAt)}`
                          : "Notification"}
                      </span>
                    </div>
                    <p>{request.pickupReminderMessage}</p>
                    <div className="ticket-message-actions">
                      {request.deliveryRequestStatus === "requested" ? (
                        <span className="status-badge status-awaiting_deposit">
                          Livreur demande le {formatDateTime(request.deliveryRequestedAt)}
                        </span>
                      ) : (
                        <button
                          className="picked-up-button"
                          type="button"
                          disabled={requestingDeliveryId === request.id}
                          onClick={() => requestDeliveryForPickup(request)}
                        >
                          {requestingDeliveryId === request.id
                            ? "Envoi..."
                            : "Commander un livreur"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {request.ticketSentAt && request.ticketMessage && (
                  <div className="ticket-message-panel client-ticket-message">
                    <div>
                      <strong>Ticket {request.ticketNumber}</strong>
                      <span>Recu le {formatDateTime(request.ticketSentAt)}</span>
                    </div>
                    <p>{request.ticketMessage}</p>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
      )}

      {activeClientView === "account" && (
        <div className="workspace-stack">
          <section className="report-section" aria-label="Informations client">
            <div className="section-heading">
              <div>
                <h2>Informations client</h2>
                <p>Coordonnees rattachees a votre compte.</p>
              </div>
            </div>

            <div className="settings-grid">
              <article className="report-card">
                <span>Nom</span>
                <strong>{clientProfile?.fullName || "-"}</strong>
              </article>
              <article className="report-card">
                <span>Genre</span>
                <strong>{getClientGenderLabel(clientProfile?.gender)}</strong>
              </article>
              <article className="report-card">
                <span>Telephone</span>
                <strong>{clientProfile?.phone || "-"}</strong>
              </article>
              <article className="report-card">
                <span>Email</span>
                <strong>{clientProfile?.email || "-"}</strong>
              </article>
              <article className="report-card">
                <span>Statut</span>
                <strong>{clientProfile?.status || "active"}</strong>
              </article>
            </div>
          </section>

          <AccountProfilePanel
            displayName={clientProfile?.fullName}
            email={clientProfile?.email}
            phone={clientProfile?.phone}
          />
        </div>
      )}
      <LegalLinks language={language} />
      <LegalPageOverlay language={language} />
      <CookieConsentPopup language={language} />
    </main>
  );
}

function ClientRequestsView({ clientRequests, onSendTicketToClient, onUpdateClientRequestStatus }) {
  const [updatingRequestId, setUpdatingRequestId] = useState("");
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });

  async function updateStatus(request, status) {
    setUpdatingRequestId(request.id);
    setStatusMessage({ type: "", message: "" });

    const result = await onUpdateClientRequestStatus(request.id, status);
    setUpdatingRequestId("");

    if (!result?.ok) {
      setStatusMessage({
        type: "error",
        message: result?.message || "Mise a jour impossible."
      });
      return;
    }

    setStatusMessage({
      type: "success",
      message:
        result.warning
          ? `${request.clientName}: demande acceptee et transformee en ticket ${result.ticketNumber}. ${result.warning}`
          : status === "accepted" && result.ticketNumber
          ? `${request.clientName}: demande acceptee et transformee en ticket ${result.ticketNumber}.`
          : `${request.clientName}: statut passe a "${CLIENT_REQUEST_STATUS_LABELS[status] || status}".`
    });
  }

  async function sendTicketToClient(request) {
    setUpdatingRequestId(request.id);
    setStatusMessage({ type: "", message: "" });

    const result = await onSendTicketToClient(request.id);
    setUpdatingRequestId("");

    if (!result?.ok) {
      setStatusMessage({
        type: "error",
        message: result?.message || "Envoi au compte client impossible."
      });
      return;
    }

    setStatusMessage({
      type: "success",
      message: `${request.clientName}: details du ticket envoyes dans son compte client.`
    });
  }

  return (
    <section className="report-section" aria-label="Demandes clients">
      <div className="section-heading">
        <div>
          <h2>Demandes clients</h2>
          <p>Demandes envoyees depuis le lien client du pressing.</p>
        </div>
        <strong>{clientRequests.length}</strong>
      </div>

      {statusMessage.message && (
        <div className={`password-status ${statusMessage.type}`}>{statusMessage.message}</div>
      )}

      <div className="client-list">
        {clientRequests.length === 0 ? (
          <div className="empty-history">Aucune demande client recue.</div>
        ) : (
          clientRequests.map((request) => (
            <article className="client-detail-ticket" key={request.id}>
              <div className="client-detail-ticket-top">
                <div>
                  <strong>{request.clientName}</strong>
                <span>Genre: {getClientGenderLabel(request.clientGender)}</span>
                <span>
                  {request.clientPhone} - {request.clientEmail}
                </span>
                <span>Mis a jour: {formatDateTime(request.updatedAt || request.createdAt)}</span>
              </div>
                <span className={`status-badge status-${request.status}`}>
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
              {request.confirmationMessage && (
                <div className="ticket-message-panel client-confirmation-message">
                  <div>
                    <strong>Confirmation envoyee</strong>
                    <span>
                      {request.confirmationSentAt
                        ? formatDateTime(request.confirmationSentAt)
                        : CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>
                  <p>{request.confirmationMessage}</p>
                </div>
              )}
              {request.deliveryRequestStatus === "requested" && (
                <div className="ticket-message-panel client-pickup-reminder">
                  <div>
                    <strong>Demande de livraison</strong>
                    <span>{formatDateTime(request.deliveryRequestedAt)}</span>
                  </div>
                  <p>
                    Le client souhaite qu'un livreur recupere son depot pret au retrait.
                    Adresse de livraison: {request.deliveryAddress || request.collectionAddress}
                  </p>
                </div>
              )}
              {request.ticketNumber && (
                <div className="ticket-message-panel">
                  <div>
                    <strong>Ticket {request.ticketNumber}</strong>
                    <span>
                      {request.ticketSentAt
                        ? `Envoye au compte client le ${formatDateTime(request.ticketSentAt)}`
                        : "Pas encore envoye au compte client"}
                    </span>
                  </div>
                  <p>{request.ticketMessage}</p>
                  <div className="ticket-message-actions">
                    <button
                      className="picked-up-button"
                      type="button"
                      disabled={updatingRequestId === request.id}
                      onClick={() => sendTicketToClient(request)}
                    >
                      Envoyer au compte client
                    </button>
                    {request.ticketWhatsappUrl && (
                      <a href={request.ticketWhatsappUrl} target="_blank" rel="noreferrer">
                        Envoyer WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="history-actions">
                <button
                  className="picked-up-button"
                  type="button"
                  disabled={updatingRequestId === request.id || request.status !== "deposit_confirmed"}
                  onClick={() => updateStatus(request, "accepted")}
                >
                  Accepter
                </button>
                <button
                  className="back-button compact-button"
                  type="button"
                  disabled={updatingRequestId === request.id}
                  onClick={() => updateStatus(request, "awaiting_deposit")}
                >
                  Attente depot
                </button>
                <button
                  className="back-button compact-button"
                  type="button"
                  disabled={updatingRequestId === request.id}
                  onClick={() => updateStatus(request, "deposit_confirmed")}
                >
                  Depot confirme
                </button>
                <button
                  className="delete-ticket-button"
                  type="button"
                  disabled={updatingRequestId === request.id}
                  onClick={() => updateStatus(request, "refused")}
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
  language,
  onLanguageChange,
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
      language={language}
      menuItems={SUPERVISOR_MENU}
      onLanguageChange={onLanguageChange}
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
          enablePeriodFilter={activeView === "tickets"}
          historyLoading={historyLoading}
          onSelectOrder={setSelectedOrder}
          orderHistory={orderHistory}
          title={activeView === "reports" ? "Rapports" : "Tickets"}
        />
      )}

      {activeView === "stock" && <StockView orderHistory={orderHistory} />}

      {activeView === "pressingFlow" && (
        <PressingFlowView
          historyLoading={historyLoading}
          language={language}
          orderHistory={orderHistory}
          pressingName={pressingName}
          viewer="supervisor"
        />
      )}

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

function LoginPage({
  clientInvitePressingId,
  clientInvitePressingName,
  language,
  onLanguageChange,
  onLogin
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientGender, setClientGender] = useState("");
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
          gender: clientGender,
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
    <>
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

        <LanguageSelector language={language} onLanguageChange={onLanguageChange} />

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

              <label htmlFor="client-gender">
                Genre
                <select
                  id="client-gender"
                  value={clientGender}
                  onChange={(event) => {
                    setClientGender(event.target.value);
                    setError("");
                  }}
                >
                  {CLIENT_GENDER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
        <LegalLinks language={language} />
      </section>
    </main>
    <LegalPageOverlay language={language} />
    <CookieConsentPopup language={language} />
    </>
  );
}

function App() {
  const [adminSession, setAdminSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [language, setLanguage] = useState(getStoredLanguage);
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
  const [platformClientProfiles, setPlatformClientProfiles] = useState([]);
  const [platformClientRequests, setPlatformClientRequests] = useState([]);
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
  const [adminClientRequestsSeenAt, setAdminClientRequestsSeenAt] = useState(0);
  const [clientHistorySeenAt, setClientHistorySeenAt] = useState(0);
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

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

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
  const adminClientRequestBadgeCount = pressingClientRequests.filter(
    (request) =>
      (request.status === "submitted" || request.deliveryRequestStatus === "requested") &&
      new Date(
        request.deliveryRequestedAt || request.updatedAt || request.createdAt || 0
      ).getTime() > adminClientRequestsSeenAt
  ).length;
  const clientHistoryBadgeCount = clientRequests.filter(
    (request) =>
      request.status !== "submitted" &&
      new Date(request.updatedAt || request.createdAt || 0).getTime() > clientHistorySeenAt
  ).length;

  function markAdminClientRequestsSeen() {
    const now = Date.now();
    setAdminClientRequestsSeenAt(now);

    if (currentPressingId) {
      localStorage.setItem(`pressingtrack-seen-client-requests-${currentPressingId}`, String(now));
    }
  }

  function markClientHistorySeen() {
    const now = Date.now();
    setClientHistorySeenAt(now);

    if (adminSession?.user?.id) {
      localStorage.setItem(`pressingtrack-seen-client-history-${adminSession.user.id}`, String(now));
    }
  }

  function selectAdminView(viewId) {
    setActiveAdminView(viewId);

    if (viewId === "clientRequests") {
      markAdminClientRequestsSeen();
    }
  }

  useEffect(() => {
    document.documentElement.lang = language;
    translateInterfaceElement(document.body, language);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => translateInterfaceElement(document.body, language));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES
    });

    return () => observer.disconnect();
  }, [language]);

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
    if (!currentPressingId) {
      setAdminClientRequestsSeenAt(0);
      return;
    }

    setAdminClientRequestsSeenAt(
      Number(localStorage.getItem(`pressingtrack-seen-client-requests-${currentPressingId}`) || 0)
    );
  }, [currentPressingId]);

  useEffect(() => {
    if (!adminSession?.user?.id) {
      setClientHistorySeenAt(0);
      return;
    }

    setClientHistorySeenAt(
      Number(localStorage.getItem(`pressingtrack-seen-client-history-${adminSession.user.id}`) || 0)
    );
  }, [adminSession?.user?.id]);

  useEffect(() => {
    if (activeAdminView === "clientRequests") {
      markAdminClientRequestsSeen();
    }
  }, [activeAdminView, pressingClientRequests.length]);

  useEffect(() => {
    if (!isAdmin || !currentPressingId || pressingClientRequests.length === 0 || orderHistory.length === 0) {
      return;
    }

    const ordersById = new Map(orderHistory.map((order) => [order.id, order]));
    const ordersByTicketNumber = new Map(orderHistory.map((order) => [order.ticketNumber, order]));
    const now = new Date().toISOString();
    const reminderUpdates = pressingClientRequests
      .map((request) => {
        const order = ordersById.get(request.ticketId) || ordersByTicketNumber.get(request.ticketNumber);
        const reminder = getPickupReminderForRequest(request, order);
        const currentLevelRank = PICKUP_REMINDER_LEVELS[request.pickupReminderLevel] || 0;
        const nextLevelRank = PICKUP_REMINDER_LEVELS[reminder?.level] || 0;

        if (!reminder || nextLevelRank <= currentLevelRank) {
          return null;
        }

        return {
          id: request.id,
          pickupReminderLevel: reminder.level,
          pickupReminderMessage: reminder.message,
          pickupReminderSentAt: now
        };
      })
      .filter(Boolean);

    if (reminderUpdates.length === 0) {
      return;
    }

    setPressingClientRequests((current) =>
      current.map((request) => {
        const update = reminderUpdates.find((item) => item.id === request.id);
        return update ? { ...request, ...update, updatedAt: update.pickupReminderSentAt } : request;
      })
    );

    if (!isSupabaseConfigured) {
      return;
    }

    reminderUpdates.forEach((update) => {
      supabase
        .from("client_service_requests")
        .update({
          pickup_reminder_level: update.pickupReminderLevel,
          pickup_reminder_message: update.pickupReminderMessage,
          pickup_reminder_sent_at: update.pickupReminderSentAt,
          updated_at: update.pickupReminderSentAt
        })
        .eq("pressing_id", currentPressingId)
        .eq("id", update.id)
        .then(({ error }) => {
          if (error) {
            setDatabaseError("Envoi d'une notification de retrait impossible dans Supabase.");
          }
        });
    });
  }, [currentPressingId, isAdmin, orderHistory, pressingClientRequests]);

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
          gender: adminSession.user.user_metadata?.gender || "",
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
      setPlatformClientProfiles([]);
      setPlatformClientRequests([]);
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
        { data: supportTicketsData, error: supportTicketsError },
        { data: clientProfilesData, error: clientProfilesError },
        { data: clientRequestsData, error: clientRequestsError }
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
            .order("created_at", { ascending: false }),
          supabase
            .from("client_profiles")
            .select("*, pressings(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("client_service_requests")
            .select("*, pressings(name)")
            .order("created_at", { ascending: false })
        ]);

      if (
        pressingsError ||
        usersError ||
        invoicesError ||
        announcementsError ||
        supportTicketsError ||
        clientProfilesError ||
        clientRequestsError
      ) {
        setDatabaseError(
          "Lecture plateforme incomplete. Executez la mise a jour SQL pour activer utilisateurs, clients, abonnements, messagerie et support."
        );
        setPlatformLoading(false);
        return;
      }

      setPlatformPressings(pressingsData.map(fromDatabasePressing));
      setPlatformUsers(usersData.map(fromDatabasePlatformUser));
      setPlatformInvoices(invoicesData.map(fromDatabaseInvoice));
      setPlatformAnnouncements(announcementsData.map(fromDatabaseAnnouncement));
      setPlatformSupportTickets(supportTicketsData.map(fromDatabaseSupportTicket));
      setPlatformClientProfiles(clientProfilesData.map(fromDatabaseClientProfile));
      setPlatformClientRequests(clientRequestsData.map(fromDatabaseClientRequest));
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

  async function updateEndClientStatus(clientProfileId, status) {
    setPlatformClientProfiles((current) =>
      current.map((client) =>
        client.id === clientProfileId ? { ...client, status } : client
      )
    );

    if (!isSupabaseConfigured || !isPlatformAdmin) {
      return;
    }

    const { error } = await supabase
      .from("client_profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", clientProfileId);

    if (error) {
      setDatabaseError("Mise a jour du client final echouee dans Supabase.");
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
      clientGender: clientProfile.gender || "",
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

  async function requestPickupDelivery(requestId) {
    const requestedAt = new Date().toISOString();
    const request = clientRequests.find((item) => item.id === requestId);

    if (!request) {
      return { ok: false, message: "Demande introuvable." };
    }

    if (request.deliveryRequestStatus === "requested") {
      return { ok: true, message: "Votre demande de livreur est deja enregistree." };
    }

    const requestUpdates = {
      deliveryRequestStatus: "requested",
      deliveryRequestedAt: requestedAt,
      deliveryRequestNote: "Livraison demandee par le client depuis son compte.",
      updatedAt: requestedAt
    };

    if (!isSupabaseConfigured) {
      setClientRequests((current) =>
        current.map((item) => (item.id === requestId ? { ...item, ...requestUpdates } : item))
      );
      return { ok: true, message: "Votre demande de livreur a ete envoyee au pressing." };
    }

    const { error } = await supabase
      .from("client_service_requests")
      .update({
        delivery_request_status: "requested",
        delivery_requested_at: requestedAt,
        delivery_request_note: requestUpdates.deliveryRequestNote,
        updated_at: requestedAt
      })
      .eq("client_user_id", adminSession.user.id)
      .eq("id", requestId);

    if (error) {
      setDatabaseError("Demande de livreur impossible dans Supabase.");
      return { ok: false, message: "Demande de livreur impossible dans Supabase." };
    }

    setClientRequests((current) =>
      current.map((item) => (item.id === requestId ? { ...item, ...requestUpdates } : item))
    );
    setDatabaseError("");
    return { ok: true, message: "Votre demande de livreur a ete envoyee au pressing." };
  }

  async function updateClientRequestStatus(requestId, status) {
    const updatedAt = new Date().toISOString();
    const request = pressingClientRequests.find((item) => item.id === requestId);
    const confirmationMessage = CLIENT_REQUEST_CONFIRMATION_MESSAGES[status] || "";

    if (!request) {
      return { ok: false, message: "Demande client introuvable." };
    }

    let createdTicket = null;

    if (status === "accepted" && request.status !== "accepted") {
      const pressingId = currentPressingId || request.pressingId;

      if (isSupabaseConfigured && !pressingId) {
        return { ok: false, message: "Aucun pressing n'est associe a ce compte." };
      }

      let ticketNumber;
      try {
        ticketNumber = await getNextTicketNumber();
      } catch {
        ticketNumber = createTicketNumber(orderHistory);
      }

      const readyDate = getReadyDate();
      const createdAt = new Date().toISOString();
      const ticketItemsFromRequest = request.items.map((item) => ({
        lineId: item.lineId || crypto.randomUUID(),
        name: item.name,
        icon: getArticleIcon(item.name),
        price: item.total || item.unitPrice * item.quantity,
        reserve: "Demande client",
        washOptionId: request.serviceType,
        washOptionLabel: getPriceOptionLabel(request.serviceType),
        copyNumber: 1,
        copyTotal: 1,
        details: {
          ...EMPTY_DETAILS,
          note: [
            `Collecte: ${request.collectionAddress}`,
            `Livraison: ${request.deliveryAddress || request.collectionAddress}`,
            request.note ? `Note client: ${request.note}` : ""
          ]
            .filter(Boolean)
            .join(" | ")
        }
      }));
      const whatsappPhone = normalizeWhatsAppPhone(request.clientPhone);
      const message = buildWhatsAppMessage({
        ticketNumber,
        readyDate,
        total: request.estimatedTotal,
        items: ticketItemsFromRequest
      });

      createdTicket = {
        id: crypto.randomUUID(),
        pressingId,
        ticketNumber,
        status: "IN_PROCESSING",
        createdAt,
        clientPhone: request.clientPhone,
        whatsappPhone,
        total: request.estimatedTotal,
        itemCount: ticketItemsFromRequest.length,
        items: ticketItemsFromRequest,
        readyDate,
        whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`,
        message
      };

      if (isSupabaseConfigured) {
        const { error: ticketError } = await supabase.from("tickets").insert(toDatabaseTicket(createdTicket));

        if (ticketError) {
          setDatabaseError("Creation du ticket depuis la demande client echouee.");
          return { ok: false, message: "Creation du ticket impossible dans Supabase." };
        }
      }
    }

    const requestUpdates = {
      status,
      updatedAt,
      ...(confirmationMessage
        ? {
            confirmationMessage,
            confirmationSentAt: updatedAt
          }
        : {}),
      ...(createdTicket
        ? {
            ticketId: createdTicket.id,
            ticketNumber: createdTicket.ticketNumber,
            ticketMessage: createdTicket.message,
            ticketWhatsappUrl: createdTicket.whatsappUrl
          }
        : {})
    };
    const databaseRequestUpdates = {
      status,
      updated_at: updatedAt,
      ...(confirmationMessage
        ? {
            confirmation_message: confirmationMessage,
            confirmation_sent_at: updatedAt
          }
        : {}),
      ...(createdTicket
        ? {
            ticket_id: createdTicket.id,
            ticket_number: createdTicket.ticketNumber,
            ticket_message: createdTicket.message,
            ticket_whatsapp_url: createdTicket.whatsappUrl
          }
        : {})
    };

    if (!isSupabaseConfigured || !currentPressingId) {
      setPressingClientRequests((current) =>
        current.map((request) => (request.id === requestId ? { ...request, ...requestUpdates } : request))
      );
      if (createdTicket) {
        setOrderHistory((current) => [createdTicket, ...current]);
      }
      return { ok: true, ticketNumber: createdTicket?.ticketNumber };
    }

    const { error } = await supabase
      .from("client_service_requests")
      .update(databaseRequestUpdates)
      .eq("pressing_id", currentPressingId)
      .eq("id", requestId);

    if (error) {
      const { error: fallbackError } = await supabase
        .from("client_service_requests")
        .update({ status, updated_at: updatedAt })
        .eq("pressing_id", currentPressingId)
        .eq("id", requestId);

      if (fallbackError) {
        setDatabaseError(`Mise a jour de la demande client echouee: ${fallbackError.message}`);
        return { ok: false, message: `Mise a jour Supabase echouee: ${fallbackError.message}` };
      }

      setPressingClientRequests((current) =>
        current.map((request) => (request.id === requestId ? { ...request, ...requestUpdates } : request))
      );
      if (createdTicket) {
        setOrderHistory((current) => [createdTicket, ...current]);
      }
      setDatabaseError(`Demande mise a jour, mais certains details ne sont pas lies: ${error.message}`);
      return {
        ok: true,
        ticketNumber: createdTicket?.ticketNumber,
        warning: createdTicket
          ? "Executez la mise a jour SQL pour enregistrer les details du ticket dans le compte client."
          : "Executez la mise a jour SQL pour enregistrer les messages de confirmation dans le compte client."
      };
    }

    setPressingClientRequests((current) =>
      current.map((request) => (request.id === requestId ? { ...request, ...requestUpdates } : request))
    );
    if (createdTicket) {
      setOrderHistory((current) => [createdTicket, ...current]);
    }
    setDatabaseError("");
    return { ok: true, ticketNumber: createdTicket?.ticketNumber };
  }

  async function sendTicketToClientAccount(requestId) {
    const request = pressingClientRequests.find((item) => item.id === requestId);

    if (!request?.ticketNumber || !request?.ticketMessage) {
      return { ok: false, message: "Acceptez d'abord la demande pour creer le ticket." };
    }

    const ticketSentAt = new Date().toISOString();

    if (!isSupabaseConfigured || !currentPressingId) {
      setPressingClientRequests((current) =>
        current.map((item) =>
          item.id === requestId ? { ...item, ticketSentAt, updatedAt: ticketSentAt } : item
        )
      );
      return { ok: true };
    }

    const { error } = await supabase
      .from("client_service_requests")
      .update({ ticket_sent_at: ticketSentAt, updated_at: ticketSentAt })
      .eq("pressing_id", currentPressingId)
      .eq("id", requestId);

    if (error) {
      setDatabaseError("Envoi du ticket au compte client echoue.");
      return { ok: false, message: "Envoi Supabase impossible." };
    }

    setPressingClientRequests((current) =>
      current.map((item) =>
        item.id === requestId ? { ...item, ticketSentAt, updatedAt: ticketSentAt } : item
      )
    );
    setDatabaseError("");
    return { ok: true };
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
    setPlatformClientProfiles([]);
    setPlatformClientRequests([]);
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
        language={language}
        onLanguageChange={changeLanguage}
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
        historyBadgeCount={clientHistoryBadgeCount}
        language={language}
        onOpenHistory={markClientHistorySeen}
        onCreateClientRequest={createClientServiceRequest}
        onRequestDelivery={requestPickupDelivery}
        onLanguageChange={changeLanguage}
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
        language={language}
        onCreatePressing={createPlatformPressing}
        onCreatePlatformAnnouncement={createPlatformAnnouncement}
        onLanguageChange={changeLanguage}
        onLogout={logoutAdmin}
        onUpdateInvoiceStatus={updateInvoiceStatus}
        onUpdateEndClientStatus={updateEndClientStatus}
        onUpdatePressingSubscription={updatePressingSubscription}
        onUpdateSupportTicketStatus={updateSupportTicketStatus}
        orderHistory={orderHistory}
        platformAnnouncements={platformAnnouncements}
        platformClientProfiles={platformClientProfiles}
        platformClientRequests={platformClientRequests}
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
        language={language}
        onCreateSupportTicket={createSupportTicket}
        onLanguageChange={changeLanguage}
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
        badgeCounts={{ clientRequests: adminClientRequestBadgeCount }}
        language={language}
        menuItems={ADMIN_MENU}
        onLanguageChange={changeLanguage}
        onLogout={logoutAdmin}
        onSelectView={selectAdminView}
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
            enablePeriodFilter
            historyLoading={historyLoading}
            onSelectOrder={setSelectedReportOrder}
            orderHistory={orderHistory}
            title="Tickets"
          />
        )}

        {activeAdminView === "clientRequests" && (
          <ClientRequestsView
            clientRequests={pressingClientRequests}
            onSendTicketToClient={sendTicketToClientAccount}
            onUpdateClientRequestStatus={updateClientRequestStatus}
          />
        )}

        {activeAdminView === "pressingFlow" && (
          <PressingFlowView
            historyLoading={historyLoading}
            language={language}
            orderHistory={orderHistory}
            pressingName={currentPressingName}
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
      badgeCounts={{ clientRequests: adminClientRequestBadgeCount }}
      language={language}
      menuItems={ADMIN_MENU}
      onLanguageChange={changeLanguage}
      onLogout={logoutAdmin}
      onSelectView={selectAdminView}
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
              <div className="operator-badge">{getRoleLabel(currentRole, language) || "Admin"}</div>
              <button className="logout-button" type="button" onClick={logoutAdmin}>
                {language === "en" ? "Log out" : "Deconnexion"}
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
          Numero WhatsApp du client avec indicatif
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
          placeholder="Ex: 2250700000000"
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
