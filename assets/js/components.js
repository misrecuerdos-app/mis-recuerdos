const UI = {
  button({
    text,
    variant = "primary",
    onClick = "",
    icon = ""
  }) {
    const iconMarkup = icon
      ? `<span class="button-icon">${icon}</span>`
      : "";

    return `
      <button
        class="btn btn-${variant}"
        ${onClick ? `onclick="${onClick}"` : ""}
      >
        ${iconMarkup}
        <span>${text}</span>
      </button>
    `;
  },

  backButton(targetPage = "home") {
    return `
      <button
        class="icon-back"
        onclick="goTo('${targetPage}')"
        aria-label="Regresar"
      >
        ←
      </button>
    `;
  },

 sectionCard({ section }) {
  return `
    <button
      class="section-tile"
      onclick="selectSection('${section.id}')"
      style="background-image:
        linear-gradient(
          180deg,
          rgba(0,0,0,0.04),
          rgba(0,0,0,0.72)
        ),
        url('${section.image}')"
    >
      <span class="tile-icon">${section.icon}</span>
      <span class="tile-name">${section.name}</span>
    </button>
  `;
},

  statusBox({ value, label }) {
    return `
      <div class="status-box">
        <strong>${value}</strong>
        <span>${label}</span>
      </div>
    `;
  },
    header({
    title = "",
    back = false,
    right = ""
  }) {
    return `
      <section class="page-header">
        ${back
          ? `<button class="icon-back" onclick="goTo('${back}')">←</button>`
          : `<div></div>`}

        <h1>${title}</h1>

        <div class="header-right">
          ${right}
        </div>
      </section>
    `;
  },
      bottomNav({ active = "home" } = {}) {
    const icons = {
      home: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5"/>
          <path d="M5.5 10.5V20h13v-9.5"/>
        </svg>
      `,
      live: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1"/>
          <rect x="14" y="4" width="6" height="6" rx="1"/>
          <rect x="4" y="14" width="6" height="6" rx="1"/>
          <rect x="14" y="14" width="6" height="6" rx="1"/>
        </svg>
      `,
upload: `
  ${AppState.upload.files.length === 0 ? `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14"/>
      <path d="M5 12h14"/>
    </svg>
  ` : `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V5"/>
      <path d="M8 9l4-4 4 4"/>
      <path d="M5 19h14"/>
    </svg>
  `}
`,
      mine: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h10"/>
          <path d="M7 12h10"/>
          <path d="M7 17h6"/>
          <rect x="4" y="3" width="16" height="18" rx="2"/>
        </svg>
      `,
      info: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 11v6"/>
          <path d="M12 7h.01"/>
        </svg>
      `
    };

    const items = [
      { id: "home", label: "Inicio" },
      { id: "live", label: "Galería" },
      { id: "upload", label: "" },
      { id: "mine", label: "Mis Subidas" },
      { id: "info", label: "Info" }
    ];

    return `
      <nav class="bottom-nav">
        ${items.map(item => {
          const isUpload = item.id === "upload";
          const isActive = item.id === active;

          return `
            <button
              class="bottom-nav-item
                ${isActive ? "active" : ""}
                ${isUpload ? "bottom-nav-upload" : ""}"
                onclick="${isUpload ? "handleUploadAction()" : `goTo('${item.id}')`}"
              aria-label="${item.label || "Subir archivos"}"
            >
              <span class="bottom-nav-icon">
                ${icons[item.id]}
              </span>

              ${isUpload
  ? (
      AppState.upload.files.length > 0 &&
      AppState.upload.status === "idle"
        ? `<span class="bottom-nav-label">Subir</span>`
        : ""
    )
  : (
      item.label
        ? `<span class="bottom-nav-label">${item.label}</span>`
        : ""
    )
}
            </button>
          `;
        }).join("")}
      </nav>
    `;
  },
    stepper({ current = 1 } = {}) {
   const steps = [
  { number: 1, label: "Seleccionar" },
  { number: 2, label: "Subiendo" },
  { number: 3, label: "Listo" }
];

    return `
      <div class="upload-stepper">
        ${steps.map(step => {
          const isActive = step.number === current;
          const isCompleted = step.number < current;

          return `
            <div class="upload-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}">
              <div class="upload-step-number">${step.number}</div>
              <span>${step.label}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },
    galleryThumb({
    image = "",
    removable = false,
    duration = "",
    onRemove = ""  
  } = {}) {
    return `
      <div class="gallery-thumb">
        ${image
          ? `<img src="${image}" alt="Vista previa">`
          : `<div class="gallery-thumb-placeholder"></div>`}

        ${removable
         ? `<button
      class="gallery-thumb-remove"
      aria-label="Eliminar archivo"
      onclick="${onRemove}"
    >×</button>`
          : ""}

        ${duration
          ? `<span class="gallery-thumb-duration">${duration}</span>`
          : ""}
      </div>
    `;
  },
    filePicker({
    id = "filePicker",
    multiple = true,
    accept = "image/*,video/*",
    onChange = ""
  } = {}) {
    return `
      <input
        id="${id}"
        type="file"
        ${multiple ? "multiple" : ""}
        accept="${accept}"
        style="display:none"
        onchange="${onChange}"
      >
    `;
  },
};
