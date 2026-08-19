// Come il gioco chiede attenzione. Un canale solo da accendere: "suono" fa partire il
// file e, dove c'è un motore, la vibrazione che lo raddoppia; "muto" non fa niente. Niente
// combinazioni da spiegare a nessuno.
// È una preferenza di dispositivo: vive in localStorage accanto al posto, non sulla socket.
const CHIAVE = "tangentopoly:modo";

export const MODI = ["suono", "muto"] as const;
type Modo = (typeof MODI)[number];

export function modo(): Modo {
  const m = localStorage.getItem(CHIAVE) as Modo | null;
  return m && MODI.includes(m) ? m : "suono";
}

export const setModo = (m: Modo) => localStorage.setItem(CHIAVE, m);

// Il vocabolario degli avvisi. La chiave è il nome del file in `src/assets/audio/`, il
// valore il pattern del motore in ms — il primo numero è già una vibrazione, non un'attesa,
// e sotto i 20ms un motore a massa rotante non parte. `null` = solo suono.
// AUDIO.md dice quando parte ognuno e come vanno prodotti i file.
const AVVISI = {
  tocco: 20,
  turno: 40,
  debito: [30, 60, 30],
  dadi: [15, 45, 15],
  carta: null,
  prigione: null,
  acquisto: null,
  pagamento: null,
  rilancio: null,
  asta: null,
  scambio: null,
} satisfies Record<string, number | number[] | null>;

export type Avviso = keyof typeof AVVISI;

// I file che esistono davvero, risolti da Vite a build time: quelli che mancano non fanno
// 404 e non suonano. Aggiungere un suono è metterlo nella cartella col nome giusto — qui
// non si tocca niente.
const SUONI: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob("../assets/audio/*.{mp3,ogg,m4a,wav}", { eager: true, query: "?url", import: "default" })).map(
    ([path, url]) => [
      path
        .split("/")
        .pop()!
        .replace(/\.\w+$/, ""),
      url as string,
    ]
  )
);

const VOLUME = 0.6;

// ponytail: un HTMLAudioElement per suono, riusato. Se la latenza del tocco dà fastidio,
// il passo dopo è decodificare i file in un AudioContext.
const pronti = new Map<string, HTMLAudioElement>();

function suona(nome: Avviso): void {
  const url = SUONI[nome];
  if (!url) return;
  let a = pronti.get(nome);
  if (!a) {
    a = new Audio(url);
    a.volume = VOLUME;
    pronti.set(nome, a);
  }
  a.currentTime = 0;
  // il browser rifiuta l'audio finché la pagina non ha ricevuto un tocco: non è un errore
  void a.play().catch(() => {});
}

export function avvisa(nome: Avviso): void {
  if (modo() === "muto") return;
  suona(nome);
  const pattern = AVVISI[nome];
  if (pattern !== null) navigator.vibrate?.(pattern);
}
