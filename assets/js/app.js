const app = document.getElementById("app");

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
            <button class="btn btn-primary" onclick="handleUploadClick()">
              Subir fotos o videos
            </button>

            <button class="btn btn-secondary" onclick="handleGalleryClick()">
              Ver galería
            </button>
          </div>
        </div>

        <div class="status">
          <div class="status-box">
            <strong>0</strong>
            <span>Recuerdos</span>
          </div>

          <div class="status-box">
            <strong>6</strong>
            <span>Momentos</span>
          </div>
        </div>

        <div class="footer">
          ${AppState.app.name} · Versión Fundación · v${AppState.app.version}
        </div>

      </section>

    </main>
  `;
}

function handleUploadClick() {
  goTo("sections");
}

function handleGalleryClick() {
  alert("La galería se construirá en un próximo sprint.");
}
function renderApp() {
  if (AppState.navigation.currentPage === "home") {
    renderHome();
    return;
  }

  if (AppState.navigation.currentPage === "sections") {
    renderSections();
    return;
  }
  if (AppState.navigation.currentPage === "upload") {
  renderUpload();
  return;
}
}

function renderSections() {
  app.innerHTML = `
    <main class="app-shell">

      <section class="content section-screen">

        <button class="back-button" onclick="goTo('home')">
          ← Regresar
        </button>

        <h1 class="screen-title">¿Dónde estás?</h1>

        <p class="screen-subtitle">
          Elige el momento del evento para guardar tus recuerdos en el lugar correcto.
        </p>

        <div class="section-list">
          ${renderSectionCard("Preparativos", "✨")}
          ${renderSectionCard("Misa de Agradecimiento", "⛪")}
          ${renderSectionCard("Cocktail", "🍸")}
          ${renderSectionCard("Cena", "🍽️")}
          ${renderSectionCard("Vals", "👑")}
          ${renderSectionCard("Fiesta", "🎉")}
          ${renderSectionCard("After Party", "🌙")}
          ${renderSectionCard("General", "📸")}
        </div>

      </section>

    </main>
  `;
}

function renderSectionCard(name, icon) {
  return `
    <button class="section-card" onclick="selectSection('${name}')">
      <span class="section-icon">${icon}</span>
      <span>${name}</span>
    </button>
  `;
}

function selectSection(sectionName) {
  AppState.upload.section = sectionName;
  goTo("upload");
}
renderApp();
function renderUpload() {
  app.innerHTML = `
    <main class="app-shell">

      <section class="content section-screen">

        <button class="back-button" onclick="goTo('sections')">
          ← Regresar
        </button>

        <h1 class="screen-title">Subir recuerdos</h1>

        <p class="screen-subtitle">
          Sección seleccionada:
          <strong>${AppState.upload.section}</strong>
        </p>

        <div class="upload-box">
          <div class="upload-icon">📸</div>

          <h2>Selecciona fotos o videos</h2>

          <p>
            Elige los archivos que quieras compartir en esta parte del evento.
          </p>

          <input
            type="file"
            id="fileInput"
            accept="image/*,video/*"
            multiple
            onchange="handleFileSelection(event)"
          />
        </div>

        <div id="selectedFiles" class="selected-files"></div>

      </section>

    </main>
  `;
}
function handleFileSelection(event) {
  AppState.upload.files = Array.from(event.target.files);

  const selectedFiles = document.getElementById("selectedFiles");

  if (AppState.upload.files.length === 0) {
    selectedFiles.innerHTML = "";
    return;
  }

  selectedFiles.innerHTML = `
    <div class="selected-summary">
      <strong>${AppState.upload.files.length}</strong>
      archivo(s) seleccionado(s)
    </div>

    ${AppState.upload.files.map(file => `
      <div class="file-row">
        <span>📎</span>
        <div>
          <strong>${file.name}</strong>
          <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
        </div>
      </div>
    `).join("")}

    <button class="btn btn-primary upload-action">
      Continuar
    </button>
  `;
}
