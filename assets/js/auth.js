const Auth = {
  clientId: "604843682759-mbnpu9ol96m5iu1mspi1dtp80769mrr7.apps.googleusercontent.com",
  initialized: false,

  initialize() {
    const session = localStorage.getItem("mis-recuerdos-session");
    if (session) {
      try {
        const savedSession = JSON.parse(session);
        AppState.security.user = savedSession.user || null;
        AppState.security.isLoggedIn = Boolean(
          savedSession.isLoggedIn && savedSession.user?.email
        );
        console.log("Sesión restaurada", AppState.security.user?.email || "");
      } catch (error) {
        localStorage.removeItem("mis-recuerdos-session");
      }
    }

    if (!window.google?.accounts?.id) {
      setTimeout(() => this.initialize(), 200);
      return;
    }

    if (!this.initialized) {
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false
      });
      this.initialized = true;
      console.log("Google Identity listo");
    }
  },

  showLogin() {
    if (!window.google?.accounts?.id) {
      setTimeout(() => this.showLogin(), 200);
      return;
    }

    this.initialize();
    document.getElementById("google-login")?.remove();

    const container = document.createElement("div");
    container.id = "google-login";
    container.className = "google-login-overlay";

    const card = document.createElement("div");
    card.className = "google-login-card";
    card.innerHTML = `
      <button class="google-login-close" onclick="document.getElementById('google-login')?.remove()" aria-label="Cerrar">×</button>
      <h2>Inicia sesión</h2>
      <p>Elige la cuenta que identificará tus archivos.</p>
      <div id="google-login-button"></div>
    `;

    container.appendChild(card);
    document.body.appendChild(container);

    google.accounts.id.renderButton(
      document.getElementById("google-login-button"),
      {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280
      }
    );
  },

  clearLocalSession() {
    localStorage.removeItem("mis-recuerdos-session");
    AppState.security.isLoggedIn = false;
    AppState.security.user = null;
    window.google?.accounts?.id?.disableAutoSelect();
    document.getElementById("google-login")?.remove();
    closeSideMenu?.();
  },

  logout() {
    this.clearLocalSession();
    goTo("home");
  },

  changeAccount() {
    const email = AppState.security.user?.email;

    const finish = () => {
      this.clearLocalSession();
      goTo("home");
      setTimeout(() => this.showLogin(), 50);
    };

    if (email && window.google?.accounts?.id?.revoke) {
      google.accounts.id.revoke(email, finish);
      return;
    }

    finish();
  },

  handleCredentialResponse(response) {
    try {
      const token = response.credential;
      const tokenPart = token.split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const padded = tokenPart.padEnd(
        tokenPart.length + (4 - tokenPart.length % 4) % 4,
        "="
      );
      const payload = JSON.parse(
        decodeURIComponent(
          atob(padded)
            .split("")
            .map(char => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
            .join("")
        )
      );

      AppState.security.isLoggedIn = true;
      AppState.security.user = {
        id: payload.sub,
        name: payload.name || "",
        email: payload.email || "",
        picture: payload.picture || ""
      };

      localStorage.setItem(
        "mis-recuerdos-session",
        JSON.stringify({
          isLoggedIn: true,
          user: AppState.security.user
        })
      );

      document.getElementById("google-login")?.remove();
      closeSideMenu?.();
      goTo("sections");
    } catch (error) {
      console.error("No se pudo leer la sesión de Google", error);
      alert("No fue posible iniciar sesión. Intenta nuevamente.");
    }
  }
};
