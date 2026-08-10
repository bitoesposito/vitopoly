---
name: Tangentopoly
description: Una plancia che è un foglio di carta valori dello Stato — inchiostri d'intaglio su carta, non un tabellone ri-skinnato.
colors:
  background: "oklch(0.288 0.022 168)"
  foreground: "oklch(0.95 0.012 92)"
  card: "oklch(0.352 0.024 168)"
  popover: "oklch(0.332 0.023 168)"
  sidebar: "oklch(0.318 0.023 168)"
  muted: "oklch(0.41 0.021 168)"
  muted-foreground: "oklch(0.805 0.016 95)"
  secondary: "oklch(0.395 0.022 168)"
  accent: "oklch(0.415 0.024 168)"
  primary: "oklch(0.9 0.014 90)"
  primary-foreground: "oklch(0.19 0.02 168)"
  border: "oklch(0.86 0.02 90 / 16%)"
  input: "oklch(0.86 0.02 90 / 22%)"
  ring: "oklch(0.74 0.132 76)"
  paper: "oklch(0.832 0.018 88)"
  paper-ink: "oklch(0.245 0.022 166)"
  paper-line: "oklch(0.6 0.022 160)"
  verde-valore: "oklch(0.63 0.104 158)"
  bollo: "oklch(0.745 0.132 76)"
  sanguigna: "oklch(0.605 0.163 30)"
  indaco: "oklch(0.565 0.112 262)"
  sanguigna-carta: "oklch(0.44 0.15 30)"
  indaco-carta: "oklch(0.43 0.13 262)"
  serie-puglia: "#7a5c3e"
  serie-calabria: "#456678"
  serie-campania: "#94566a"
  serie-sicilia: "#8f5819"
  serie-lazio: "#a83a26"
  serie-veneto: "#836618"
  serie-liguria: "#2f7a52"
  serie-lombardia: "#24457f"
  # Materiale del dado: un oggetto fisico, non una superficie d'interfaccia. Palette
  # avorio indipendente dal tema (vedi "Vassoio dei Dadi"), qui perché sia verificabile
  # e non legga come deriva dalla palette.
  die-face: "#fbf8f2"
  die-face-shade: "#e7e2d8"
  die-face-deep: "#d7d1c5"
  die-face-edge: "#fffdf8"
  die-face-core: "#f6f3f0"
  die-pip: "#16241e"
  die-pip-one: "#9c3a26"
  die-shadow: "rgb(0 0 0 / .38)"
typography:
  display:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 2rem
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 2rem
  title:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25rem
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1rem
  label:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 0.875rem
    letterSpacing: "0.05em"
  micro:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 600
    lineHeight: 0.75rem
    letterSpacing: "0.08em"
  serie:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.5625rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tabular-nums"
  # Radice della scala: tutto il resto è in rem e ne discende. Non è un gradino
  # della rampa, è il suo fondo — fluido, così l'UI cresce sui viewport larghi
  # senza che i breakpoint ne dipendano.
  root:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "clamp(16px, 12px + 0.32vw, 19px)"
    fontSizeMin: "16px"
    fontSizeMax: "19px"
rounded:
  none: "0"
  die: "0.15em"
spacing:
  hairline: "1px"
  xs: "0.125rem"
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "2rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "oklch(0.9 0.014 90 / 80%)"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    padding: "0 0.875rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.none}"
    height: "2rem"
  button-destructive:
    backgroundColor: "oklch(0.605 0.163 30 / 20%)"
    textColor: "{colors.sanguigna}"
    rounded: "{rounded.none}"
    height: "2rem"
  input-default:
    backgroundColor: "oklch(0.86 0.02 90 / 22% / 30%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
    typography: "{typography.body}"
  card-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "1rem"
  card-panel-sm:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "0.75rem"
  tile-nota:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.none}"
    padding: "0.125rem"
    typography: "{typography.micro}"
  stamp-serie:
    backgroundColor: "{colors.serie-lazio}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.none}"
    size: "1rem"
    typography: "{typography.serie}"
  popover-default:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "0.625rem"
    width: "18rem"
---

# Design System: Tangentopoly

## Overview

**Creative North Star: "La Carta Valori dello Stato"**

La plancia non è un tabellone: è un foglio di carta valori emesso da un'amministrazione che non funziona. La scrivania su cui poggia è inchiostro d'intaglio verde-nero; la nota è carta chiara e sta solo dove la carta esiste davvero (celle della plancia, talloncini dei titoli, carte evento). Tutto il resto — pannelli, roster, chat — è la scrivania: cromo scuro, sobrio, che non compete con il foglio.

Il mondo rifiuta due riferimenti in modo esplicito e verificabile nel codice: il panno verde Hasbro (non esiste nessun verde da tavolo da gioco; il verde è quello d'intaglio dei tagli grossi) e il dark-dashboard-con-un-accento (non c'è un accento unico: ci sono quattro inchiostri, ognuno con un solo mestiere, più otto inchiostri di serie regionali). La densità è alta e l'ornamento è nullo: non c'è decoro, c'è materia — la carta ha una grana, la scrivania ha il tratteggio del bulino, e nient'altro.

Il registro è documentale. Ogni cifra è un numero di serie (mono, tabular), ogni nome di regione è microtesto legale in maiuscoletto spaziato, ogni stato di una nota è una sovrastampa obliqua e non un cambio di colore. L'app è dark-only per costruzione: `.dark` viene applicata in `main.tsx` e il tema light è stato rimosso dal foglio di stile.

**Key Characteristics:**
- Due substrati soli: inchiostro d'intaglio (scrivania) e carta valori (nota).
- Spigolo vivo assoluto: `--radius: 0`.
- Quattro inchiostri funzionali (verde-valore, bollo, sanguigna, indaco) + otto inchiostri di serie regionali.
- IBM Plex in tre tagli: Condensed per la voce del documento, Sans per la prosa, Mono per ogni cifra.
- Il filetto d'incisione al posto del gap: la plancia non ha buio tra le celle.
- Lo stato si timbra sopra, non si colora intorno.

## Colors

Palette di inchiostri da stampa di sicurezza su due substrati opposti: un fondo verde-nero d'intaglio e una carta chiara. Nessun colore è decorativo.

### Primary
- **Carta Piena** (`primary`): l'azione primaria è un rettangolo di carta piena stampato sull'inchiostro. È l'unico elemento dell'interfaccia che usa la carta come *superficie di comando*: tira i dadi, compra, paga, entra.
- **Carta Valori** (`paper`): il substrato della nota. Applicato via `.nota` alle celle della plancia, alle celle dei titoli e ovunque ci sia un foglio fisico. Non è `--card` (vedi *La Regola dei Due Substrati*).
- **Inchiostro d'Intaglio** (`paper-ink`): il testo inciso sulla carta, 13.2:1 sul substrato.

### Secondary
- **Bollo** (`bollo`, esposto come `text-warning`, `ring`): l'ocra della marca da bollo. Aste, scadenze, avvisi, montepremi, e — deliberatamente — l'anello di focus, la selezione di testo e il caret. Il focus in questo mondo è un timbro.
- **Verde Valore** (`verde-valore`, esposto come `text-success`): l'inchiostro dei tagli grossi. Solo denaro incassato ed esito positivo. Ogni cifra di contante del roster è in questo verde.

### Tertiary
- **Sanguigna** (`sanguigna`, anche `destructive`): l'inchiostro d'annullo. Ipoteca, bancarotta, debito, sovrastampa. Mai usata per "importante": solo per "fuori corso".
- **Indaco** (`indaco`): la controfirma. Scambi e informazioni; il mazzo Favori.
- **Sanguigna su Carta** / **Indaco su Carta** (`sanguigna-carta`, `indaco-carta`): gli stessi due inchiostri stampati *sulla* carta chiara. Esistono perché le versioni da fondo scuro stanno sotto 4.5:1 sul substrato chiaro e lì servono a 9px in grassetto.

### Neutral
- **Verde-Nero d'Intaglio** (`background`): la scrivania. Il fondo di tutta la chrome.
- **Nota in Controluce** (`card`, `popover`, `sidebar`): i pannelli. Una gradazione più chiara dello stesso verde-nero, non una tinta diversa.
- **Filetto d'Incisione** (`border`, `paper-line`): la riga incisa. 16% di alpha su fondo scuro, tinta piena sulla carta.
- **Carta Chiara** (`foreground`) e **Carta Spenta** (`muted-foreground`, 6.9:1 su `card`): la coppia di testo sulla scrivania.

### Serie di Taglio (otto inchiostri regionali)
Un inchiostro per regione, in scalata di valore come una serie di banconote: Puglia terra d'ombra, Calabria azzurro slavato, Campania carminio spento, Sicilia ocra bruciata, Lazio sanguigna, Veneto oro bollo, Liguria verde valore, Lombardia indaco profondo. Usati come campo colore (banda sul lato interno della cella, filetto nei pannelli), **mai** come fondo di testo.

### Named Rules
**La Regola dell'Inchiostro Unico.** Ogni inchiostro ha un solo mestiere: verde-valore = denaro incassato, bollo = attesa e scadenza, sanguigna = annullo, indaco = controfirma. Se un elemento nuovo non rientra in uno dei quattro mestieri, resta neutro. Non esistono accenti "per dare colore".

**La Regola dei Due Substrati.** `--card` non è carta. La carta si applica solo dove un foglio esiste fisicamente (celle, talloncini, carte evento) tramite `.nota`; il resto dell'interfaccia è scrivania scura. Un inchiostro che deve vivere su entrambi i substrati esiste in due token (`--sanguigna` / `--sanguigna-carta`), mai in una tinta sola che funziona a metà su tutti e due.

**La Regola della Serie.** Il significato non viaggia mai sul solo colore. La banda di un set porta sempre il nome della regione (in microtesto o via screen reader); l'identità di un giocatore è la sua lettera di serie (A–Z, poi A2, B2… — i posti non hanno tetto, le lettere non si ripetono), non il suo inchiostro di timbro. Gli inchiostri di timbro sono tarati sopra 3:1 su `card` perché sono elementi non testuali.

## Typography

**Display / Heading Font:** IBM Plex Sans Condensed (400/500/600/700) — la voce del documento: plancia, centro, titoli di pannello, etichette in maiuscoletto.
**Body Font:** IBM Plex Sans Variable — prosa, chat, log, descrizioni.
**Label / Mono Font:** IBM Plex Mono (400/500/600) — il registro "numero di serie": ogni cifra di denaro, ogni codice stanza, ogni lettera di serie, ogni microtesto contatore.

**Character:** una sola superfamiglia industriale in tre tagli. La condensed dà la compressione dei moduli stampati, la mono dà l'autorità del numero progressivo, la sans regge la prosa. Nessuna famiglia display, nessuna serif: un foglio d'ufficio non ha voce lirica.

### Hierarchy
- **Display** (mono 700, `text-2xl`, tabular): l'offerta corrente dell'asta e il patrimonio del vincitore. L'unico posto dove una cifra diventa grande.
- **Headline** (condensed 700, `text-2xl`): il nome del vincitore a fine partita. Si porta da solo, senza etichetta sopra.
- **Title** (condensed 700 uppercase, `text-sm`): titoli di card e sezione.
- **Body** (sans 400, `text-xs`, line-height rilassato): righe di lista, chat, descrizioni, log.
- **Label** (`text-2xs`, 0.6875rem, 600, uppercase): etichette, badge, metadati delle celle.
- **Micro** (`text-micro`, 0.5625rem, 600, tracking 0.08em, uppercase): nomi di regione sulle bande, diciture legali, contatori di serie, sovrastampe. È il testo di sicurezza della banconota.
- **Serie** (mono, `text-micro`, leading 1): la lettera di serie sul timbro del giocatore e nell'angolo della cella posseduta.

### Named Rules
**La Regola del Numero di Serie.** Ogni cifra dell'app — denaro, prezzi, offerte, timer, codici stanza, conteggi voti — è `font-mono tabular-nums`. Una cifra in sans è un bug: le colonne di importi devono restare allineate riga su riga.

**La Regola del Microtesto.** Nomi di regione, diciture di stato e testo legale stanno a `text-micro` in maiuscolo con tracking, mai a una taglia "leggibile e basta". La scala piccola è il segnale: quel testo è stampato sulla nota, non scritto dall'interfaccia.

**La Regola della Scala della Plancia.** Il testo della plancia e del centro scalano insieme e per passi (`text-micro` → `sm:text-2xs` → `lg:text-xs` sulle celle; `text-sm` → `md:text-base` → `lg:text-lg` sulle azioni primarie). La sidebar è a larghezza fissa e non scala.

## Layout

Tre colonne su desktop, una su mobile. Da 2xl (96rem) la chat prende una colonna propria a sinistra (20rem); al centro la plancia; a destra la sidebar a larghezza fissa (20rem) con roster, pannelli e chat collassabile. Sotto md (48rem) tutto si impila: plancia in alto, pannelli sotto, chat come bottom-sheet. **Il registro nel centro della plancia porta anche i messaggi di chat**, marcati col timbro d'inchiostro del mittente: la conversazione dentro un foglio chiuso non si vedeva, e il registro è l'unica superficie sempre in vista. Si scrive dal bottom-sheet, si legge lì.

**La plancia** è una griglia 11×11 sempre quadrata, con tracce `1.55fr` agli angoli e `1fr` sui bordi, larga `min(100%, 100dvh - 2.5rem)` da md in su, con `min-h-0` perché l'aspect-square vinca sul min-content delle celle. Il centro occupa il blocco 9×9 interno: dadi in alto, azione primaria subito sotto, log nella metà bassa. La metà alta è ancorata in alto (mai centrata) così che dadi e riga di turno non si spostino quando compaiono prompt e bottoni.

**Ritmo di spaziatura**: passi da 1px (il filetto), 0.125rem, 0.25rem, 0.5rem, 0.75rem, 1rem e 1.25rem. I pannelli usano una variabile propria (`--card-spacing`: 1rem, 0.5rem in taglia `sm`) invece di padding sparsi — e `sm` è la taglia di TUTTE le card dell'app, quindi 0.5rem è il padding di ogni pannello, uguale alla cornice della chat che gli sta accanto nella stessa colonna. Il gutter di pagina è 0.5rem da md in su, ed è lo stesso su tutte e tre le colonne.

**Le colonne a lettura singola** (home e pre-partita: una colonna centrata, `max-w-md`) hanno UN ritmo solo, e non è negoziabile per schermata: gutter `1.25rem`, `1.25rem` fra le sezioni, `0.5rem` dentro una sezione, `0.75rem` dopo un filetto. La pre-partita aveva il suo (2rem fra le sezioni, 0.75 dentro) e le due schermate consecutive del percorso d'ingresso non si somigliavano. **Dentro un pannello** il ritmo è più stretto e discende dalla stessa scala: `0.5rem` fra i blocchi, `0.25rem` nelle liste dense, `0.375rem` solo per la coppia icona+etichetta in linea. Non esistono `0.625rem` né `1.5rem`.

**Scala fluida**: la radice è `clamp(16px, 12px + 0.32vw, 19px)` e tutta l'UI è in rem — l'interfaccia cresce dolcemente sui viewport larghi senza che i breakpoint ne dipendano. Breakpoint usati: sm 40rem, md 48rem (lo switch di layout), lg 64rem, xl 80rem, 2xl 96rem (la colonna chat).

### Named Rules
**La Regola del Filetto.** Tra due note non c'è buio: c'è una riga incisa. Le griglie separano con `gap-px` su fondo `paper-line`, mai con uno spazio vuoto sul fondo scuro, e la cornice esterna è lo stesso filetto. 1px, mai una banda.

**La Regola dell'Azione Singola.** Sotto i dadi c'è una sola zona d'azione: qualunque decisione (tira, compra, paga il debito, esci di prigione) compare lì e non altrove. Le azioni primarie sono in taglia `lg` (44px) perché il prodotto si gioca al telefono.

## Elevation & Depth

Il sistema è **piatto sul foglio**. La profondità sulla plancia non si fa con le ombre: si fa con il filetto inciso, con la velatura d'inchiostro del proprietario sulla carta (8–16% in `color-mix`) e con la grana del substrato. Sulla scrivania la gerarchia è tonale: `background` → `sidebar` → `popover` → `card` sono quattro gradazioni dello stesso verde-nero, separate da un anello a 1px (`ring-foreground/25`).

L'ombra esiste **solo dove un oggetto è fisicamente staccato dal foglio**: il dado in aria e il bottom-sheet della chat che si solleva sopra la pagina su mobile.

### Shadow Vocabulary
- **Ombra del dado** (`box-shadow: 0 .05em .1em rgb(0 0 0 / .38)` sulle singole facce): in em, quindi scala con il dado. È l'ombra di un oggetto tridimensionale, non un livello d'interfaccia. Sta sulle facce e **non** come `filter` sul contenitore: un filtro su un antenato appiattisce il contesto 3D dei discendenti, e durante il lancio le facce venivano proiettate schiacciate.
- **Sollevamento del bottom-sheet** (`box-shadow: 0 -8px 20px -6px rgb(0 0 0 / .45)`): solo sul pannello chat mobile, che scorre sopra la plancia.

### Named Rules
**La Regola della Sovrastampa.** Lo stato di una nota non si comunica cambiando colore al bordo o al fondo: si timbra sopra. IPOTECATO, ANNULLATO, il giocatore fuori — sempre un timbro obliquo (−11°) in sanguigna con doppia riga e fondo `color-mix(paper 62%)`, in microtesto condensed a tracking 0.14em, `pointer-events: none`.

**La Regola del Piano Piatto.** Un elemento nuovo nasce senza ombra. Se ha bisogno di distinguersi, prende un filetto o un gradino tonale; l'ombra si aggiunge solo se l'oggetto è davvero sollevato dal piano.

## Shapes

**Spigolo vivo, senza eccezioni sull'interfaccia.** `--radius: 0`: ogni `rounded-*` derivato dalla scala è un no-op, e i primitivi shadcn dichiarano `rounded-none` esplicitamente. Non esiste raggio d'interfaccia in questo mondo: la carta valori è tagliata a ghigliottina.

Le forme ricorrenti sono tre: il **rettangolo di carta** (cella, talloncino, carta evento), la **banda d'inchiostro** (4px sul lato interno della cella, 1px come filetto nei pannelli) e il **timbro quadro** (16–24px, lettera di serie in negativo su inchiostro del giocatore, anello `paper-ink/50`).

La **texture** è materia, non ornamento, e vive in due token. `--grana` è un rumore frattale finissimo (SVG inline, opacità .055) applicato a ogni superficie `.nota`: senza, la carta è solo un rettangolo chiaro. `--tratteggio` è un reticolo diagonale a 45 gradi con alpha .016 sul fondo pagina: è il bulino della scrivania, percepibile solo di sfuggita. Nessuna delle due si vede guardandola: si vedono togliendole.

L'unico raggio del progetto è `0.15em` sulle facce del dado: è la smussatura di un oggetto fisico, non un raggio d'interfaccia.

### Named Rules
**La Regola della Materia.** Le texture non si disegnano, si sentono: se una texture si nota come motivo invece che come superficie, è troppo forte. Un rosone guilloche a piena opacità è stato rimosso proprio per questo — a schermo diventava l'elemento dominante.

## Components

### Buttons
- **Shape:** rettangolo netto (0 raggio), bordo trasparente in `bg-clip-padding`, testo `text-xs` 500.
- **Primary (`default`):** carta piena su inchiostro (`primary` / `primary-foreground`), altezza 36px, padding orizzontale 10px. Hover: carta all'80%.
- **Taglie — tre altezze, una regola.** `lg` 44px = *l'azione* del momento (tira, compra, accetta uno scambio, inizia, rigioca); `default` 36px = ogni altra azione vera (rilanci d'asta, azioni su una proprietà, invio); `sm` 32px = contorno (intestazioni di pannello, azioni-collegamento in una riga di lista). `xs` 24px e le varianti icona 24/28/36px restano solo per i controlli inline nel testo e per la cromatura a sola icona. Su puntatore grosso (`pointer-coarse`) `default` sale a 44px: sul telefono nessuna azione vera scende sotto il minimo tattile.
- **Coppie campo+bottone:** `default` ha la STESSA altezza dell'Input, alle due misure. Un bottone affiancato a un campo si allinea da sé, senza altezze scritte a mano — se non è allineato, è la taglia che è sbagliata.
- **Focus:** bordo + anello a 1px in `ring` (l'ocra del bollo). Mai anello ad alpha 50% su fondo scuro: sta sotto 3:1.
- **Active:** `translateY(1px)` — la pressione di un timbro, non un rimbalzo.
- **Secondary:** gradino tonale (`secondary`) con hover per `color-mix` verso il foreground. **Ghost:** trasparente, hover su `muted`. **Destructive:** sanguigna al 20% di fondo con testo sanguigna, mai un blocco rosso pieno.

### Cards / Containers
- **Corner Style:** nessuno (`rounded-none` esplicito).
- **Background:** `card`, con anello `ring-1 ring-foreground/10` invece di un bordo pieno.
- **Shadow Strategy:** nessuna (vedi *La Regola del Piano Piatto*).
- **Internal Padding:** `--card-spacing` = 1rem, 0.5rem in taglia `sm` (dichiarata sull'elemento in `card.tsx`, non nel tema).
- **Title:** condensed, maiuscolo, bold, `text-sm`.

### Inputs / Fields
- **Style:** altezza 36px (44px su `pointer-coarse`, come `Button` taglia `default`), fondo `input/30`, bordo 1px `input`, spigolo vivo, `text-xs`.
- **Focus:** il bordo passa a `ring` più anello 1px a 50% — nessun glow.
- **Numerici:** sempre `font-mono tabular-nums` con `inputMode="numeric"`.
- **Error:** bordo e anello `destructive`; l'errore ha comunque una riga di testo (`text-2xs text-destructive`) che dice perché.

### Cella della Plancia (`.nota`)
Il componente firma. Rettangolo di carta con tre slot ad altezza fissa — nome sopra, stato al centro, prezzo sotto — così le celle adiacenti restano allineate. Sul lato interno una banda da 4px: l'inchiostro della serie regionale dove c'è un set, il filetto neutro dove non c'è (mai una striscia vuota). Il possesso è una velatura d'inchiostro del proprietario sulla carta (16%, 8% se ipotecata), non un bordo colorato. Il marchio della casella è una filigrana centrale al 45% di `paper-line`, sotto il testo. L'angolo in alto a sinistra porta la lettera di serie del proprietario. Hover: anello interno `paper-line` a 1px.

### Timbro di Serie
Quadro netto di 16–24px, fondo nell'inchiostro del giocatore, lettera mono in `paper-ink` in negativo, anello `paper-ink/50`. È la stessa marca sulla pedina, nel roster, in chat e nella classifica finale: l'identità che non passa dal colore. Il turno corrente ingrandisce il timbro, aggiunge un anello con offset e un `animate-ping` al 35%.

### Carta Evento
Rettangolo `card` largo 12–18rem, bordo colorato con l'inchiostro del mazzo (sanguigna per il Blitz, indaco per i Favori, verde per l'acquisto, bollo per lo scambio) e barra da 4px in testa nello stesso inchiostro — o nell'inchiostro della serie regionale quando la carta riguarda un titolo. Titolo in `text-2xs` maiuscolo a tracking 0.18em con marchio. Le carte si impilano: le più vecchie salgono di 12px, ruotano di ±2° e scalano di 0.04 per livello. Durata di permanenza = tempo di lettura (1400ms + 28ms per carattere, max 3200ms).

### Vassoio dei Dadi
Cubo a 6 facce con pip reali, geometria interamente in em (`--die` = lato: 3rem → 3.5rem → 4rem per breakpoint). Palette avorio classica indipendente dal tema, pip in inchiostro d'intaglio `#16241e`, l'uno in sanguigna `#9c3a26`. Nessuna `perspective` a riposo (proiezione ortografica: faccia frontale pulita, zero artefatti agli angoli); la prospettiva vive *dentro* i keyframe del lancio. Hover: inclinazione 3D opposta sui due dadi. Il vassoio è cliccabile ed è la scorciatoia per il puntatore, non un secondo stop di tastiera.

### Motion
Una sola curva d'ingresso per le carte e le chip (`cubic-bezier(0.22, 1, 0.36, 1)`, 450–550ms), uscita rapida in `ease-in` (240ms). Il tumble del dado dura 880ms/1000ms in `cubic-bezier(.35, .1, .3, .9)`; l'assestamento sulla faccia uscita usa `cubic-bezier(.2, .9, .3, 1.15)`, **un overshoot voluto**: è un dado che si posa, l'unico rimbalzo autorizzato del sistema. Le pedine camminano lungo la polilinea dei centri cella con ease-out cubica (~245ms per passo breve, con tetto sulle corse lunghe): seguono il bordo, non tagliano la plancia. `prefers-reduced-motion` comprime tutto a 150–200ms.

## Do's and Don'ts

### Do:
- **Do** applicare la carta (`.nota`) solo dove un foglio esiste fisicamente; il resto dell'interfaccia è scrivania scura.
- **Do** stampare ogni cifra in `font-mono tabular-nums`, sempre, anche una sola.
- **Do** separare le celle con `gap-px` su fondo `paper-line` e incorniciare con lo stesso filetto.
- **Do** accompagnare ogni banda di colore con la sua etichetta (regione, stato, lettera di serie): il significato non viaggia mai sul solo colore.
- **Do** usare `--sanguigna-carta` / `--indaco-carta` quando l'inchiostro va sulla carta chiara, e le versioni base solo su fondo scuro.
- **Do** dare taglia `lg` (44px) a ogni azione primaria di gioco.
- **Do** comunicare lo stato con una sovrastampa obliqua, in microtesto condensed a tracking largo.

### Don't:
- **Don't** introdurre raggi: `--radius` è 0 e ogni `rounded-*` derivato è un no-op. L'unico raggio del progetto è la smussatura in em delle facce del dado.
- **Don't** ripuntare `--card` sulla carta: un solo `muted-foreground` serve chrome scura e superfici chiare, e il ribaltamento renderebbe illeggibile ogni testo secondario del codebase.
- **Don't** aggiungere un quinto inchiostro funzionale o riusare i quattro esistenti fuori dal loro mestiere (niente sanguigna per "importante", niente bollo per "primario").
- **Don't** introdurre un motivo decorativo riconoscibile: la texture è grana e tratteggio, mai un disegno che si guarda.
- **Don't** usare gli inchiostri di serie regionali come fondo di testo o colorare con essi il nome di un giocatore.
- **Don't** mettere un occhiello o un'etichetta sopra un titolo: il titolo si porta da solo.
- **Don't** aggiungere ombre a elementi che poggiano sul piano; l'ombra è riservata a ciò che è davvero sollevato.
- **Don't** usare un anello di focus ad alpha ridotta su fondo scuro: sta sotto 3:1.
