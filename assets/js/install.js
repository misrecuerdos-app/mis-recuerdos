let deferredInstallPrompt = null;

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function updateInstallButtons() {
  document.querySelectorAll("[data-install-app]").forEach(button => {
    if (isStandaloneMode()) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    button.textContent = isIOSDevice() ? "Cómo instalar en iPhone" : "Instalar aplicación";
  });
}

function closeInstallHelp() {
  document.getElementById("installHelp")?.remove();
}

function showInstallHelp(platform = "auto") {
  closeInstallHelp();
  const ios = platform === "ios" || (platform === "auto" && isIOSDevice());
  const overlay = document.createElement("div");
  overlay.id = "installHelp";
  overlay.className = "install-help-overlay";
  overlay.innerHTML = `
    <button class="install-help-backdrop" onclick="closeInstallHelp()" aria-label="Cerrar"></button>
    <section class="install-help-card" role="dialog" aria-modal="true" aria-label="Instalar Mis Recuerdos">
      <button class="install-help-close" onclick="closeInstallHelp()" aria-label="Cerrar">×</button>
      <img src="assets/images/icons/icon-192.png" alt="" class="install-help-icon">
      <h2>Instalar Mis Recuerdos</h2>
      ${ios ? `
        <ol class="install-steps">
          <li>Abre esta página en <strong>Safari</strong>.</li>
          <li>Toca el botón <strong>Compartir</strong> <span class="share-symbol">□↑</span>.</li>
          <li>Selecciona <strong>Agregar a pantalla de inicio</strong>.</li>
          <li>Toca <strong>Agregar</strong>.</li>
        </ol>
      ` : `
        <ol class="install-steps">
          <li>Abre esta página en <strong>Chrome</strong>.</li>
          <li>Toca <strong>Instalar</strong> cuando aparezca el aviso.</li>
          <li>También puedes abrir el menú ⋮ y elegir <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</li>
        </ol>
      `}
      <p class="install-note">Después abrirá como una app, sin la barra del navegador.</p>
      <button class="install-help-done" onclick="closeInstallHelp()">Entendido</button>
    </section>
  `;
  document.body.appendChild(overlay);
}

async function installRecuerdosApp() {
  if (isStandaloneMode()) return;

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButtons();
    return;
  }

  showInstallHelp("auto");
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtons();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  closeInstallHelp();
  updateInstallButtons();
});

window.addEventListener("DOMContentLoaded", () => {
  updateInstallButtons();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.warn("No se pudo registrar el service worker.", error);
    });
  }
});
