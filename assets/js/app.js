const app = document.getElementById("app");
const UPLOAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyIDrzh6dqbdaZug7udzdXLDiFQVgt1EG83DvOaTQJxM5j5salcbEgfBoVoQ4vqFKlJ/exec";

let liveItems = [];
let selectedMineItems = new Set();
let mineSelectionMode = false;
let currentViewerIndex = -1;
let currentInfoTopic = null;
function requireGoogleIdentity() {
  const identity = getGoogleIdentity();

  if (!identity.googleUserId || !identity.uploaderEmail) {
    Auth.showLogin();
    throw new Error("Debes iniciar sesión con Google para continuar.");
  }

  return identity;
}

Auth.initialize();

function getUploaderEmail() {
  const candidates = [
    AppState?.security?.user?.email,
    AppState?.auth?.email,
    AppState?.auth?.user?.email,
    AppState?.user?.email,
    AppState?.device?.email,
    Auth?.currentUser?.email,
    Auth?.user?.email,
    typeof Auth?.getCurrentUser === "function"
      ? Auth.getCurrentUser()?.email
      : "",
    localStorage.getItem("recuerdos-user-email"),
    localStorage.getItem("google-user-email"),
    localStorage.getItem("user-email")
  ];

  return String(
    candidates.find(value =>
      typeof value === "string" && value.includes("@")
    ) || ""
  ).trim();
}

function getGoogleIdentity() {
  const user = AppState?.security?.user || {};
  const googleUserId = String(user.id || "").trim();
  const googleName = String(user.name || "").trim();
  const uploaderEmail = getUploaderEmail();

  return {
    googleUserId,
    googleName,
    uploaderEmail,
    // Alias temporales para conservar compatibilidad con Apps Script
    // mientras se completa la migración del backend.
    guestGoogleId: googleUserId,
    guestName: googleName
  };
}

function resetUploadState({ keepSection = false } = {}) {
  if (!keepSection) {
    AppState.upload.section = null;
  }

  AppState.upload.files = [];
  AppState.upload.status = "idle";
  AppState.upload.current = 0;
  AppState.upload.total = 0;
  AppState.upload.currentFileName = "";
  AppState.upload.error = "";
}

function getVideoPlaceholderDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f2edf2"/>
      <circle cx="300" cy="260" r="74" fill="#d94f91"/>
      <polygon points="280,220 280,300 350,260" fill="white"/>
      <text x="300" y="380" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="48" fill="#5a3150">
        Video Seleccionado, 
        Miniatura no disponible
        Oprime "Subir"
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}


function getProcessingVideoThumbnailDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
      <rect width="100%" height="100%" fill="#302833"/>
      <circle cx="400" cy="330" r="88" fill="#d94f91"/>
      <polygon points="372,278 372,382 462,330" fill="white"/>
      <text x="400" y="500" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="52" fill="white">
        Procesando vista previa...
      </text>
      <text x="400" y="550" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" fill="#d9cad7">
        El video se subió correctamente
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function handleDriveThumbnailError(image) {
  if (!image || image.dataset.retryPending === "true") return;

  const isVideo = image.dataset.isVideo === "true";
  if (!isVideo) return;

  const fileId = image.dataset.fileId;
  const retries = Number(image.dataset.retries || 0);

  image.src = getProcessingVideoThumbnailDataUrl();

  if (!fileId || retries >= 8) return;

  image.dataset.retryPending = "true";
  window.setTimeout(() => {
    image.dataset.retryPending = "false";
    image.dataset.retries = String(retries + 1);
    image.src = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w800&_=${Date.now()}`;
  }, 15000);
}

function refreshPendingVideoThumbnails(root = document) {
  root.querySelectorAll('img[data-is-video="true"]').forEach(image => {
    if (image.complete && image.naturalWidth === 0) {
      handleDriveThumbnailError(image);
    }
  });
}

function renderApp() {
  const page = AppState.navigation.currentPage;

  if (page === "home") renderHome();
  if (page === "sections") renderSections();
  if (page === "upload") renderUpload();
  if (page === "live") renderLive();
  if (page === "mine") renderMine();
  if (page === "info") renderInfo();
}

function renderHome() {
  app.innerHTML = `
    <main
      class="app-shell home-shell"
      style="background-image: url('${AppState.event.heroImage}')"
    >
      ${UI.menuButton({ variant: "light" })}
      <section class="home-overlay">

        <div class="home-content">

          <div class="home-title">

 <div class="home-brand-block">

  <img
    src="assets/images/logos/logo-mis-recuerdos-light.png"
    alt="Recuerdos"
    class="home-logo"
  >

</div>

<h1 class="home-event-title">

  <span class="home-event-type">
    XV Años
  </span>

  <div class="home-title-line"></div>

  <span class="home-event-name">
    Sofía Gutiérrez
  </span>

</h1>

            <p>
              Comparte tus momentos<br>
              de este día inolvidable 💗
            </p>
          </div>

          <div class="home-actions">
            ${UI.button({
              text: "Subir fotos o videos",
              variant: "primary",
              onClick: "goTo('sections')"
            })} 
            ${UI.button({
  text: "Ver Galería",
  variant: "secondary",
  onClick: "goTo('live')"
})}
          </div>
        </div>
      </section>
      
    </main>
  `;
}


function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openSideMenu() {
  closeSideMenu();

  const user = AppState.security.user;
  const menu = document.createElement("div");
  menu.id = "sideMenu";
  menu.className = "side-menu-overlay";
  menu.innerHTML = `
    <button class="side-menu-backdrop" onclick="closeSideMenu()" aria-label="Cerrar menú"></button>
    <aside class="side-menu-panel" aria-label="Menú principal">
      <div class="side-menu-header">
        <div>
          <strong>${escapeHtml(AppState.app.name)}</strong>
          <span>v${escapeHtml(AppState.app.version)}</span>
        </div>
        <button class="side-menu-close" onclick="closeSideMenu()" aria-label="Cerrar">×</button>
      </div>

      <section class="session-card">
        <h2>Sesión actual</h2>
        ${user ? `
          <div class="session-person">
            ${user.picture ? `<img src="${escapeHtml(user.picture)}" alt="">` : `<div class="session-avatar">👤</div>`}
            <div>
              <strong>${escapeHtml(user.name || "Usuario")}</strong>
              <span>${escapeHtml(user.email || "Correo no disponible")}</span>
            </div>
          </div>
          <button class="session-action primary" onclick="Auth.changeAccount()">Cambiar cuenta</button>
          <button class="session-action" onclick="Auth.logout()">Cerrar sesión</button>
        ` : `
          <p>No hay una sesión iniciada.</p>
          <button class="session-action primary" onclick="closeSideMenu(); Auth.showLogin()">Iniciar sesión</button>
        `}
      </section>
    </aside>
  `;

  document.body.appendChild(menu);
  requestAnimationFrame(() => menu.classList.add("open"));
}

function closeSideMenu() {
  document.getElementById("sideMenu")?.remove();
}

const INFO_TOPICS = {
  about: {
    title: "Qué es Mis Recuerdos",
    body: `
      <p>Mis Recuerdos es una aplicación web que funciona desde el navegador y utiliza servicios de Google para guardar y organizar las fotos y videos de un evento.</p>
      <p>No requiere descargarse desde una tienda y su uso es gratuito.</p>
    `
  },
  guide: {
    title: "Cómo usarla",
    body: `
      <p>Elige una sección del evento, selecciona tus fotos o videos y toca Subir. En Galería podrás ver lo compartido y en Mis Subidas administrar tus propios archivos.</p>
      <p>No cierres la aplicación mientras una carga esté en proceso.</p>
    `
  },
  faq: {
    title: "Preguntas frecuentes",
    body: `
      <h3>¿Por qué un video tarda en aparecer?</h3>
      <p>Google Drive puede necesitar algunos minutos para crear su miniatura y habilitar la reproducción.</p>
      <h3>¿Puedo borrar lo que subí?</h3>
      <p>Sí. Inicia sesión con la misma cuenta de Google desde cualquier dispositivo.</p>
    `
  },
  privacy: {
    title: "Privacidad",
    body: `
      <p>Los archivos se guardan en la cuenta de Google configurada para el evento. La aplicación usa un identificador privado del dispositivo para mostrar y administrar tus propias subidas.</p>
    `
  },
  support: {
    title: "Apoyar el proyecto",
    body: `
      <p>Mis Recuerdos es gratuito. Quien desee apoyar futuras mejoras y nuevas funciones podrá hacerlo mediante una aportación voluntaria por PayPal.</p>
    `
  }
};

function openInfoTopic(topicId) {
  currentInfoTopic = INFO_TOPICS[topicId] ? topicId : null;
  renderInfo();
}

function closeInfoTopic() {
  currentInfoTopic = null;
  renderInfo();
}

function renderInfo() {
  const topic = currentInfoTopic ? INFO_TOPICS[currentInfoTopic] : null;

  app.innerHTML = `
    <main class="app-shell white-shell info-shell">
      ${UI.header({ title: topic ? topic.title : "Información", back: topic ? false : "home" })}

      <section class="info-page">
        ${topic ? `
          <article class="info-topic-card">
            ${topic.body}
          </article>
          <button class="info-back-index" onclick="closeInfoTopic()">← Volver a temas</button>
        ` : `
          <div class="info-heading">
            <h2>¿Qué necesitas consultar?</h2>
            <p>Selecciona un tema.</p>
          </div>
          <div class="info-index">
            <button onclick="openInfoTopic('about')"><span>Qué es Mis Recuerdos</span><b>›</b></button>
            <button onclick="openInfoTopic('guide')"><span>Cómo usarla</span><b>›</b></button>
            <button onclick="openInfoTopic('faq')"><span>Preguntas frecuentes</span><b>›</b></button>
            <button onclick="openInfoTopic('privacy')"><span>Privacidad</span><b>›</b></button>
            <button onclick="openInfoTopic('support')"><span>Apoyar el proyecto</span><b>›</b></button>
          </div>
        `}
      </section>

      ${UI.bottomNav({ active: "info" })}
    </main>
  `;
}

function renderLive() {
  app.innerHTML = `
    <main class="app-shell gallery-shell">
      ${UI.header({
        title: "Galería",
        back: "home"
      })}
      <section class="live-page">
        <div class="gallery-switch">
  <button
  class="gallery-switch-button active"
  onclick="showGalleryMode('live')"
>
  🕒 Recientes
</button>
  <button
    class="gallery-switch-button"
    onclick="showGalleryMode('sections')"
  >
    📂 Secciones
  </button>
</div>
<div id="galleryBody">
  <div class="live-heading">
    <h2>Recientes</h2>
    <p>Últimos recuerdos compartidos</p>
  </div>
  <div id="liveContent" class="live-content">
    Cargando recuerdos...
  </div>
</div>
      </section>
      ${UI.bottomNav({
        active: "live"
      })}
    </main>
  `;
  loadGalleryItems(
  `${UPLOAD_ENDPOINT}?action=live`
);
}

function renderMine() {
  app.innerHTML = `
    <main class="app-shell gallery-shell">

      ${UI.header({
        title: "Mis Subidas",
        back: "home"
      })}

      <section class="live-page">

        <div class="live-heading">
          <h2>Mis recuerdos</h2>
          <p>Todas las fotos y videos que has compartido.</p>
        </div>
        <button
  id="mineSelectButton"
  class="mine-select-button"
  onclick="toggleMineSelectionMode()"
>
  Seleccionar para borrar
</button>

  <div id="mineContent">
     Cargando recuerdos...
  </div>
  <div
    id="mineDeleteBar"
    class="mine-delete-bar"
    style="display:none;"
>
  <button
    class="mine-delete-button"
    onclick="deleteSelectedMineItems()"
  >
    Eliminar (0)
  </button>
</div>
      </section>
 
      ${UI.bottomNav({
        active: "mine"
      })}

    </main>
  `;

  loadMineGrouped();
}
async function loadMineGrouped() {
  const container = document.getElementById("mineContent");

  try {
    const identity = requireGoogleIdentity();
    const params = new URLSearchParams({
      action: "mine",
      googleUserId: identity.googleUserId,
      guestGoogleId: identity.guestGoogleId,
      uploaderEmail: identity.uploaderEmail,
      _: String(Date.now())
    });

    const response = await fetch(`${UPLOAD_ENDPOINT}?${params.toString()}`);

    const result = await response.json();

    if (!result.success) {
      throw new Error("No fue posible cargar Mis Subidas.");
    }

    const items = result.items || [];
    liveItems = items;

    if (!items.length) {
      container.innerHTML = `
        <div class="live-empty">
          Aún no has compartido recuerdos.
        </div>
      `;
      return;
    }

    const sectionsWithItems = AppState.event.sections
      .map(section => ({
        ...section,
        items: items.filter(item => item.sectionId === section.id)
      }))
      .filter(section => section.items.length > 0);

    container.innerHTML = sectionsWithItems
      .map(section => `
        <section class="mine-section-group">
          <h3 class="mine-section-title">
            ${section.icon}
            ${section.id === "general" ? "General" : section.name}
          </h3>

          <div class="mine-section-grid">
            ${section.items.map(item => {
              const itemIndex = items.findIndex(
                currentItem => currentItem.fileId === item.fileId
              );

              return `
                <div class="mine-thumbnail-wrapper">
  <button
    class="mine-thumbnail"
    onclick="toggleMineSelection(event, '${item.fileId}', ${itemIndex})"
    aria-label="Abrir recuerdo"
  >
                  <img
                    src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w800"
                    alt=""
                    loading="lazy"
                    data-file-id="${item.fileId}"
                    data-is-video="${item.mimeType.startsWith("video/") ? "true" : "false"}"
                    onerror="handleDriveThumbnailError(this)"
                  >
   
                  ${item.mimeType.startsWith("video/")
                    ? `<span class="live-play-icon">▶</span>`
                    : ""
                  }
                </button>
               ${mineSelectionMode ? `
    <div class="mine-checkbox">
    <input
      id="mineCheckbox-${item.fileId}"
      type="checkbox"
      ${selectedMineItems.has(item.fileId) ? "checked" : ""}
      onclick="event.stopPropagation(); toggleMineSelection(event, '${item.fileId}', ${itemIndex})"
    >
  </div>
` : ""}
</div>
              `;
            }).join("")}
          </div>
        </section>
      `)
      .join("");

    updateMineDeleteBar();

    refreshPendingVideoThumbnails(container);

  } catch (error) {
    container.innerHTML = `
      <div class="live-error">
        ${error.message || "Error al cargar Mis Subidas."}
      </div>
    `;

    console.error(error);
  }
}
function showGalleryMode(mode) {
  const buttons = document.querySelectorAll(
    ".gallery-switch-button"
  );

  buttons.forEach(button => {
    button.classList.remove("active");
  });

  const galleryBody = document.getElementById("galleryBody");

  if (mode === "live") {
    buttons[0].classList.add("active");

    galleryBody.innerHTML = `
      <div class="live-heading">
        <h2>Recientes</h2>
        <p>Últimos recuerdos compartidos</p>
      </div>

      <div id="liveContent" class="live-content">
        Cargando recuerdos...
      </div>
    `;

    loadGalleryItems(
  `${UPLOAD_ENDPOINT}?action=live`
);
    return;
  }

  buttons[1].classList.add("active");

  galleryBody.innerHTML = `
  <div class="gallery-sections-heading">
    <h2>Explorar por sección</h2>
    <p>Elige una parte del evento para ver sus recuerdos.</p>
  </div>

  <div
    id="gallerySectionsList"
    class="gallery-sections-list"
  >
    Cargando secciones...
  </div>
`;

loadGallerySections();
}

async function loadGallerySections() {
  const container = document.getElementById(
    "gallerySectionsList"
  );

  try {
    const response = await fetch(
      `${UPLOAD_ENDPOINT}?action=sections`
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        "No fue posible cargar las secciones."
      );
    }

    container.innerHTML = result.sections
      .map(section => `
        <button
          class="gallery-section-card"
          onclick="openGallerySection('${section.id}')"
        >
          <div class="gallery-section-cover">
            ${
              section.coverFileId
                ? `
                  <img
                    src="https://drive.google.com/thumbnail?id=${section.coverFileId}&sz=w800"
                    alt=""
                    loading="lazy"
                  >
                `
                : `
                  <div class="gallery-section-placeholder">
                    ${section.icon}
                  </div>
                `
            }
          </div>

          <div class="gallery-section-info">
            <div class="gallery-section-title">

  <img
    class="gallery-section-icon"
    src="assets/images/sections/${section.id}.svg"
    alt=""
  >

  <span>
    ${section.id === "general"
      ? "General"
      : section.name}
  </span>

</div>

            <div class="gallery-section-count">
              ${section.count}
              ${section.count === 1
                ? "recuerdo"
                : "recuerdos"}
            </div>
          </div>
        </button>
      `)
      .join("");

    refreshPendingVideoThumbnails(container);

  } catch (error) {
    container.innerHTML = `
      <div class="live-error">
        Error al cargar las secciones.
      </div>
    `;

    console.error(error);
  }
}
function openGallerySection(sectionId) {

  const galleryBody = document.getElementById("galleryBody");

  galleryBody.innerHTML = `
    <div class="live-heading">
  <h2>${getSectionName(sectionId)}</h2>
  <p>Recuerdos de esta sección</p>
</div>

    <div id="liveContent" class="live-content">
      Cargando...
    </div>
  `;

    loadGalleryItems(
    `${UPLOAD_ENDPOINT}?action=section&sectionId=${sectionId}`,
    false
  );

}

async function loadGalleryItems(url, showInfo = true) {

  const container = document.getElementById("liveContent");

  container.textContent = "Cargando recuerdos...";

  try {

    const response = await fetch(url);

    const result = await response.json();

    if (!result.success) {
      throw new Error("No fue posible obtener la galería.");
    }

    if (!result.items.length) {

      container.innerHTML = `
        <div class="live-empty">
          Aún no hay recuerdos compartidos.
        </div>
      `;

      return;

    }
    liveItems = result.items;
    const items = result.items || [];

container.innerHTML = items
  .map((item, index) => `
    <article
      class="live-card"
      onclick="openViewer(${index})"
    >

      <div class="live-media">

        <img
          class="live-thumbnail"
          src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w800"
          alt=""
          loading="lazy"
          data-file-id="${item.fileId}"
          data-is-video="${item.mimeType.startsWith("video/") ? "true" : "false"}"
          onerror="handleDriveThumbnailError(this)"
        >

        ${item.mimeType.startsWith("video/")
          ? `<div class="live-play-icon">▶</div>`
          : ""
        }

      </div>

            ${showInfo ? `
  <div class="live-card-info">
    <div class="live-time">
      ${formatRelativeTime(item.uploadedAt)}
    </div>
  </div>
` : ""}
    </article>
  `)
  .join("");

  } catch (error) {

    container.innerHTML = `
      <div class="live-error">
        Error al cargar la galería.
      </div>
    `;

    console.error(error);

  }

}
function getSectionName(sectionId) {

  const section = AppState.event.sections.find(
    s => s.id === sectionId
  );

  return section
    ? `${section.icon} ${section.name}`
    : sectionId;

}

function formatRelativeTime(dateString) {

  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );

  if (seconds < 60) return "Hace unos segundos";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);

  if (days === 1) return "Ayer";

  return new Date(dateString).toLocaleDateString();
}

function updateMineDeleteBar() {
  const deleteBar = document.getElementById("mineDeleteBar");
  const deleteButton = deleteBar?.querySelector(".mine-delete-button");

  if (!deleteBar || !deleteButton) {
    return;
  }

  const selectedCount = selectedMineItems.size;

  deleteBar.style.display =
    mineSelectionMode && selectedCount > 0
      ? "block"
      : "none";

  deleteButton.textContent = `Eliminar (${selectedCount})`;
}

function toggleMineSelection(event, fileId, itemIndex) {
  event.stopPropagation();

  if (!mineSelectionMode) {
    openViewer(itemIndex);
    return;
  }

  if (selectedMineItems.has(fileId)) {
    selectedMineItems.delete(fileId);
  } else {
    selectedMineItems.add(fileId);
  }

  const checkbox = document.getElementById(
    `mineCheckbox-${fileId}`
  );

  if (checkbox) {
    checkbox.checked = selectedMineItems.has(fileId);
  }

  updateMineDeleteBar();
}

async function toggleMineSelectionMode() {
  mineSelectionMode = !mineSelectionMode;
  selectedMineItems.clear();

  const button = document.getElementById("mineSelectButton");

  if (button) {
    button.textContent = mineSelectionMode
      ? "Cancelar"
      : "Seleccionar para borrar";
  }

  await loadMineGrouped();
  updateMineDeleteBar();
}

async function deleteSelectedMineItems() {
  const fileIds = [...selectedMineItems];

  if (!fileIds.length) {
    return;
  }

  const confirmed = window.confirm(
    fileIds.length === 1
      ? "¿Eliminar este recuerdo? Esta acción no se puede deshacer."
      : `¿Eliminar los ${fileIds.length} recuerdos seleccionados? Esta acción no se puede deshacer.`
  );

  if (!confirmed) {
    return;
  }

  const deleteButton = document.querySelector(
    ".mine-delete-button"
  );

  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.textContent = "Eliminando...";
  }

  try {
    for (const fileId of fileIds) {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          fileId,
          ...requireGoogleIdentity()
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || "No fue posible eliminar uno de los archivos."
        );
      }
    }

    selectedMineItems.clear();
    mineSelectionMode = false;

    const selectButton = document.getElementById(
      "mineSelectButton"
    );

    if (selectButton) {
      selectButton.textContent = "Seleccionar para borrar";
    }

    renderMine();

  } catch (error) {
    console.error(error);
    window.alert(
      error.message || "No fue posible completar la eliminación."
    );

    if (deleteButton) {
      deleteButton.disabled = false;
    }

    updateMineDeleteBar();
  }
}

function createViewerMedia(item) {
  if (item.mimeType.startsWith("video/")) {
    return `
      <iframe
        class="media-viewer-video"
        src="https://drive.google.com/file/d/${item.fileId}/preview"
        allow="autoplay; fullscreen"
        allowfullscreen
      ></iframe>
    `;
  }

  return `
    <img
      class="media-viewer-image"
      src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w1600"
      alt=""
    >
  `;
}

function openViewer(index) {
  currentViewerIndex = index;

  const item = liveItems[currentViewerIndex];

  const viewer = document.createElement("div");

  viewer.className = "media-viewer";

  const mediaContent = createViewerMedia(item);

  viewer.innerHTML = `
    <button
      class="media-viewer-close"
      onclick="closeViewer()"
      aria-label="Cerrar visor"
    >
      ×
    </button>

    <button
      class="media-viewer-arrow media-viewer-prev"
      onclick="showPreviousItem()"
      aria-label="Anterior"
    >
      ‹
    </button>

    ${mediaContent}

    <button
      class="media-viewer-arrow media-viewer-next"
      onclick="showNextItem()"
      aria-label="Siguiente"
    >
      ›
    </button>
  `;

  document.body.appendChild(viewer);
}

function showPreviousItem() {
  currentViewerIndex =
    (currentViewerIndex - 1 + liveItems.length) % liveItems.length;

  updateViewerMedia();
}

function showNextItem() {
  currentViewerIndex =
    (currentViewerIndex + 1) % liveItems.length;

  updateViewerMedia();
}

function updateViewerMedia() {
  const item = liveItems[currentViewerIndex];
  const currentMedia = document.querySelector(
    ".media-viewer-image, .media-viewer-video"
  );

  if (!currentMedia) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = createViewerMedia(item).trim();

  currentMedia.replaceWith(wrapper.firstElementChild);
}

function closeViewer() {
  const viewer = document.querySelector(".media-viewer");

  if (viewer) {
    viewer.remove();
  }

  currentViewerIndex = -1;
}

function renderSections() {
  app.innerHTML = `
    <main class="app-shell white-shell">

      ${UI.header({
        title: "¿Dónde quieres compartir?",
        back: "home"
      })}

      <section class="sections-intro">
        <p>
          Selecciona la sección donde deseas subir tus fotos o videos.
          Usa General si no corresponde a ninguna.
        </p>
      </section>

      <section class="sections-grid">
        ${AppState.event.sections.map(section =>
          UI.sectionCard({ section })
        ).join("")}
      </section>

      ${UI.bottomNav({
        active: "upload"
      })}

    </main>
  `;
}
function renderUpload() {
  const selectedSection = AppState.upload.section;
  const previews = AppState.upload.files;

  if (AppState.upload.status === "preparing") {
    app.innerHTML = `
      <main class="app-shell white-shell">
        ${UI.header({
          title: "Preparando archivos",
          back: false
        })}

        <section class="upload-page">
          <div class="upload-placeholder">
            <div class="upload-progress-panel">
              <div class="upload-progress-bar"></div>
              <div class="upload-progress-text">
                Preparando la selección.<br><br>
                Los videos grandes pueden tardar unos segundos.
              </div>
            </div>
          </div>
        </section>

        ${UI.bottomNav({
          active: "upload"
        })}
      </main>
    `;
    return;
  }

  if (AppState.upload.status === "uploading") {
    app.innerHTML = `
      <main class="app-shell white-shell">
        ${UI.header({
          title: "Subiendo archivos",
          back: false
        })}

        ${UI.stepper({
          current: 2
        })}

        <section class="upload-page">
          <div class="upload-placeholder">

            <div class="upload-progress-panel">
              <div class="upload-progress-bar"></div>

              <div class="upload-progress-text">
                ⏳ Subiendo<br><br>

                <strong>${AppState.upload.currentFileName}</strong><br><br>

                ${AppState.upload.current + 1}
                de
                ${AppState.upload.total}
                archivos
              </div>
            </div>

          </div>
        </section>

        ${UI.bottomNav({
          active: "upload"
        })}
      </main>
    `;

    return;
  }
  if (AppState.upload.status === "done") {
    app.innerHTML = `
      <main class="app-shell white-shell">
        ${UI.header({
          title: "Archivos enviados",
          back: false
        })}

        ${UI.stepper({
          current: 3
        })}

        <section class="upload-page">
          <div class="upload-placeholder">
            <h2>¡Gracias!</h2>

            <p>
              Tus archivos fueron enviados correctamente.
            </p>

            <p>
              Si compartiste videos, Google Drive puede tardar algunos minutos
              en generar la miniatura y habilitar su reproducción.
            </p>

            ${UI.button({
              text: "Subir más archivos",
              variant: "primary",
              onClick: "resetUpload()"
            })}
          </div>
        </section>

        ${UI.bottomNav({
          active: "upload"
        })}
      </main>
    `;

    return;
  }
  app.innerHTML = `
    <main class="app-shell white-shell">
      ${UI.header({
        title: "Subir archivos",
        back: "sections"
      })}

      ${UI.stepper({
        current: 1
      })}
       <div class="upload-section-name">
  ${selectedSection
    ? `📁 ${selectedSection.id === "general"
        ? "General"
        : selectedSection.name}`
    : "Primero selecciona una sección"}
</div>
      <section class="upload-page">
        <div class="upload-placeholder">
          <div class="upload-grid">
            ${previews.map((file, index) =>
              UI.galleryThumb({
                image: file.type.startsWith("video/")
                  ? getVideoPlaceholderDataUrl()
                  : URL.createObjectURL(file),
                removable: true,
                onRemove: `removeSelectedFile(${index})`
              })
            ).join("")}

            ${`
              <button
                class="upload-thumb upload-thumb-add"
                onclick="document.getElementById('uploadFilePicker').click()"
                aria-label="Agregar más archivos"
              >
                +
              </button>
            `}
          </div>

          <p class="upload-counter">
            ${previews.length} ${previews.length === 1 ? "archivo seleccionado" : "archivos seleccionados"}
          </p>

         

${AppState.upload.status === "uploading" ? `
  <div class="upload-progress-panel">

 <div class="upload-progress-bar"></div>

<div class="upload-progress-text">
  ⏳ Subiendo<br><br>

  <strong>${AppState.upload.currentFileName}</strong><br><br>

  ${AppState.upload.current + 1}
  de
  ${AppState.upload.total}
  archivos
</div>

  </div>
` : ""}

          ${UI.filePicker({
            id: "uploadFilePicker",
            onChange: "handleFilesSelected(event)"
          })}

          ${previews.length === 0 ? UI.button({
            text: "Seleccionar archivos",
            variant: "primary",
            onClick: "document.getElementById('uploadFilePicker').click()"
          }) : ""}
        </div>
      </section>

      ${UI.bottomNav({
        active: "upload"
      })}
    </main>
  `;
}

function selectSection(sectionId) {
  const selectedSection = AppState.event.sections.find(
    section => section.id === sectionId
  );

  resetUploadState();
  AppState.upload.section = selectedSection;
  goTo("upload");
}
async function handleFilesSelected(event) {
  const input = event.target;
  const files = Array.from(input.files);

  if (!files.length) {
    input.value = "";
    return;
  }

  AppState.upload.status = "preparing";
  renderApp();

  await new Promise(resolve =>
    requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    )
  );

  const uniqueNewFiles = files.filter(newFile =>
    !AppState.upload.files.some(existingFile =>
      existingFile.name === newFile.name &&
      existingFile.size === newFile.size &&
      existingFile.lastModified === newFile.lastModified
    )
  );

  AppState.upload.files = [
    ...AppState.upload.files,
    ...uniqueNewFiles
  ];

  AppState.upload.status = "idle";
  input.value = "";
  renderApp();
}
function removeSelectedFile(index) {
  AppState.upload.files.splice(index, 1);
  renderApp();
}


async function handleUploadAction() {
  if (AppState.upload.files.length === 0) {
    document.getElementById("uploadFilePicker").click();
    return;
  }

  await uploadFiles();
}
async function uploadFiles() {
  AppState.upload.status = "uploading";
  AppState.upload.current = 0;
  AppState.upload.total = AppState.upload.files.length;

  renderApp();

  try {
    for (const file of AppState.upload.files) {
      AppState.upload.currentFileName = file.name;
      renderApp();

      const result = await uploadFile(file);

      if (!result.success) {
        throw new Error(result.error || "Error al subir el archivo");
      }

      AppState.upload.current++;
      renderApp();

      console.log(result);
    }

    AppState.upload.status = "done";
    AppState.upload.files = [];

    renderApp();

  } catch (error) {
    console.error(error);

    AppState.upload.status = "error";
    AppState.upload.error = error.message;

    renderApp();
  }
}

function resetUpload() {
  resetUploadState();
  goTo("sections");
}
async function readFileAsBase64(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result.split(",")[1]);
    };

    reader.onerror = () => {
      reject(new Error(`No se pudo leer ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  const CHUNK_SIZE = 5 * 1024 * 1024;

  if (file.size > CHUNK_SIZE) {
    return await uploadFileInChunks(file);
  }

  const base64 = await readFileAsBase64(file);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64,
      sectionId: AppState.upload.section?.id || "general",
      ...requireGoogleIdentity()
    })
  });

  return await response.json();
}
async function uploadFileInChunks(file) {
  const sectionId = AppState.upload.section?.id || "general";
  const identity = requireGoogleIdentity();

  const startResponse = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "start",
      fileName: file.name,
      mimeType: file.type,
      sectionId,
      ...identity
    })
  });

  const startResult = await startResponse.json();

  if (!startResult.success || !startResult.uploadUrl) {
    throw new Error(
      startResult.error || "Drive no devolvió la URL de subida"
    );
  }

  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);
  let driveFileId = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startByte = chunkIndex * chunkSize;
    const endByte = Math.min(startByte + chunkSize, file.size);
    const chunk = file.slice(startByte, endByte);

    let chunkResponse;

    try {
      chunkResponse = await fetch(startResult.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Range":
            `bytes ${startByte}-${endByte - 1}/${file.size}`
        },
        body: chunk
      });
    } catch (error) {
      const isLastChunk = chunkIndex === totalChunks - 1;

      /*
       * Google Drive puede guardar correctamente el último bloque y aun así
       * impedir que el navegador lea la respuesta 200 por CORS. En ese caso
       * continuamos con la confirmación del Apps Script, que localiza el
       * archivo por su nombre almacenado y lo registra en Google Sheets.
       */
      if (isLastChunk && error instanceof TypeError) {
        console.warn(
          "Drive recibió el último bloque, pero el navegador bloqueó la respuesta final. Confirmando con el servidor.",
          error
        );
        break;
      }

      throw error;
    }

    if (chunkResponse.status === 308) {
      console.log(
        `Drive recibió bloque ${chunkIndex + 1} de ${totalChunks}`
      );
      continue;
    }

    if (!chunkResponse.ok) {
      const errorText = await chunkResponse.text();

      throw new Error(
        `Drive rechazó el bloque ${chunkIndex + 1}: ` +
        `${chunkResponse.status} ${errorText}`
      );
    }

    try {
      const driveFile = await chunkResponse.json();
      driveFileId = driveFile?.id || null;
    } catch (error) {
      console.warn(
        "Drive completó la subida sin devolver JSON.",
        error
      );
    }
  }

  const confirmResponse = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "confirm",
      fileId: driveFileId,
      storedFileName: startResult.storedFileName,
      fileName: file.name,
      mimeType: file.type,
      sectionId,
      ...identity
    })
  });

  const confirmResult = await confirmResponse.json();

  if (!confirmResult.success) {
    throw new Error(
      confirmResult.error || "No se pudo confirmar la subida"
    );
  }

  return {
    success: true,
    fileId: confirmResult.fileId || driveFileId,
    storedFileName:
      confirmResult.storedFileName ||
      startResult.storedFileName
  };
}

renderApp();
