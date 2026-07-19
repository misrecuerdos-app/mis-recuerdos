const Auth = {

  clientId: "604843682759-mbnpu9ol96m5iu1mspi1dtp80769mrr7.apps.googleusercontent.com",

  initialize() {

  const savedUser = localStorage.getItem("mis-recuerdos-user");
  const savedLogin = localStorage.getItem("mis-recuerdos-login");

  if (savedUser && savedLogin === "true") {

    AppState.security.user = JSON.parse(savedUser);
    AppState.security.isLoggedIn = true;

    console.log("Sesión restaurada");

    return;
  }

  if (!window.google?.accounts?.id) {
    setTimeout(() => this.initialize(), 200);
    return;
  }

  google.accounts.id.initialize({
    client_id: this.clientId,
    callback: this.handleCredentialResponse.bind(this)
  });

  console.log("Google Identity listo");

},

showLogin() {

  let container = document.getElementById("google-login");

  if (!container) {
    container = document.createElement("div");
    container.id = "google-login";

    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "9999"
    });

    const button = document.createElement("div");
    button.id = "google-login-button";

    container.appendChild(button);
    document.body.appendChild(container);
  }

  google.accounts.id.renderButton(
    document.getElementById("google-login-button"),
    {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill"
    }
  );
},

logout() {

  localStorage.removeItem("mis-recuerdos-user");
  localStorage.removeItem("mis-recuerdos-login");

  AppState.security.isLoggedIn = false;
  AppState.security.user = null;

  google.accounts.id.disableAutoSelect();

  goTo("home");

},
  
handleCredentialResponse(response) {

  const token = response.credential;

  const payload = JSON.parse(
    atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
  );

  AppState.security.isLoggedIn = true;

  AppState.security.user = {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  };

  localStorage.setItem(
  "mis-recuerdos-user",
  JSON.stringify(AppState.security.user)
);

localStorage.setItem(
  "mis-recuerdos-login",
  "true"
);
  
  console.log(AppState.security.user);

  document.getElementById("google-login")?.remove();

  goTo("sections");

},
};
