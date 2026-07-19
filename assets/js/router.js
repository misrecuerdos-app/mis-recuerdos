function requirePermission(page) {

  if (page === "sections") {
    alert("Aquí pediremos iniciar sesión con Google.");
    return false;
  }

  return true;
}

function goTo(page) {

  if (!requirePermission(page)) {
    return;
  }

  AppState.navigation.currentPage = page;
  renderApp();
}
