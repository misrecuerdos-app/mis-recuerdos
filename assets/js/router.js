function goTo(page) {

  if (!requirePermission(page)) {
    return;
  }

  AppState.navigation.currentPage = page;
  renderApp();
}
