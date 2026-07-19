const Auth = {

  clientId: "604843682759-mbnpu9ol96m5iu1mspi1dtp80769mrr7.apps.googleusercontent.com",

  initialize() {

  google.accounts.id.initialize({
    client_id: this.clientId,
    callback: this.handleCredentialResponse.bind(this)
  });

  console.log("Google Identity listo");

},
handleCredentialResponse(response) {
  console.log(response);
}
};
