const AppState = {

    app: {
    name: "Mis Recuerdos",
    shortName: "Recuerdos",
    version: "1.0.0",
    author: "Mis Recuerdos",
    website: "",
    supportEmail: "misrecuerdos.app@gmail.com"
},
    security: {

    user: null,

    role: "guest",

    permissions: []

},
    event: {

        name: "XV Años Sofía",

        date: "29 Agosto 2026",

        slogan:
        "Comparte los momentos que harán inolvidable este día.",

       heroImage:
       "assets/images/sofi-home.png",
sections: [
  {
    id: "preparativos",
    name: "Preparativos",
    icon: "✨",
    image: "assets/images/sections/preparativos.jpg"
  },
  {
    id: "misa",
    name: "Misa",
    icon: "⛪",
    image: "assets/images/sections/misa.jpg"
  },
  {
    id: "cocktail",
    name: "Cocktail de Bienvenida",
    icon: "🍸",
    image: "assets/images/sections/cocktail.jpg"
  },
  {
    id: "cena",
    name: "Cena",
    icon: "🍽️",
    image: "assets/images/sections/cena.jpg"
  },
  {
    id: "vals",
    name: "Vals",
    icon: "👑",
    image: "assets/images/sections/vals.jpg"
  },
  {
    id: "fiesta",
    name: "Fiesta",
    icon: "🎉",
    image: "assets/images/sections/fiesta.jpg"
  },
  {
    id: "after-party",
    name: "After Party",
    icon: "🌙",
    image: "assets/images/sections/after-party.jpg"
  },
  {
    id: "general",
    name: "Carpeta General",
    icon: "📁",
    image: "assets/images/sections/general.jpg"
  }
]
    },

    navigation: {

        currentPage: "home"

    },
    device: {

        token: null

    },
        upload: {

        section: null,

        files: [],

        status: "idle",

        current: 0,

        total: 0,

        currentFileName: "",

        progress: 0,

        error: null

    }

};
