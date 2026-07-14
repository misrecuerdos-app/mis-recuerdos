const app = document.getElementById("app");
const UPLOAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyK_Ki7Vmqmr-7Dzi0ui-8KbmKn5_yQz8zYq_A10qR4fNpHh8Gl-AvF5Cq8m7cMvMCc4Q/exec";
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
function renderApp() {
  const page = AppState.navigation.currentPage;
  if (page === "home") renderHome();
if (page === "sections") renderSections();
if (page === "upload") renderUpload();
if (page === "live") renderLive();
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
    src="assets/images/logo-camera.png"
    alt=""
    class="home-brand-icon"
  >

  <img
    src="assets/images/logo-recuerdos-word.png"
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
  text: "Ver galería",
  variant: "secondary",
  onClick: "goTo('live')"
})}
          </div>

        </div>

        ${UI.bottomNav({
          active: "home"
        })}

      </section>
    </main>
  `;
}

function renderLive() {
  app.innerHTML = `
    <main class="app-shell white-shell">

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
    ✨ En vivo
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
    <h2>En vivo</h2>
    <p>Últimos recuerdos compartidos</p>
  </div>

  <div id="liveContent" class="live-content">
    Cargando recuerdos...
  </div>

</div>

        <div id="liveContent" class="live-content">
          Cargando recuerdos...
        </div>

      </section>

      ${UI.bottomNav({
        active: "home"
      })}

    </main>
  `;

  loadLiveItems();
}

async function loadLiveItems() {

  const container = document.getElementById("liveContent");

  container.textContent = "Cargando recuerdos...";

  try {

    const response = await fetch(
      `${UPLOAD_ENDPOINT}?action=live`
    );

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
    container.innerHTML = result.items
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

      <div class="live-card-info">
        <div class="live-section">
          ${getSectionName(item.sectionId)}
        </div>

        <div class="live-time">
          ${formatRelativeTime(item.uploadedAt)}
        </div>
      </div>

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
function closeViewer() {
  const viewer = document.querySelector(".media-viewer");

  if (viewer) {
    viewer.remove();
  }
}

function renderSections() {
  app.innerHTML = `
    <main class="app-shell white-shell">
      ${UI.header({
  title: "Secciones",
  back: "home"
})}

      <section class="sections-grid">
        ${AppState.event.sections.map(section =>
        UI.sectionCard({ section })
        ).join("")}
      </section>

      ${UI.bottomNav({
  active: "sections"
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

          <div class="upload-section-name">
  ${selectedSection
    ? `Sección seleccionada: ${selectedSection.name}`
    : "Primero selecciona una sección"}
</div>

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

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
  fileName: file.name,
  mimeType: file.type,
  base64,
  deviceToken: AppState.device.token,
  sectionId: AppState.upload.section?.id || "general"
})
      });

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

getDeviceToken();
renderApp();
