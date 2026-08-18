# Audio

Il gioco ha un canale solo da accendere: un bottone in testata gira fra **Suono** e **Muto**
(`src/components/ModoAvviso.tsx`). In "suono" parte il file e, dove c'è un motore, la
vibrazione che lo raddoppia; "muto" spegne entrambi. La scelta vive in `localStorage`
(`tangentopoly:modo`), non viaggia sulla socket: è del dispositivo, non della partita.

## Come si associa un suono a un'azione

**Rinominandolo.** La cartella è `src/assets/audio/` e il nome del file _è_ il legame con
l'azione: nel codice non si tocca niente, non c'è nessuna tabella da aggiornare.

Quello che esce dalla DAW si chiama come vuole; conta come lo chiami qui dentro:

```bash
mv ~/Desktop/dice_impact_final_v3.wav src/assets/audio/dadi.mp3
mv ~/Desktop/jail_gate.mp3           src/assets/audio/prigione.mp3
```

Da quel momento `dadi.mp3` parte quando i dadi si posano e `prigione.mp3` quando qualcuno
finisce dentro. I nomi validi sono **solo** quelli della colonna `File` nelle due tabelle
qui sotto: quella colonna è l'elenco completo delle azioni a cui puoi attaccare un suono.

- **Formati**: `.mp3`, `.ogg`, `.m4a`, `.wav`. L'mp3 è l'unico che va su tutto. L'estensione
  non conta per l'associazione: `dadi.ogg` e `dadi.mp3` fanno la stessa cosa (uno solo dei
  due, però — non mettere lo stesso nome con due estensioni).
- **Nomi**: minuscoli, senza accenti né spazi, esattamente come in tabella. `Dadi.mp3` o
  `dadi 2.mp3` non vengono mai chiamati.
- Un nome in tabella senza file non suona e non fa 404: la cartella è risolta da Vite a
  build time (`import.meta.glob` in `src/lib/avvisi.ts`), quindi puoi aggiungerli uno alla
  volta e provarli man mano.
- Per togliere un suono, cancella il file. Per cambiarlo, sovrascrivilo.
- Sotto i 4 KB il file finisce inline nel bundle, sopra diventa un asset con hash. In
  entrambi i casi il service worker lo tiene in cache: i suoni non si riscaricano.
- **Volume**: uno solo per tutti, `VOLUME = 0.6` in `src/lib/avvisi.ts`. Il bilanciamento
  fra un suono e l'altro si fa nel file, non nel codice.
- Il browser rifiuta l'audio finché la pagina non ha ricevuto un tocco: il primo avviso di
  una sessione può cadere. Non è un difetto e non si aggira.

## Provare

`pnpm dev`, poi `/dev`: lo scenario **preRoll (io)** e un tocco su _Bancarotta_ fanno
partire `tocco`; **🎴 Pedina→carta→prigione** fa partire `carta` e poi `prigione` ai tempi
veri della coreografia. Se non senti niente, controlla che il bottone in testata sia su
Suono e che il nome del file coincida col carattere.

## Specifica per la produzione in DAW

Regole comuni, valgono per tutti:

- **Mono, 48 kHz.** L'uscita è un altoparlante da telefono: lo stereo non si sente e il
  file pesa il doppio.
- **Niente sotto i 200 Hz.** Un telefono non li riproduce, ma occupano headroom e fanno
  clippare il resto. High-pass a 200 Hz su tutto, senza eccezioni.
- **Picco a −3 dBFS, fade-out finale di almeno 5 ms.** Un troncamento netto fa click su
  ogni riproduzione, ed è la cosa che fa spegnere l'audio agli utenti.
- **Corti.** Sopra i 400 ms un suono di conferma diventa un suono d'attesa. Solo l'asta e
  il debito hanno licenza di durare.
- Ogni suono raddoppia un pattern aptico che esiste già: stessa durata, stesso numero di
  colpi. Se il motore fa due colpi, l'audio ne fa due.

### I quattro che esistono già come vibrazione

I pattern stanno in `AVVISI` (`src/lib/avvisi.ts`): sono gli unici quattro avvisi con un
canale aptico, tutti gli altri sono solo suono.

| File | Quando parte | Aptico | Durata | Carattere |
|---|---|---|---|---|
| `tocco` | il primo tocco di una conferma a due tempi | `20` | 30–50 ms | Click secco, un solo transiente. Nessuna coda, nessuna nota riconoscibile: non è un suono, è la sensazione di un pulsante meccanico. Rumore bianco filtrato in banda stretta intorno a 2 kHz, decay 20 ms. |
| `turno` | il turno passa a te | `40` | 150–250 ms | Due note ascendenti, intervallo di quarta. Sveglia senza allarmare — è un invito, non un errore. Sinusoide o triangolare morbida, attacco 10 ms. |
| `debito` | ti si apre un debito da saldare | `30/60/30` | ~350 ms | Due colpi bussati, stessa spaziatura del pattern. Legno, non campana: opaco, poca coda. Discendente, o almeno non ascendente — deve pesare. |
| `dadi` | i tuoi dadi si posano | `15/45/15` | 200–300 ms | Due impatti secchi e leggermente scomposti, non simmetrici: i dadi non atterrano mai insieme. Legno su legno, decay corto. Randomizza pitch di ±2 semitoni a ogni riproduzione, altrimenti al terzo lancio è una macchina. |

### I muti — quelli che oggi non hanno nessun canale

| File | Quando parte | Durata | Carattere |
|---|---|---|---|
| `acquisto` | una proprietà viene comprata dalla banca | 250–400 ms | Metallico corto, ascendente. Chiude: è la parte più gratificante del turno e deve suonare come un affare fatto. |
| `pagamento` | un giocatore paga qualcuno o la banca | 200 ms | Lo stesso timbro dell'acquisto ma discendente e più smorzato. La coppia si riconosce: stesso mondo, esito opposto. |
| `carta` | esce una carta Blitz o Favori | 150 ms | Attrito di carta. Rumore filtrato con inviluppo a rampa, niente pitch. Deve incuriosire, non dichiarare l'esito — quello lo dice la carta. |
| `rilancio` | qualcuno ti supera in asta | 100 ms | Tick più brillante del `tocco`, sale di un semitono a ogni rilancio fino a +7. La tensione la fa la salita, non il volume. |
| `asta` | l'asta si aggiudica | 400 ms | Colpo di martelletto: transiente forte, coda corta. Unico suono con permesso di essere più forte degli altri. |
| `prigione` | qualcuno finisce dentro | 300 ms | Cancello. Metallico, chiuso, decay lungo che smorza in fretta. Comico più che punitivo — è pur sempre un gioco. |
| `scambio` | ti arriva una proposta di scambio | 150–250 ms | Due tocchi brevi e pari, come due mani che si stringono. Neutro: la proposta non dice se conviene. |

### Fuori perimetro

Nessuna musica di sottofondo. È un gioco a turni che si tiene aperto in una scheda per
mezz'ora: qualsiasi loop, a quella durata, si spegne o si chiude la scheda.

Il tick per casella della pedina che cammina non è collegato: la camminata è
un'animazione CSS senza battuta in JS, quindi il file da solo non basterebbe. Servirebbe un
timer per casella in `choreography.ts`, e a −12 dB rispetto a tutto il resto — dodici tick
di fila a volume pieno sono insopportabili.
