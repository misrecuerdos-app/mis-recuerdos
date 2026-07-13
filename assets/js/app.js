const app = document.getElementById("app");
const UPLOAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyK_Ki7Vmqmr-7Dzi0ui-8KbmKn5_yQz8zYq_A10qR4fNpHh8Gl-AvF5Cq8m7cMvMCc4Q/exec";
function renderApp() {
  const page = AppState.navigation.currentPage;
  if (page === "home") renderHome();
  if (page === "sections") renderSections();
  if (page === "upload") renderUpload();
}

function renderHome() {
  app.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div class="top-bar">
          <span class="badge">Evento privado</span>
          <span class="brand-mini">📸 ${AppState.app.name}</span>
        </div>

        <div class="hero-title">
          <h1>${AppState.app.name}</h1>
          <p>${AppState.event.slogan}</p>
        </div>
      </section>

      <section class="content">
        <div class="event-card">
          <h2>${AppState.event.name}</h2>
          <div class="date">${AppState.event.date}</div>

          <p>
            Gracias por acompañarnos. Comparte aquí las fotos y videos
            que captures durante esta celebración.
          </p>

          <div class="actions">
            ${UI.button({
    text: "Subir fotos o videos",
    variant: "primary",
    onClick: "goTo('sections')"
  })}

  ${UI.button({
    text: "Ver galería",
    variant: "secondary",
    onClick: "handleGalleryClick()"
  })}
          </div>
        </div>

        <div class="status">
  ${UI.statusBox({
    value: "0",
    label: "Recuerdos"
  })}

  ${UI.statusBox({
    value: "6",
    label: "Momentos"
  })}
</div>

        <div class="footer">
          ${AppState.app.name} · Versión Fundación · v${AppState.app.version}
        </div>
      </section>
    </main>
  `;
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
          <p>
            ${selectedSection
              ? `Sección seleccionada: ${selectedSection.name}`
              : "Primero selecciona una sección"}
          </p>
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

  for (const file of AppState.upload.files) {

    const base64 = await new Promise(resolve => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result.split(",")[1]);
      };

      reader.readAsDataURL(file);
    });

    const response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        base64: base64
      })
    });

    const result = await response.json();

    console.log(result);
  }

  alert("Todos los archivos fueron enviados.");
}
renderApp();
