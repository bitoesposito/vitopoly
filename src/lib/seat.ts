// Chi sei, e come portarti dietro. Il posto in una stanza è la coppia (pid, segreto):
// il pid vive in localStorage, il segreto lo conia il server alla prima entrata.
//
// Senza una via di trasferimento, svuotare i dati del browser o cambiare dispositivo
// significava perdere la partita per sempre — restavi spettatore al tuo stesso tavolo, e
// gli altri dovevano espellerti per sbloccare i timer. Il link di trasferimento è quella
// via: è una credenziale al portatore, quindi si genera solo su richiesta esplicita e si
// cancella dalla barra degli indirizzi appena consumata.

const PID_KEY = "tangentopoly:pid";
const seatKey = (code: string) => `tangentopoly:token:${code}`;

export const seatSecret = (code: string) => localStorage.getItem(seatKey(code)) ?? "";
export const rememberSeat = (code: string, secret: string) => localStorage.setItem(seatKey(code), secret);

/** Il link che sposta QUESTO posto su un altro dispositivo. Non è il link d'invito. */
export const transferLink = (code: string, pid: string) =>
  `${location.origin}${location.pathname}?room=${code}&pid=${encodeURIComponent(pid)}&seat=${encodeURIComponent(seatSecret(code))}`;

/** Adotta l'identità che arriva da un link di trasferimento e ripulisce l'URL. Va chiamata
 *  PRIMA di qualunque connessione: dopo, il pid è già stato letto. */
function adoptFromUrl(): string | null {
  const url = new URL(location.href);
  const pid = url.searchParams.get("pid");
  const seat = url.searchParams.get("seat");
  const room = url.searchParams.get("room");
  if (!pid || !seat || !room) return null;

  localStorage.setItem(PID_KEY, pid);
  rememberSeat(room, seat);
  // il segreto non deve restare in una barra che si copia e si condivide
  url.searchParams.delete("pid");
  url.searchParams.delete("seat");
  history.replaceState(null, "", url.pathname + url.search);
  return pid;
}

export function myId(): string {
  const adopted = adoptFromUrl();
  if (adopted) return adopted;
  let id = localStorage.getItem(PID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}
