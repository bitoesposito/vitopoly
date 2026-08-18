# Analytics

Come va il gioco, senza sapere niente di chi gioca: nessun nome, nessun messaggio, nessun
indirizzo IP. Solo i cinque momenti che compongono l'imbuto, scritti su **Workers Analytics
Engine** (piano Free: 100k punti al giorno, 10k query, 3 mesi di retention; oggi non è
fatturato).

Il dataset si chiama `tangentopoly` e **non va creato**: nasce alla prima scrittura. Il
binding è in `packages/server/wrangler.toml`, lo schema in `packages/server/src/metriche.ts`.

## I cinque momenti

| Evento | Dove scatta | Cosa risponde |
|---|---|---|
| `stanza` | `POST /api/room` (`index.ts`) | quante stanze nascono. È l'unico posto possibile: creare un codice non tocca il Durable Object |
| `ingresso` | connessione WebSocket (`room.ts`) | quanti si siedono, quanti restano a guardare e perché |
| `azione` | ogni azione applicata, umana o automatica | cosa fa la gente, e quante volte gioca il server al posto suo |
| `fine` | la partita raggiunge `ended` | quante partite finiscono davvero |
| `sfratto` | la stanza si autocancella | come è morta: `finita`, `abbandonata`, `mai iniziata` |

## Lo schema

Un punto ha un indice, tre blob e tre numeri. **Le posizioni sono un contratto**: le query
qui sotto leggono `blob1..3` e `double1..3` per posizione, e
`packages/server/src/metriche.test.ts` è il cancello che lo protegge. Aggiungere un campo in
coda è gratis, cambiare l'ordine rompe tutto in silenzio.

| Campo | Contenuto |
|---|---|
| `index1` | codice stanza. È anche la chiave di campionamento: i punti di una partita vengono tenuti o scartati insieme, così l'imbuto non si sfalsa |
| `blob1` | evento: `stanza` · `ingresso` · `azione` · `fine` · `sfratto` |
| `blob2` | dettaglio: (ingresso) `posto`/`spettatore` · (azione) tipo di azione · (sfratto) come è morta |
| `blob3` | come: (ingresso) perché non si è seduto · (azione) `umano`/`timeout` |
| `double1` | giocatori al tavolo in quel momento |
| `double2` | (fine) quanti sono falliti |
| `double3` | (fine) contante del vincitore |

La **durata** non è un campo: si ricava dai timestamp dei punti della stessa stanza
(`max(timestamp) - min(timestamp) GROUP BY index1`). Stessa cosa per il numero di turni,
che è il conteggio delle `azione`.

## Leggere i dati

Un comando:

```bash
node scripts/metriche.mjs
```

Stampa l'imbuto, come sono morte le stanze, cosa fa la gente contro cosa fa il server al
posto suo, chi è restato a guardare e le stanze più vive. `GIORNI=30` per allargare la
finestra. Vuole il token in `~/.cf-analytics-token` e l'id account in `~/.cf-account-id`
(fuori dal repo, come in `deploy.yml`).

**Per Analytics Engine non esiste una pagina nel dashboard**: la SQL API è l'unica via, e
`SUM(_sample_interval)` sostituisce `count()` in ogni conteggio — se un giorno scattasse il
campionamento, contare le righe darebbe numeri più bassi del vero senza dirlo.

### La seconda finestra: i log

Ogni punto viene anche stampato come una riga JSON, e i log **hanno** una pagina nel
dashboard: worker → *Observability* → *Logs*, filtro sul campo `metrica`. I campi sono
indicizzati, quindi si cerca per `metrica = "sfratto"` o `stanza = "zjxk2p"` senza scrivere
SQL né usare un token. Due finestre sulla stessa cosa: i log tengono 3 giorni e si guardano
subito, il dataset tiene 3 mesi e risponde alle domande aggregate.

A mano, la stessa cosa:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/analytics_engine/sql" -H "Authorization: Bearer $(cat ~/.cf-analytics-token)" --data "SELECT blob1 AS evento, count() AS n FROM tangentopoly WHERE timestamp > now() - INTERVAL '7' DAY GROUP BY evento"
```

### L'imbuto, in una query

```sql
SELECT
  countIf(blob1 = 'stanza')                          AS stanze_aperte,
  uniqExactIf(index1, blob1 = 'ingresso')            AS stanze_con_qualcuno,
  uniqExactIf(index1, blob1 = 'azione')              AS stanze_che_hanno_giocato,
  uniqExactIf(index1, blob1 = 'fine')                AS partite_finite,
  uniqExactIf(index1, blob2 = 'abbandonata')         AS partite_abbandonate
FROM tangentopoly
WHERE timestamp > now() - INTERVAL '7' DAY
```

### Quanto durano le partite

```sql
SELECT index1 AS stanza,
       dateDiff('minute', min(timestamp), max(timestamp)) AS minuti,
       countIf(blob1 = 'azione')                          AS azioni,
       maxIf(double1, blob1 = 'ingresso')                 AS giocatori
FROM tangentopoly
WHERE timestamp > now() - INTERVAL '7' DAY
GROUP BY stanza
HAVING azioni > 0
ORDER BY minuti DESC
```

### Cosa fa la gente, e quanto gioca il server al posto suo

```sql
SELECT blob2 AS azione,
       countIf(blob3 = 'umano')   AS a_mano,
       countIf(blob3 = 'timeout') AS automatiche
FROM tangentopoly
WHERE blob1 = 'azione' AND timestamp > now() - INTERVAL '7' DAY
GROUP BY azione ORDER BY a_mano + automatiche DESC
```

Un rapporto `automatiche/a_mano` che sale è il segnale di gente che abbandona a metà
partita — o di un timer troppo corto.

### Chi guarda invece di giocare

```sql
SELECT blob3 AS motivo, count() AS n
FROM tangentopoly
WHERE blob1 = 'ingresso' AND blob2 = 'spettatore' AND timestamp > now() - INTERVAL '30' DAY
GROUP BY motivo ORDER BY n DESC
```

## Cosa NON c'è, e perché

- **Nessun dato personale.** Il `pid` è un UUID casuale in localStorage e non viene mai
  scritto: non serve per nessuna di queste domande. Niente nomi, niente chat.
- **Nessun log delle partite.** Il registro eventi vive nella stanza e muore con lei. Se
  servisse tenerlo, il posto giusto è un oggetto R2 per partita, non questo dataset.
- **Nessuna analitica del client.** Quante persone aprono l'app, da dove, e i Core Web
  Vitals li dà Cloudflare Web Analytics (gratis, senza cookie) e va abilitato dal dashboard
  sul dominio del client, non da qui.
- **Nessun allarme automatico.** Per ora si guarda quando si vuole guardare; la sveglia,
  se servirà, si costruisce sopra queste query.
