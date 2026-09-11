const app = document.getElementById("app");
const UPLOAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyIDrzh6dqbdaZug7udzdXLDiFQVgt1EG83DvOaTQJxM5j5salcbEgfBoVoQ4vqFKlJ/exec";

let liveItems = [];
let selectedMineItems = new Set();
let mineSelectionMode = false;
let currentViewerIndex = -1;
let currentInfoTopic = null;
let viewerCommentsRequestToken = 0;
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
  AppState.upload.currentProgress = 0;
  AppState.upload.currentChunk = 0;
  AppState.upload.totalChunks = 0;
  AppState.upload.connection = "online";
  AppState.upload.fileStatuses = [];
  AppState.upload.error = "";
}

function getVideoPlaceholderDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f2edf2"/>
      <circle cx="300" cy="260" r="74" fill="#d94f91"/>
      <polygon points="280,220 280,300 350,260" fill="white"/>
      <text
  x="300"
  y="370"
  text-anchor="middle"
  font-family="Arial, sans-serif"
  font-size="52"
  font-weight="600"
  fill="#5a3150">

  <tspan x="300" dy="0">
    Miniatura no disponible
  </tspan>

  <tspan x="300" dy="48">
    Oprime "Subir"
  </tspan>

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
          <div class="info-feature-bullet">
            <span class="info-feature-icon">✨</span>
            <p><strong>Momentos:</strong> convierte las fotos y videos que más significan en recuerdos especiales del evento. Cada invitado puede señalar una imagen como graciosa, romántica, emotiva, de baile, de fiesta, de chisme, con Aura o simplemente especial, para que entre todos descubramos los momentos que vale la pena volver a vivir.</p>
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

let galleryContext = {
  url: "",
  showInfo: true,
  sort: "recent",
  mode: "recent"
};

const MOMENT_TYPES = [
  { id: "funny", icon: "😂", name: "Gracioso" },
  { id: "romance", icon: "❤️", name: "Romance" },
  { id: "dance", icon: "💃", name: "Baile" },
  { id: "party", icon: "🥳", name: "Fiesta" },
  { id: "emotional", icon: "🥹", name: "Emotivo" },
  { id: "gossip", icon: "🤫", name: "Chisme" },
  { id: "special", icon: "⭐", name: "Especial" },
  { id: "aura", icon: "✨", name: "Aura" }
];

let galleryTapTimer = null;
let galleryTapIndex = -1;
let galleryTapAt = 0;

function galleryTopMenu(active = "recent") {
  return `
    <div class="gallery-top-menu" aria-label="Explorar galería">
      <button class="gallery-top-button ${active === "recent" ? "active" : ""}" onclick="showGalleryMode('recent')">🕒 Reciente</button>
      <button class="gallery-top-button ${active === "trend" ? "active" : ""}" onclick="showGalleryMode('trend')">🔥 Tendencia</button>
      <button class="gallery-top-button ${active === "moments" ? "active" : ""}" onclick="showGalleryMode('moments')">✨ Momentos</button>
    </div>
  `;
}

function renderLive() {
  app.innerHTML = `
    <main class="app-shell gallery-shell">
      ${UI.header({ title: "Galería", back: "home" })}
      <section class="live-page">
        <div id="galleryBody"></div>
      </section>
      ${UI.bottomNav({ active: "live" })}
    </main>
  `;
  showGallerySections();
}

function normalizeGalleryItem(item) {
  return {
    ...item,
    likes: Number(item.likes || 0),
    views: Number(item.views || 0),
    moments: Number(item.moments || 0),
    momentTypes: Array.isArray(item.momentTypes) ? item.momentTypes : [],
    likedByMe: Boolean(item.likedByMe),
    momentByMe: Boolean(item.momentByMe),
    activityAt: item.activityAt || item.uploadedAt
  };
}

function sortGalleryItems(items, sort = "recent") {
  const normalized = items.map(normalizeGalleryItem);
  if (sort === "views" || sort === "trend") {
    return normalized.sort((a,b) => {
      const likesDiff = Number(b.likes || 0) - Number(a.likes || 0);
      if (likesDiff !== 0) return likesDiff;
      const viewsDiff = Number(b.views || 0) - Number(a.views || 0);
      return viewsDiff !== 0 ? viewsDiff : new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    });
  }
  if (sort === "moments") {
    return normalized.sort((a,b) => {
      const diff = Number(b.moments || 0) - Number(a.moments || 0);
      return diff !== 0 ? diff : new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    });
  }
  if (sort === "likes") {
    return normalized.sort((a,b) => {
      const diff = Number(b.likes || 0) - Number(a.likes || 0);
      return diff !== 0 ? diff : new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    });
  }
  return normalized.sort((a,b) => new Date(b.activityAt || b.uploadedAt || 0).getTime() - new Date(a.activityAt || a.uploadedAt || 0).getTime());
}

function renderGallerySort(sort) {
  document.querySelectorAll(".gallery-sort-button").forEach(button => {
    button.classList.toggle(
      "active",
      button.getAttribute("onclick")?.includes(`'${sort}'`)
    );
  });
}

function handleGalleryTap(event, index) {
  event.preventDefault();
  event.stopPropagation();

  const now = Date.now();
  const isDoubleTap =
    galleryTapIndex === index &&
    now - galleryTapAt < 360;

  if (isDoubleTap) {
    window.clearTimeout(galleryTapTimer);
    galleryTapTimer = null;
    galleryTapIndex = -1;
    galleryTapAt = 0;
    animateLike(index);
    toggleLike(index);
    return;
  }

  galleryTapIndex = index;
  galleryTapAt = now;
  window.clearTimeout(galleryTapTimer);
  galleryTapTimer = window.setTimeout(() => {
    galleryTapIndex = -1;
    galleryTapAt = 0;
    openViewer(index);
  }, 300);
}

function animateLike(index) {
  const card = document.querySelector(`[data-gallery-index="${index}"]`);
  if (!card) return;

  const heart = document.createElement("div");
  heart.className = "like-heart-animation";
  heart.textContent = "♥";
  card.querySelector(".live-media")?.appendChild(heart);
  window.setTimeout(() => heart.remove(), 850);
}

function updateLikeIndicators() {
  document.querySelectorAll("[data-gallery-index]").forEach(card => {
    const index = Number(card.dataset.galleryIndex);
    const item = liveItems[index];
    if (!item) return;

    const count = card.querySelector(".live-like-count");
    if (count) count.textContent = `❤️ ${Number(item.likes || 0)}`;

    card.classList.toggle("liked-by-me", Boolean(item.likedByMe));
  });
}

async function toggleLike(index) {
  const item = liveItems[index];
  if (!item?.uuid) {
    console.warn("Este recuerdo no tiene uuid; no se puede registrar el Like.");
    return;
  }

  let identity;
  try {
    identity = requireGoogleIdentity();
  } catch (error) {
    return;
  }

  try {
    const response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        action: "like",
        uuid: item.uuid,
        ...identity
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "No fue posible registrar el Like.");
    }

    item.likes = Number(result.likes ?? item.likes ?? 0);
    item.likedByMe = Boolean(result.likedByMe ?? result.liked);
    if (item.likedByMe) item.activityAt = new Date().toISOString();
    updateViewerLikeCount();

    if (galleryContext.sort === "likes") {
      liveItems = sortGalleryItems(liveItems, "likes");
      renderGalleryItems(liveItems, galleryContext.showInfo);
    } else if (galleryContext.mode === "recent") {
      liveItems = sortGalleryItems(liveItems, "recent");
      renderGalleryItems(liveItems, galleryContext.showInfo);
    } else {
      updateLikeIndicators();
    }
  } catch (error) {
    console.error("Like:", error);
    window.alert(error.message || "No fue posible registrar el Like.");
  }
}

function formatCommentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadViewerComments(uuid) {
  const container = document.getElementById("viewerCommentsList");
  if (!container || !uuid) return;

  const token = ++viewerCommentsRequestToken;
  container.innerHTML = `<div class="viewer-comments-loading">Cargando comentarios…</div>`;

  try {
    const response = await fetch(
      `${UPLOAD_ENDPOINT}?action=comments&uuid=${encodeURIComponent(uuid)}`
    );
    const result = await response.json();

    if (token !== viewerCommentsRequestToken) return;
    if (!result.success) throw new Error(result.error || "No fue posible cargar los comentarios.");

    const comments = Array.isArray(result.comments) ? result.comments : [];
    container.innerHTML = comments.length
      ? comments.map(comment => `
          <div class="viewer-comment">
            <div class="viewer-comment-avatar">${escapeHtml((comment.guestName || "I").trim().charAt(0).toUpperCase())}</div>
            <div class="viewer-comment-body">
              <div class="viewer-comment-meta">
                <strong>${escapeHtml(comment.guestName || "Invitado")}</strong>
                <span>${escapeHtml(formatCommentDate(comment.commentedAt))}</span>
              </div>
              <div class="viewer-comment-text" id="viewer-comment-text-${comment.rowNumber}">${escapeHtml(comment.comment)}</div>
              ${comment.guestGoogleId === String(AppState?.security?.user?.id || "") ? `
                <button type="button" class="viewer-comment-edit-button" onclick="beginEditViewerComment(${comment.rowNumber})">Editar</button>
              ` : ""}
            </div>
          </div>
        `).join("")
      : `<div class="viewer-comments-empty">Sé el primero en comentar este recuerdo. 💬</div>`;

    updateViewerCommentCount(comments.length);
  } catch (error) {
    console.error("Comentarios:", error);
    if (token === viewerCommentsRequestToken) {
      container.innerHTML = `<div class="viewer-comments-empty">No fue posible cargar los comentarios.</div>`;
    }
  }
}

function updateViewerCommentCount(count) {
  const value = Number(count || 0);
  const element = document.querySelector(".media-viewer-comment-count");
  if (element) element.textContent = `💬 ${value}`;
  const title = document.getElementById("viewerCommentsTitleCount");
  if (title) title.textContent = `💬 ${value}`;
}

async function beginEditViewerComment(rowNumber) {
  const text = document.getElementById(`viewer-comment-text-${rowNumber}`);
  if (!text) return;
  const current = text.textContent || "";
  text.innerHTML = `
    <textarea class="viewer-comment-edit-input" maxlength="500">${escapeHtml(current)}</textarea>
    <div class="viewer-comment-edit-actions">
      <button type="button" onclick="saveEditedViewerComment(${rowNumber})">Guardar</button>
      <button type="button" onclick="loadViewerComments(liveItems[currentViewerIndex]?.uuid)">Cancelar</button>
    </div>
  `;
  text.querySelector("textarea")?.focus();
}

async function saveEditedViewerComment(rowNumber) {
  const text = document.getElementById(`viewer-comment-text-${rowNumber}`);
  const input = text?.querySelector("textarea");
  const comment = String(input?.value || "").trim();
  const item = liveItems[currentViewerIndex];
  if (!item?.uuid || !comment) return;
  if (comment.length > 500) return window.alert("El comentario puede tener máximo 500 caracteres.");
  let identity;
  try { identity = requireGoogleIdentity(); } catch (error) { return; }
  try {
    const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: JSON.stringify({ action: "editComment", uuid: item.uuid, rowNumber, comment, ...identity }) });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "No fue posible editar el comentario.");
    item.comments = Number(result.comments ?? item.comments ?? 0);
    item.activityAt = result.commentedAt || new Date().toISOString();
    await loadViewerComments(item.uuid);
  } catch (error) {
    console.error("Editar comentario:", error);
    window.alert(error.message || "No fue posible editar el comentario.");
  }
}

async function submitViewerComment(event) {
  event.preventDefault();
  const input = document.getElementById("viewerCommentInput");
  const button = document.getElementById("viewerCommentSubmit");
  const item = liveItems[currentViewerIndex];
  const comment = String(input?.value || "").trim();

  if (!item?.uuid || !comment) return;
  if (comment.length > 500) {
    window.alert("El comentario puede tener máximo 500 caracteres.");
    return;
  }

  let identity;
  try {
    identity = requireGoogleIdentity();
  } catch (error) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Enviando…";
  }

  try {
    const response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        action: "comment",
        uuid: item.uuid,
        comment,
        ...identity
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "No fue posible publicar el comentario.");
    }

    if (input) input.value = "";
    item.comments = Number(result.comments ?? item.comments ?? 0);
    item.activityAt = new Date().toISOString();
    updateViewerCommentCount(item.comments);
    await loadViewerComments(item.uuid);
  } catch (error) {
    console.error("Comentario:", error);
    window.alert(error.message || "No fue posible publicar el comentario.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Enviar";
    }
  }
}

function renderGalleryItems(items, showInfo = true) {
  const container = document.getElementById("liveContent");
  if (!container) return;

  container.innerHTML = items.map((item) => {
    const index = liveItems.findIndex(entry => entry.uuid === item.uuid);
    let bottomInfo = "";
    if (galleryContext.mode === "trend") {
      bottomInfo = `<div class="live-card-metrics"><span>👀 Vistas ${Number(item.views || 0)}</span></div>`;
    } else if (galleryContext.mode === "moments") {
      const icons = (item.momentTypes || []).map(typeId => {
        const type = MOMENT_TYPES.find(t => t.id === typeId);
        return type ? type.icon : "";
      }).filter(Boolean).join(" ");
      bottomInfo = `<div class="live-card-metrics"><span>✨ ${Number(item.moments || 0)}</span>${icons ? `<span>${icons}</span>` : ""}</div>`;
    } else {
      bottomInfo = showInfo ? `<div class="live-card-info"><div class="live-time">${formatRelativeTime(item.uploadedAt)}</div></div>` : "";
    }

    return `
      <article class="live-card ${item.likedByMe ? "liked-by-me" : ""}" data-gallery-index="${index}" onclick="handleGalleryTap(event, ${index})">
        <div class="live-media">
          <img class="live-thumbnail" src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w800" alt="" loading="lazy" data-file-id="${item.fileId}" data-is-video="${item.mimeType.startsWith("video/") ? "true" : "false"}" onerror="handleDriveThumbnailError(this)">
          ${item.mimeType.startsWith("video/") ? `<div class="live-play-icon">▶</div>` : ""}
          <div class="live-social-actions" aria-label="Acciones del recuerdo">
            <button type="button" class="live-action ${item.likedByMe ? "liked" : ""}" onclick="handleCardLike(event, ${index})" oncontextmenu="handleCardLikeList(event, ${index})" title="Dar Like">❤️ <span>${Number(item.likes || 0)}</span></button>
            <button type="button" class="live-action" onclick="handleCardComment(event, ${index})" title="Comentar">💬 <span>${Number(item.comments || 0)}</span></button>
            <button type="button" class="live-action ${item.momentByMe ? "moment-marked" : ""}" onclick="handleCardMoment(event, ${index})" title="Momento">✨ <span>${Number(item.moments || 0)}</span></button>
          </div>
        </div>
        ${bottomInfo}
      </article>
    `;
  }).join("");
  refreshPendingVideoThumbnails(container);
}

function handleCardLike(event, index) {
  event.preventDefault(); event.stopPropagation();
  toggleLike(index);
}

function handleCardComment(event, index) {
  event.preventDefault(); event.stopPropagation();
  openViewer(index);
  setTimeout(() => document.getElementById("viewerCommentInput")?.focus(), 250);
}

function handleCardMoment(event, index) {
  event.preventDefault(); event.stopPropagation();
  openViewer(index, "moments");
}

function getMomentEntriesHtml(item) {
  const entries = Array.isArray(item?.momentEntries) ? item.momentEntries : [];
  if (!entries.length) return `<div class="viewer-moments-empty">Aún nadie ha marcado este recuerdo como Momento.</div>`;
  return entries.map(entry => {
    const type = MOMENT_TYPES.find(t => t.id === entry.momentType);
    return `<div class="viewer-moment-entry"><span class="viewer-moment-entry-icon">${type?.icon || "✨"}</span><div><strong>${escapeHtml(entry.guestName || "Invitado")}</strong><span>${escapeHtml(type?.name || entry.momentType || "Momento")}</span></div></div>`;
  }).join("");
}

function openMomentPicker(index) {
  const item = liveItems[index];
  if (!item?.uuid) return;
  openViewer(index, "moments");
}

async function addMoment(typeId, index) {
  const item = liveItems[index];
  const type = MOMENT_TYPES.find(t => t.id === typeId);
  if (!item?.uuid || !type) return;
  let identity;
  try { identity = requireGoogleIdentity(); } catch (error) { return; }
  try {
    const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: JSON.stringify({ action: "moment", uuid: item.uuid, momentType: typeId, ...identity }) });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "No fue posible guardar el momento.");
    item.moments = Number(result.moments || 0);
    item.momentByMe = Boolean(result.momentByMe);
    item.momentTypes = result.momentTypes || [];
    item.momentEntries = result.momentEntries || [];
    item.activityAt = result.activityAt || item.activityAt;
    renderViewerMoments(item);
    renderGalleryItems(liveItems, galleryContext.showInfo);
  } catch (error) {
    console.error("Momento:", error);
    window.alert(error.message || "No fue posible guardar el momento.");
  }
}

function renderViewerMoments(item) {
  const panel = document.getElementById("viewerMomentsPanel");
  if (!panel) return;
  const myType = (item.momentEntries || []).find(entry => entry.guestGoogleId === AppState?.security?.user?.id)?.momentType || "";
  panel.innerHTML = `
    <div class="viewer-moments-header"><strong>✨ Momentos</strong><span>✨ ${Number(item.moments || 0)}</span><button type="button" onclick="closeViewerMoments()" aria-label="Cerrar momentos">×</button></div>
    <div class="viewer-moment-picker-row">
      ${MOMENT_TYPES.map(type => `<button type="button" class="${myType === type.id ? "selected" : ""}" onclick="addMoment('${type.id}', ${currentViewerIndex})">${type.icon}<span>${type.name}</span></button>`).join("")}
    </div>
    <div class="viewer-moments-list">${getMomentEntriesHtml(item)}</div>
  `;
}

function closeViewerMoments() {
  document.getElementById("viewerMomentsPanel")?.classList.remove("open");
}

function setGalleryHeaderBack(action) {
  const backButton = document.querySelector(".gallery-shell .icon-back");
  if (backButton) backButton.setAttribute("onclick", action);
}

function showGalleryMode(mode) {
  setGalleryHeaderBack("showGallerySections()");
  const galleryBody = document.getElementById("galleryBody");
  if (!galleryBody) return;

  document.querySelectorAll(".gallery-top-button").forEach(button => button.classList.remove("active"));
  const activeButton = document.querySelector(`.gallery-top-button[onclick="showGalleryMode('${mode}')"]`);
  activeButton?.classList.add("active");

  if (mode === "trend") {
    galleryBody.innerHTML = `
      <div class="live-heading">
        <h2>🔥 Tendencia</h2>
        <p>Los recuerdos que más se están viendo.</p>
      </div>
      <div id="liveContent" class="live-content">Cargando tendencia...</div>
    `;
    loadGalleryItems(`${UPLOAD_ENDPOINT}?action=live`, true, "trend", "trend");
    return;
  }

  if (mode === "moments") {
    galleryBody.innerHTML = `
      <div class="live-heading">
        <h2>✨ Momentos</h2>
        <p>Recuerdos que alguien marcó como un momento especial.</p>
      </div>
      <div class="moment-filter-control">
        <button type="button" class="moment-filter-select" onclick="toggleMomentFilterMenu(event)">✨ Filtrar Momentos <span id="momentFilterLabel">Todos</span> ▾</button>
        <div id="momentFilterMenu" class="moment-filter-menu" hidden>
          <button type="button" class="active" onclick="filterMomentType('')">Todos</button>
          ${MOMENT_TYPES.map(type => `<button type="button" onclick="filterMomentType('${type.id}')">${type.icon} ${type.name}</button>`).join("")}
        </div>
      </div>
      <div id="liveContent" class="live-content">Cargando momentos...</div>
    `;
    loadGalleryItems(`${UPLOAD_ENDPOINT}?action=moments`, true, "moments", "moments");
    return;
  }

  galleryBody.innerHTML = `
    <div class="live-heading">
      <h2>Reciente</h2>
      <p>Los recuerdos con actividad más reciente.</p>
    </div>
    <button class="gallery-sections-link" onclick="showGallerySections()">📂 Explorar por sección</button>
    <div id="liveContent" class="live-content">Cargando recuerdos...</div>
  `;
  loadGalleryItems(`${UPLOAD_ENDPOINT}?action=live`, true, "recent", "recent");
}

function showGallerySections() {
  setGalleryHeaderBack("goTo('home')");
  const galleryBody = document.getElementById("galleryBody");
  if (!galleryBody) return;
  galleryBody.innerHTML = `
    <div class="gallery-sections-heading">
      <h2>Explorar Galería</h2>
      <p>Elige una sección del evento para ver sus recuerdos.</p>
    </div>
    <div class="gallery-secondary-modes gallery-main-modes" aria-label="Formas de explorar">
      <button type="button" onclick="showGalleryMode('recent')">Reciente</button>
      <button type="button" onclick="showGalleryMode('trend')">🔥 Tendencia</button>
      <button type="button" onclick="showGalleryMode('moments')">✨ Momentos</button>
    </div>
    <div id="gallerySectionsList" class="gallery-sections-list">Cargando secciones...</div>
  `;
  loadGallerySections();
}

function setGallerySort(sort) {
  if (sort === "views") { showGalleryMode("trend"); return; }
  galleryContext.sort = sort;
  if (galleryContext.url) loadGalleryItems(galleryContext.url, galleryContext.showInfo, sort, galleryContext.mode);
}

function toggleMomentFilterMenu(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const menu = document.getElementById("momentFilterMenu");
  if (menu) menu.hidden = !menu.hidden;
}

function filterMomentType(typeId) {
  const type = MOMENT_TYPES.find(t => t.id === typeId);
  const label = document.getElementById("momentFilterLabel");
  if (label) label.textContent = type ? `${type.icon} ${type.name}` : "Todos";
  document.querySelectorAll("#momentFilterMenu button").forEach(button => button.classList.remove("active"));
  const active = Array.from(document.querySelectorAll("#momentFilterMenu button")).find(button => (button.textContent || "").trim() === (type ? `${type.icon} ${type.name}` : "Todos"));
  active?.classList.add("active");
  const menu = document.getElementById("momentFilterMenu");
  if (menu) menu.hidden = true;
  const container = document.getElementById("liveContent");
  if (!container) return;
  const filtered = typeId ? liveItems.filter(item => (item.momentTypes || []).includes(typeId)) : liveItems;
  renderGalleryItems(filtered, true);
}

async function loadGallerySections() {
  const container = document.getElementById("gallerySectionsList");

  try {
    const response = await fetch(`${UPLOAD_ENDPOINT}?action=sections`);
    const result = await response.json();

    if (!result.success) throw new Error("No fue posible cargar las secciones.");

    container.innerHTML = result.sections.map(section => `
      <button
        class="gallery-section-card"
        onclick="openGallerySection('${section.id}')"
      >
        <div class="gallery-section-cover">
          ${section.coverFileId
            ? `<img src="https://drive.google.com/thumbnail?id=${section.coverFileId}&sz=w800" alt="" loading="lazy">`
            : `<div class="gallery-section-placeholder">${section.icon}</div>`
          }
        </div>
        <div class="gallery-section-info">
          <div class="gallery-section-title">
            <img class="gallery-section-icon" src="assets/images/sections/${section.id}.svg" alt="">
            <span>${section.id === "general" ? "General" : section.name}</span>
          </div>
          <div class="gallery-section-count">
            ${section.count} ${section.count === 1 ? "recuerdo" : "recuerdos"}
          </div>
        </div>
      </button>
    `).join("");

    refreshPendingVideoThumbnails(container);
  } catch (error) {
    container.innerHTML = `<div class="live-error">Error al cargar las secciones.</div>`;
    console.error(error);
  }
}

function openGallerySection(sectionId) {
  setGalleryHeaderBack("showGallerySections()");
  const galleryBody = document.getElementById("galleryBody");
  galleryBody.innerHTML = `
    <div class="live-heading">
      <h2>${getSectionName(sectionId)}</h2>
      <p>Recuerdos de esta sección.</p>
    </div>
    <div id="liveContent" class="live-content">Cargando...</div>
  `;
  loadGalleryItems(`${UPLOAD_ENDPOINT}?action=section&sectionId=${encodeURIComponent(sectionId)}`, false, "recent", "section");
}

async function loadGalleryItems(url, showInfo = true, sort = "recent", mode = "recent") {
  const container = document.getElementById("liveContent");
  if (!container) return;

  container.textContent = "Cargando recuerdos...";
  galleryContext = { url, showInfo, sort, mode };

  try {
    const separator = url.includes("?") ? "&" : "?";
    const optionalIdentity = AppState?.security?.user?.id
      ? `&guestGoogleId=${encodeURIComponent(String(AppState.security.user.id))}`
      : "";
    const response = await fetch(`${url}${separator}sort=${encodeURIComponent(sort)}${optionalIdentity}&_=${Date.now()}`);
    const result = await response.json();

    if (!result.success) throw new Error("No fue posible obtener la galería.");

    const items = (result.items || []).map(normalizeGalleryItem);

    if (!items.length) {
      liveItems = [];
      container.innerHTML = `<div class="live-empty">Aún no hay recuerdos compartidos.</div>`;
      return;
    }

    liveItems = sortGalleryItems(items, sort);

    const sharedUuid = getSharedRecallId();
    if (sharedUuid && !liveItems.some(item => item.uuid === sharedUuid)) {
      try {
        const sharedItem = await fetchSharedRecall(sharedUuid);
        if (sharedItem) liveItems.unshift(sharedItem);
      } catch (sharedError) {
        console.warn("No fue posible cargar el recuerdo compartido.", sharedError);
      }
    }

    renderGalleryItems(liveItems, showInfo);
    renderGallerySort(sort);

    if (sharedUuid) {
      const sharedIndex = liveItems.findIndex(item => item.uuid === sharedUuid);
      if (sharedIndex >= 0) {
        clearSharedRecallParam();
        window.setTimeout(() => openViewer(sharedIndex), 120);
      }
    }
  } catch (error) {
    container.innerHTML = `<div class="live-error">Error al cargar la galería.</div>`;
    console.error(error);
  }
}

function getSectionName(sectionId) {
  const section = AppState.event.sections.find(s => s.id === sectionId);
  return section ? `${section.icon} ${section.name}` : sectionId;
}

function formatRelativeTime(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return new Date(dateString).toLocaleDateString();
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


function getSharedRecallId() {
  try {
    return String(new URLSearchParams(window.location.search).get("recuerdo") || "").trim();
  } catch (error) {
    return "";
  }
}

function clearSharedRecallParam() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("recuerdo");
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  } catch (error) {
    console.warn("No fue posible limpiar el enlace compartido.", error);
  }
}

async function fetchSharedRecall(uuid) {
  if (!uuid) return null;

  const identity = AppState?.security?.user?.id
    ? `&guestGoogleId=${encodeURIComponent(String(AppState.security.user.id))}`
    : "";

  const response = await fetch(
    `${UPLOAD_ENDPOINT}?action=item&uuid=${encodeURIComponent(uuid)}${identity}&_=${Date.now()}`
  );
  const result = await response.json();

  if (!result.success || !result.item) return null;
  return normalizeGalleryItem(result.item);
}

async function handleViewerShare(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  if (currentViewerIndex < 0) return;
  const item = liveItems[currentViewerIndex];
  if (!item?.uuid) return;

  const url = new URL(window.location.href);
  url.searchParams.set("recuerdo", item.uuid);
  const shareUrl = url.toString();
  const eventName = AppState?.event?.name || "Mis Recuerdos";
  const isVideo = String(item.mimeType || "").startsWith("video/");
  const text = `Mira este ${isVideo ? "video" : "recuerdo"} de ${eventName} 💗`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: eventName,
        text,
        url: shareUrl
      });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showShareFeedback("🔗 Enlace copiado");
      return;
    }

    window.prompt("Copia este enlace para compartir el recuerdo:", shareUrl);
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("No fue posible compartir el recuerdo.", error);
    try {
      await navigator.clipboard.writeText(shareUrl);
      showShareFeedback("🔗 Enlace copiado");
    } catch (clipboardError) {
      window.prompt("Copia este enlace para compartir el recuerdo:", shareUrl);
    }
  }
}

function showShareFeedback(message) {
  const viewer = document.querySelector(".media-viewer");
  if (!viewer) return;

  const feedback = document.createElement("div");
  feedback.className = "media-viewer-share-feedback";
  feedback.textContent = message;
  viewer.appendChild(feedback);
  window.setTimeout(() => feedback.remove(), 1800);
}

function createViewerMedia(item) {
  const isVideo = item.mimeType.startsWith("video/");
  return `
    <div class="media-viewer-media-wrap ${isVideo ? "is-video" : "is-image"}">
      ${isVideo
        ? `<iframe
            class="media-viewer-video"
            src="https://drive.google.com/file/d/${item.fileId}/preview"
            allow="autoplay; fullscreen"
            allowfullscreen
            title="Video del recuerdo"
          ></iframe>`
        : `<img
            class="media-viewer-image"
            src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w1600"
            alt=""
          >`
      }
      <div class="media-viewer-actions">
        <button
          class="media-viewer-action-button ${item.likedByMe ? "liked" : ""}"
          type="button"
          onclick="handleViewerLike(event)"
          aria-label="Dar Like"
          title="Dar Like"
        >❤️</button>
        <button
          class="media-viewer-like-count"
          type="button"
          onclick="showViewerLikes(event)"
          aria-label="Ver quién dio Like"
          title="Ver quién dio Like"
        >${Number(item.likes || 0)}</button>
        <button type="button" class="media-viewer-comment-count" onclick="openViewerComments()" title="Ver comentarios">💬 ${Number(item.comments || 0)}</button>
        <button
          class="media-viewer-share-button"
          type="button"
          onclick="handleViewerShare(event)"
          aria-label="Compartir recuerdo"
          title="Compartir recuerdo"
        >📤 Compartir</button>
      </div>
      ${!isVideo ? `<div class="media-viewer-heart-hint">Doble toque también da ❤️</div>` : ""}
    </div>
  `;
}

function handleViewerDoubleTap(event) {
  event.preventDefault();
  event.stopPropagation();
  if (currentViewerIndex < 0) return;
  handleViewerLike(event);
}

function handleViewerLike(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (currentViewerIndex < 0) return;

  const heart = document.createElement("div");
  heart.className = "viewer-like-animation";
  heart.textContent = "♥";
  document.querySelector(".media-viewer")?.appendChild(heart);
  window.setTimeout(() => heart.remove(), 850);
  toggleLike(currentViewerIndex);
}

function openViewer(index, openPanel = "none") {
  currentViewerIndex = index;
  const item = liveItems[currentViewerIndex];
  if (!item) return;

  const viewer = document.createElement("div");
  viewer.className = "media-viewer";

  viewer.innerHTML = `
    <button
      class="media-viewer-close"
      onclick="closeViewer()"
      aria-label="Cerrar visor"
    >×</button>

    <button
      class="media-viewer-arrow media-viewer-prev"
      onclick="showPreviousItem()"
      aria-label="Anterior"
    >‹</button>

    <div class="media-viewer-content">
      <div id="viewerMediaContainer">
        ${createViewerMedia(item)}
      </div>

      <section class="viewer-comments closed" aria-label="Comentarios">
        <div class="viewer-comments-header">
          <strong>Comentarios</strong>
          <span id="viewerCommentsTitleCount">💬 ${Number(item.comments || 0)}</span>
          <button type="button" class="viewer-panel-close" onclick="closeViewerComments()" aria-label="Cerrar comentarios">×</button>
        </div>
        <div id="viewerCommentsList" class="viewer-comments-list">
          <div class="viewer-comments-loading">Cargando comentarios…</div>
        </div>
        <form class="viewer-comment-form" onsubmit="submitViewerComment(event)">
          <input
            id="viewerCommentInput"
            type="text"
            maxlength="500"
            autocomplete="off"
            placeholder="Escribe un comentario…"
            aria-label="Escribe un comentario"
          >
          <button id="viewerCommentSubmit" type="submit">Enviar</button>
        </form>
      </section>
      <section id="viewerMomentsPanel" class="viewer-moments-panel" aria-label="Momentos"></section>
    </div>

    <button
      class="media-viewer-arrow media-viewer-next"
      onclick="showNextItem()"
      aria-label="Siguiente"
    >›</button>
  `;

  document.body.appendChild(viewer);
  recordViewerView(item);
  loadViewerComments(item.uuid);
  renderViewerMoments(item);
  const commentsPanel = viewer.querySelector(".viewer-comments");
  const momentsPanel = viewer.querySelector(".viewer-moments-panel");
  commentsPanel?.classList.add("closed");
  momentsPanel?.classList.remove("open");
  if (openPanel === "moments") {
    momentsPanel?.classList.add("open");
  }

  const mediaWrap = viewer.querySelector(".media-viewer-media-wrap.is-image");
  if (mediaWrap) mediaWrap.ondblclick = handleViewerDoubleTap;
}

function closeViewerComments() {
  document.querySelector(".viewer-comments")?.classList.add("closed");
}

function openViewerComments() {
  document.querySelector(".viewer-comments")?.classList.remove("closed");
  document.querySelector(".viewer-moments-panel")?.classList.remove("open");
}

function showPreviousItem() {
  if (!liveItems.length) return;
  currentViewerIndex =
    (currentViewerIndex - 1 + liveItems.length) % liveItems.length;
  updateViewerMedia();
}

function showNextItem() {
  if (!liveItems.length) return;
  currentViewerIndex =
    (currentViewerIndex + 1) % liveItems.length;
  updateViewerMedia();
}

function updateViewerMedia() {
  const item = liveItems[currentViewerIndex];
  document.querySelector(".viewer-likes-panel")?.remove();
  document.querySelector(".viewer-moments-panel")?.classList.remove("open");
  document.querySelector(".viewer-comments")?.classList.add("closed");
  const currentWrap = document.querySelector(".media-viewer-media-wrap");
  if (!item || !currentWrap) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = createViewerMedia(item).trim();
  currentWrap.replaceWith(wrapper.firstElementChild);
  recordViewerView(item);
  loadViewerComments(item.uuid);
  renderViewerMoments(item);
  const titleCount = document.getElementById("viewerCommentsTitleCount");
  if (titleCount) titleCount.textContent = `💬 ${Number(item.comments || 0)}`;

  const mediaWrap = document.querySelector(".media-viewer-media-wrap.is-image");
  if (mediaWrap) mediaWrap.ondblclick = handleViewerDoubleTap;
}

async function showViewerLikes(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const item = liveItems[currentViewerIndex];
  if (!item?.uuid || !Number(item.likes || 0)) return;
  try {
    const response = await fetch(`${UPLOAD_ENDPOINT}?action=likes&uuid=${encodeURIComponent(item.uuid)}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "No fue posible cargar los Likes.");
    const names = Array.isArray(result.likesBy) ? result.likesBy : [];
    const viewer = document.querySelector(".media-viewer");
    if (!viewer) return;
    const existing = viewer.querySelector(".viewer-likes-panel");
    if (existing) { existing.remove(); return; }
    const panel = document.createElement("div");
    panel.className = "viewer-likes-panel";
    panel.innerHTML = `<div class="viewer-likes-header"><strong>❤️ Le dieron Like</strong><button type="button" onclick="this.closest('.viewer-likes-panel').remove()">×</button></div><div class="viewer-likes-list">${names.length ? names.map(name => `<div>❤️ ${escapeHtml(name)}</div>`).join("") : "<div>No fue posible identificar a los invitados.</div>"}</div>`;
    viewer.appendChild(panel);
  } catch (error) { window.alert(error.message || "No fue posible cargar los Likes."); }
}

function updateViewerLikeCount() {
  const item = liveItems[currentViewerIndex];
  const count = document.querySelector(".media-viewer-like-count");
  if (item && count) count.textContent = Number(item.likes || 0);
  const button = document.querySelector(".media-viewer-action-button");
  if (button && item) button.classList.toggle("liked", Boolean(item.likedByMe));
}

async function recordViewerView(item) {
  if (!item?.uuid) return;
  const guestGoogleId = String(AppState?.security?.user?.id || "").trim();
  if (!guestGoogleId) return;
  try {
    const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: JSON.stringify({ action: "view", uuid: item.uuid, guestGoogleId }) });
    const result = await response.json();
    if (result.success) {
      item.views = Number(result.views || item.views || 0);
    }
  } catch (error) {
    console.warn("No fue posible registrar la vista.", error);
  }
}

function closeViewer() {
  viewerCommentsRequestToken++;
  const viewer = document.querySelector(".media-viewer");
  if (viewer) viewer.remove();
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
                ${AppState.upload.connection === "offline" ? "📡 Sin conexión" : AppState.upload.connection === "retrying" ? "🔄 Reintentando" : "⏳ Subiendo"}<br><br>

                <strong>${AppState.upload.currentFileName}</strong><br><br>

                <div class="upload-progress-track"><div class="upload-progress-fill" style="width:${AppState.upload.currentProgress || 0}%"></div></div>
                <strong>${AppState.upload.currentProgress || 0}%</strong><br>
                ${AppState.upload.totalChunks ? `${AppState.upload.currentChunk} de ${AppState.upload.totalChunks} lotes` : "Procesando archivo"}<br><br>

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
  ${AppState.upload.connection === "offline" ? "📡 Sin conexión" : AppState.upload.connection === "retrying" ? "🔄 Reintentando" : "⏳ Subiendo"}<br><br>

  <strong>${AppState.upload.currentFileName}</strong><br><br>

  <div class="upload-progress-track"><div class="upload-progress-fill" style="width:${AppState.upload.currentProgress || 0}%"></div></div>
  <strong>${AppState.upload.currentProgress || 0}%</strong><br>
  ${AppState.upload.totalChunks ? `${AppState.upload.currentChunk} de ${AppState.upload.totalChunks} lotes` : "Procesando archivo"}<br><br>

  ${AppState.upload.current + 1}
  de
  ${AppState.upload.total}
  archivos
</div>

  </div>
` : ""}

          ${AppState.upload.status === "error" ? `
            <div class="upload-error-panel">
              <strong>⚠️ La subida se detuvo</strong>
              <p>${AppState.upload.error || "Ocurrió un problema durante la transmisión."}</p>
              <p>Los archivos que ya terminaron correctamente no se volverán a subir.</p>
              ${UI.button({
                text: "Reintentar subida",
                variant: "primary",
                onClick: "uploadFiles()"
              })}
            </div>
          ` : ""}

          ${AppState.upload.status === "idle" && !navigator.onLine ? `
            <div class="upload-error-panel">
              <strong>📡 Sin conexión a Internet</strong>
              <p>Puedes seleccionar tus archivos, pero la subida comenzará cuando vuelva la conexión.</p>
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

  AppState.upload.fileStatuses = [
    ...AppState.upload.fileStatuses,
    ...uniqueNewFiles.map(() => ({
      status: "pending",
      progress: 0,
      currentChunk: 0,
      totalChunks: 0,
      error: ""
    }))
  ];

  AppState.upload.status = "idle";
  input.value = "";
  renderApp();
}

function removeSelectedFile(index) {
  if (AppState.upload.status === "uploading") return;
  AppState.upload.files.splice(index, 1);
  AppState.upload.fileStatuses.splice(index, 1);
  renderApp();
}

async function handleUploadAction() {
  if (AppState.upload.status === "uploading") return;

  if (AppState.upload.files.length === 0) {
    document.getElementById("uploadFilePicker").click();
    return;
  }

  await uploadFiles();
}

function waitForOnline() {
  if (navigator.onLine) return Promise.resolve();

  return new Promise(resolve => {
    const onOnline = () => {
      window.removeEventListener("online", onOnline);
      resolve();
    };
    window.addEventListener("online", onOnline, { once: true });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadWithRetry(task, label) {
  let attempt = 0;
  const maxAttempts = 3;

  while (true) {
    try {
      await waitForOnline();
      AppState.upload.connection = "online";
      renderApp();
      return await task();
    } catch (error) {
      if (!navigator.onLine) {
        AppState.upload.connection = "offline";
        AppState.upload.error = "Se perdió la conexión. La subida quedó pausada y continuará cuando vuelva Internet.";
        renderApp();
        await waitForOnline();
        continue;
      }

      attempt++;
      if (attempt >= maxAttempts) throw error;

      AppState.upload.connection = "retrying";
      AppState.upload.error = `${label}. Reintentando (${attempt}/${maxAttempts - 1})...`;
      renderApp();
      await sleep(1200 * attempt);
    }
  }
}

async function uploadFiles() {
  AppState.upload.status = "uploading";
  AppState.upload.current = 0;
  AppState.upload.total = AppState.upload.files.length;
  AppState.upload.error = "";
  AppState.upload.connection = navigator.onLine ? "online" : "offline";

  if (!Array.isArray(AppState.upload.fileStatuses) ||
      AppState.upload.fileStatuses.length !== AppState.upload.files.length) {
    AppState.upload.fileStatuses = AppState.upload.files.map(() => ({
      status: "pending", progress: 0, currentChunk: 0, totalChunks: 0, error: ""
    }));
  }

  renderApp();

  try {
    for (let index = 0; index < AppState.upload.files.length; index++) {
      const file = AppState.upload.files[index];
      const fileState = AppState.upload.fileStatuses[index];

      if (fileState.status === "completed") {
        AppState.upload.current++;
        continue;
      }

      AppState.upload.currentFileName = file.name;
      fileState.status = "uploading";
      fileState.error = "";
      fileState.progress = Number(fileState.progress || 0);
      AppState.upload.currentProgress = fileState.progress;
      AppState.upload.currentChunk = fileState.currentChunk || 0;
      AppState.upload.totalChunks = fileState.totalChunks || 0;
      renderApp();

      const result = await uploadWithRetry(
        () => uploadFile(file, progress => {
          fileState.progress = progress.percent;
          fileState.currentChunk = progress.currentChunk || 0;
          fileState.totalChunks = progress.totalChunks || 0;
          AppState.upload.currentProgress = progress.percent;
          AppState.upload.currentChunk = fileState.currentChunk;
          AppState.upload.totalChunks = fileState.totalChunks;
          AppState.upload.connection = "online";
          renderApp();
        }),
        `No se pudo continuar ${file.name}`
      );

      if (!result.success) {
        throw new Error(result.error || "Error al subir el archivo");
      }

      fileState.status = "completed";
      fileState.progress = 100;
      AppState.upload.currentProgress = 100;
      AppState.upload.currentChunk = fileState.totalChunks || 1;
      AppState.upload.current++;
      AppState.upload.error = "";
      renderApp();
    }

    AppState.upload.status = "done";
    AppState.upload.files = [];
    AppState.upload.fileStatuses = [];
    renderApp();

  } catch (error) {
    console.error(error);

    const failedIndex = AppState.upload.current;
    if (AppState.upload.fileStatuses[failedIndex]) {
      AppState.upload.fileStatuses[failedIndex].status = "error";
      AppState.upload.fileStatuses[failedIndex].error = error.message;
    }

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

async function uploadFile(file, onProgress = () => {}) {
  const CHUNK_SIZE = 5 * 1024 * 1024;

  if (file.size > CHUNK_SIZE) {
    return await uploadFileInChunks(file, onProgress);
  }

  onProgress({ percent: 0, currentChunk: 0, totalChunks: 1 });
  const base64 = await readFileAsBase64(file);

  const response = await uploadWithRetry(async () => fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64,
      sectionId: AppState.upload.section?.id || "general",
      ...requireGoogleIdentity()
    })
  }), `Enviando ${file.name}`);

  const result = await response.json();
  if (result.success) onProgress({ percent: 100, currentChunk: 1, totalChunks: 1 });
  return result;
}


function uploadChunkWithProgress({ uploadUrl, file, chunk, startByte, endByte, chunkIndex, totalChunks, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const totalSize = file.size;

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Content-Range", `bytes ${startByte}-${endByte - 1}/${totalSize}`);

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return;
      const uploadedBytes = startByte + event.loaded;
      const percent = Math.min(100, Math.round((uploadedBytes / totalSize) * 100));
      onProgress({
        percent,
        currentChunk: chunkIndex + 1,
        totalChunks
      });
    };

    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new TypeError("No se pudo completar el envío del lote."));
    xhr.onabort = () => reject(new Error("La subida del lote fue cancelada."));
    xhr.ontimeout = () => reject(new Error("Tiempo de espera agotado al enviar el lote."));

    xhr.send(chunk);
  });
}

async function uploadFileInChunks(file, onProgress = () => {}) {
  const sectionId = AppState.upload.section?.id || "general";
  const identity = requireGoogleIdentity();
  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);

  onProgress({ percent: 0, currentChunk: 0, totalChunks });

  const startResponse = await uploadWithRetry(() => fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "start",
      fileName: file.name,
      mimeType: file.type,
      sectionId,
      ...identity
    })
  }), `Preparando ${file.name}`);

  const startResult = await startResponse.json();

  if (!startResult.success || !startResult.uploadUrl) {
    throw new Error(startResult.error || "Drive no devolvió la URL de subida");
  }

  let driveFileId = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startByte = chunkIndex * chunkSize;
    const endByte = Math.min(startByte + chunkSize, file.size);
    const chunk = file.slice(startByte, endByte);

    let chunkResponse;

    while (true) {
      try {
        await waitForOnline();
        AppState.upload.connection = "online";
        chunkResponse = await uploadChunkWithProgress({
          uploadUrl: startResult.uploadUrl,
          file,
          chunk,
          startByte,
          endByte,
          chunkIndex,
          totalChunks,
          onProgress
        });
        break;
      } catch (error) {
        if (!navigator.onLine) {
          AppState.upload.connection = "offline";
          AppState.upload.error = "Conexión perdida. Esperando Internet para continuar este lote...";
          renderApp();
          await waitForOnline();
          continue;
        }

        // Si el último lote sí llegó a Drive pero el navegador bloqueó
        // la respuesta por CORS, continuamos con la confirmación.
        if (chunkIndex === totalChunks - 1 && error instanceof TypeError) {
          console.warn("El último lote pudo haber sido recibido por Drive; continuando con confirmación.", error);
          onProgress({ percent: 100, currentChunk: totalChunks, totalChunks });
          chunkResponse = { status: 200, ok: true, responseText: "" };
          break;
        }

        throw error;
      }
    }

    if (chunkResponse.status === 308) {
      const percent = Math.round((endByte / file.size) * 100);
      onProgress({ percent, currentChunk: chunkIndex + 1, totalChunks });
      continue;
    }

    if (!chunkResponse.ok) {
      const errorText = chunkResponse.responseText || "";
      throw new Error(`Drive rechazó el lote ${chunkIndex + 1}: ${chunkResponse.status} ${errorText}`);
    }

    try {
      const text = chunkResponse.responseText || "";
      if (text) {
        const driveFile = JSON.parse(text);
        driveFileId = driveFile?.id || null;
      }
    } catch (error) {
      console.warn("Drive completó la subida sin devolver JSON.", error);
    }

    onProgress({ percent: Math.round((endByte / file.size) * 100), currentChunk: chunkIndex + 1, totalChunks });
  }

  const confirmResponse = await uploadWithRetry(() => fetch(UPLOAD_ENDPOINT, {
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
  }), `Confirmando ${file.name}`);

  const confirmResult = await confirmResponse.json();

  if (!confirmResult.success) {
    throw new Error(confirmResult.error || "No se pudo confirmar la subida");
  }

  onProgress({ percent: 100, currentChunk: totalChunks, totalChunks });

  return {
    success: true,
    fileId: confirmResult.fileId || driveFileId,
    storedFileName: confirmResult.storedFileName || startResult.storedFileName
  };
}

// Si el usuario llegó mediante un enlace compartido, abrimos directamente la galería.
// El parámetro ?recuerdo=UUID será procesado por loadGalleryItems() y abrirá el visor.
if (getSharedRecallId()) {
  AppState.navigation.currentPage = "live";
}

renderApp();
