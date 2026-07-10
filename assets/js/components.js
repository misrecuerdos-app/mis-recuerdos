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
  }
};
