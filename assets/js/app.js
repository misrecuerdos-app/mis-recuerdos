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
            <h2>Subiendo archivos...</h2>

            <p>
              ${AppState.upload.current}
              de
              ${AppState.upload.total}
              archivos enviados
            </p>
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
  AppState.upload.status = "uploading";
  AppState.upload.current = 0;
  AppState.upload.total = AppState.upload.files.length;
  AppState.upload.progress = 0;
  AppState.upload.error = null;

  renderApp();

  try {
    for (const file of AppState.upload.files) {
      AppState.upload.currentFileName = file.name;
      AppState.upload.progress = 0;
      renderApp();

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

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", UPLOAD_ENDPOINT);

        xhr.upload.onprogress = event => {
          if (!event.lengthComputable) return;

          AppState.upload.progress = Math.round(
            (event.loaded / event.total) * 100
          );

          renderApp();
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);

            if (!response.success) {
              reject(new Error(response.error || "Error al subir el archivo"));
              return;
            }

            resolve(response);
          } catch {
            reject(new Error("Respuesta inválida del servidor"));
          }
        };

        xhr.onerror = () => {
          reject(new Error(`Falló la subida de ${file.name}`));
        };

        xhr.send(
          JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            base64
          })
        );
      });

      console.log(result);

      AppState.upload.progress = 100;
      AppState.upload.current++;
      renderApp();
    }

    AppState.upload.status = "done";
    AppState.upload.currentFileName = "";
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

renderApp();
