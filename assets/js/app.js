const app = document.getElementById("app");

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

  <div class="upload-thumb"></div>
  <div class="upload-thumb"></div>
  <div class="upload-thumb"></div>
  <div class="upload-thumb"></div>

  <div class="upload-thumb"></div>
  <div class="upload-thumb"></div>
  <div class="upload-thumb"></div>

  <div class="upload-thumb upload-thumb-add">
    +
  </div>

</div>
          <p>
            ${selectedSection
              ? `Sección seleccionada: ${selectedSection.name}`
              : "Primero selecciona una sección"}
          </p>

          ${UI.button({
            text: "Seleccionar archivos",
            variant: "primary",
            onClick: ""
          })}
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

renderApp();
