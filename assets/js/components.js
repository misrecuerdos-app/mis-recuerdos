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
    const items = [
      { id: "home", label: "Inicio", icon: "⌂" },
      { id: "sections", label: "Secciones", icon: "▣" },
      { id: "upload", label: "", icon: "+" },
      { id: "uploads", label: "Mis Subidas", icon: "♙" },
      { id: "info", label: "Info", icon: "ⓘ" }
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
              onclick="goTo('${item.id}')"
            >
              <span class="bottom-nav-icon">${item.icon}</span>
              ${item.label
                ? `<span class="bottom-nav-label">${item.label}</span>`
                : ""}
            </button>
          `;
        }).join("")}
      </nav>
    `;
  },
};
