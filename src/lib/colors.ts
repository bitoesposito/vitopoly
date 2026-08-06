// Un inchiostro per regione, in scalata di valore da Foggia a Milano.
// Campo colore, mai fondo di testo: il significato lo porta GROUP_LABEL.
export const GROUP_COLOR: Record<string, string> = {
  brown: "#7a5c3e", // Puglia — terra d'ombra
  lightblue: "#4d7386", // Calabria — azzurro slavato
  pink: "#b06a7d", // Campania — carminio spento
  orange: "#a4661f", // Sicilia — ocra bruciata
  red: "#a83a26", // Lazio — sanguigna
  yellow: "#97761d", // Veneto — oro bollo
  green: "#2f7a52", // Liguria — verde valore
  darkblue: "#24457f", // Lombardia — indaco profondo
};

export const GROUP_LABEL: Record<string, string> = {
  brown: "Puglia",
  lightblue: "Calabria",
  pink: "Campania",
  orange: "Sicilia",
  red: "Lazio",
  yellow: "Veneto",
  green: "Liguria",
  darkblue: "Lombardia",
};

// Timbri dei giocatori: sopra 3:1 su --card. Non colorano mai un nome.
export const TOKEN_COLOR = ["#d1674b", "#4fae78", "#5b7fc7", "#c99a3c", "#a86bb0", "#4fb3ac", "#cf6f96", "#93a94a"];

// L'identità che non passa dal colore. Gli inchiostri si ripetono ogni 8, le
// lettere no: dopo la Z arriva A2, quindi mai due giocatori uguali.
export const serie = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) + 1 : "");
