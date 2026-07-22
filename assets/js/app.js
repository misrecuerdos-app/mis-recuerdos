const app = document.getElementById("app");
const UPLOAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbxotpFCmjKY0IjyT79PjLxkYdWxa3uDFYiCoNtPq1Sbtq7WIuMWcx1R-9ZyFasZvgWW/exec";
let liveItems = [];
let currentViewerIndex = -1;
function getDeviceToken() {

  let token = localStorage.getItem("recuerdos-device-token");

  if (!token) {

    token = crypto.randomUUID();

    localStorage.setItem(
      "recuerdos-device-token",
      token
    );

  }

  AppState.device.token = token;

}
Auth.initialize();
function renderApp() {
  const page = AppState.navigation.currentPage;

  if (page === "home") renderHome();
  if (page === "sections") renderSections();
  if (page === "upload") renderUpload();
  if (page === "live") renderLive();
  if (page === "mine") renderMine();
}

function renderHome() {
  app.innerHTML = `
    <main
      class="app-shell home-shell"
      style="background-image: url('${AppState.event.heroImage}')"
    >
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

        <div id="mineContent">
          Cargando recuerdos...
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
    const response = await fetch(
      `${UPLOAD_ENDPOINT}?action=mine&deviceToken=${encodeURIComponent(AppState.device.token)}`
    );

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
                <button
                  class="mine-thumbnail"
                  onclick="openViewer(${itemIndex})"
                  aria-label="Abrir recuerdo"
                >
                  <img
                    src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w800"
                    alt=""
                    loading="lazy"
                  >

                  ${item.mimeType.startsWith("video/")
                    ? `<span class="live-play-icon">▶</span>`
                    : ""
                  }
                </button>
              `;
            }).join("")}
          </div>
        </section>
      `)
      .join("");

  } catch (error) {
    container.innerHTML = `
      <div class="live-error">
        Error al cargar Mis Subidas.
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

function openViewer(index) {
  currentViewerIndex = index;

  const item = liveItems[currentViewerIndex];

  const viewer = document.createElement("div");

  viewer.className = "media-viewer";

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

    <img
      class="media-viewer-image"
      src="https://drive.google.com/thumbnail?id=${item.fileId}&sz=w1600"
      alt=""
    >

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

  const image = document.querySelector(".media-viewer-image");

  if (image) {
    image.src =
      `https://drive.google.com/thumbnail?id=${item.fileId}&sz=w1600`;
  }
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
                image: URL.createObjectURL(file),
                removable: true,
                onRemove: `removeSelectedFile(${index})`
              })
            ).join("")}

            ${previews.length < 12 ? `
              <button
                class="upload-thumb upload-thumb-add"
                onclick="document.getElementById('uploadFilePicker').click()"
                aria-label="Agregar más archivos"
              >
                +
              </button>
            ` : ""}
          </div>

          <p class="upload-counter">
            ${previews.length} de 12 archivos seleccionados
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

  AppState.upload.section = selectedSection;
  goTo("upload");
}
function handleFilesSelected(event) {
  const files = Array.from(event.target.files);
const uniqueNewFiles = files.filter(newFile =>
  !AppState.upload.files.some(existingFile =>
    existingFile.name === newFile.name &&
    existingFile.size === newFile.size &&
    existingFile.lastModified === newFile.lastModified
  )
);

const mergedFiles = [
  ...AppState.upload.files,
  ...uniqueNewFiles
];

AppState.upload.files = mergedFiles.slice(0, 12);

  console.log(AppState.upload.files);
  renderApp();
  event.target.value = "";
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
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result.split(",")[1]);
        };

        reader.onerror = () => {
          reject(new Error(`No se pudo leer ${file.name}`));
        };

        reader.readAsDataURL(file);
      });

      const response = await uploadFile(file, base64);
      const result = await response.json();

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

  AppState.upload.section = null;
  AppState.upload.files = [];

  AppState.upload.status = "idle";
  AppState.upload.current = 0;
  AppState.upload.total = 0;

  goTo("sections");
}
async function uploadFile(file, base64) {
const CHUNK_SIZE = 5 * 1024 * 1024;

if (file.size > CHUNK_SIZE) {
  return await uploadFileInChunks(file);
}
  return await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64,
      deviceToken: AppState.device.token,
      sectionId: AppState.upload.section?.id || "general"
    })
  });

}
getDeviceToken();
renderApp();
