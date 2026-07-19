const Auth = {

  clientId: "604843682759-mbnpu9ol96m5iu1mspi1dtp80769mrr7.apps.googleusercontent.com",

  initialize() {

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
  
handleCredentialResponse(response) {
  console.log(response);
}
};
