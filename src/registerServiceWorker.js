export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (!newWorker) {
            return;
          }

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateAvailableNotice();
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  });
}

function showUpdateAvailableNotice() {
  if (document.querySelector("[data-pwa-update-notice]")) {
    return;
  }

  const notice = document.createElement("div");
  notice.dataset.pwaUpdateNotice = "true";
  notice.setAttribute("role", "status");
  notice.innerHTML = `
    <span>Nouvelle version disponible.</span>
    <button type="button">Actualiser</button>
  `;

  Object.assign(notice.style, {
    alignItems: "center",
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "8px",
    bottom: "16px",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.22)",
    color: "#ffffff",
    display: "flex",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "14px",
    gap: "12px",
    left: "50%",
    maxWidth: "calc(100vw - 32px)",
    padding: "12px 14px",
    position: "fixed",
    transform: "translateX(-50%)",
    zIndex: "9999"
  });

  const button = notice.querySelector("button");
  Object.assign(button.style, {
    background: "#14b8a6",
    border: "0",
    borderRadius: "6px",
    color: "#042f2e",
    cursor: "pointer",
    font: "inherit",
    fontWeight: "700",
    padding: "8px 10px"
  });
  button.addEventListener("click", () => window.location.reload());

  document.body.appendChild(notice);
}
