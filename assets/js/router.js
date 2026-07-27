function requirePermission(page) {

  const protectedPages = ["sections"];

  if (
    protectedPages.includes(page) &&
    !AppState.security.isLoggedIn
  ) {
    Auth.showLogin();
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
