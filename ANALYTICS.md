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
| `blob4` | pid: l'UUID casuale del browser. Non dice chi sei, dice se sei lo stesso di ieri |
| `blob5` | paese, dall'intestazione `CF-IPCountry` |
| `blob6` | dispositivo: `telefono` · `tablet` · `desktop`, stimato dall'User-Agent |
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
SELECT sumIf(_sample_interval, blob1 = 'stanza')   AS stanze_aperte,
       sumIf(_sample_interval, blob1 = 'ingresso') AS ingressi,
       sumIf(_sample_interval, blob1 = 'azione')   AS azioni,
       sumIf(_sample_interval, blob1 = 'fine')     AS partite_finite,
       sumIf(_sample_interval, blob2 = 'abbandonata') AS abbandonate
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

---

# Due sorgenti, e perché

**Analytics Engine** è lo stream: ogni momento diventa un punto, si guarda nel tempo, tiene
3 mesi. A bassi volumi però è **approssimativo**: misurato su 20 punti scritti a mano, ne
sono arrivati ~17, e l'ingestione impiega qualche minuto. Va benissimo per le tendenze e per
i grafici; non per dire "ho fatto esattamente 12 partite".

**D1** è il registro: una riga per partita, una per partecipante, esatte e incrociabili. È
la fonte per i conteggi, le durate, chi ha giocato e quante volte.

### Il dialetto è un sottoinsieme, non ClickHouse intero

Provato una per una contro la SQL API, perché il dialetto è un sottoinsieme e non si indovina:

| Funziona | Non funziona |
|---|---|
| `count(DISTINCT x)` | `uniq`, `uniqExact`, `countDistinct` |
| `countIf(cond)`, `sumIf(col, cond)` | `CASE WHEN … THEN … END` |
| `SUM(IF(cond, col, 0))` | `toStartOfInterval(ts, INTERVAL 15 MINUTE)` |
| `toStartOfHour`, `toStartOfMinute` | |

In dubbio si sonda con `SELECT 'ciao' AS m` e si aggiunge un pezzo per volta. Nota che
questi limiti valgono per **Analytics Engine**: il registro su D1 è SQLite normale, dove
`CASE WHEN` e le CTE ci sono.

## La dashboard: Grafana Cloud su Analytics Engine

Grafana non ha un datasource per Analytics Engine, ma la SQL API parla ClickHouse: si usa il
**plugin ClickHouse di Altinity**.

1. Account su Grafana Cloud (piano gratuito), poi **Connections → Add new connection →
   ClickHouse (Altinity)** e installa il plugin.
2. Configura il datasource così:
   - **URL**: `https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql`
   - tutte le autenticazioni integrate **disattivate**
   - un header HTTP personalizzato: nome `Authorization`, valore `Bearer <TOKEN>` — lo stesso
     token con `Account Analytics: Read` che sta in `~/.cf-analytics-token`
3. Nei pannelli, `$timeSeries` e `$timeFilter` sono macro del plugin: fanno l'arrotondamento
   e il filtro temporale seguendo lo zoom del grafico.

Query pronte da incollare nei pannelli:

```sql
-- azioni nel tempo, a mano contro automatiche
SELECT $timeSeries AS t, blob3 AS come, SUM(_sample_interval) AS n
FROM tangentopoly WHERE $timeFilter AND blob1 = 'azione' GROUP BY come, t ORDER BY t
```

```sql
-- ingressi per dispositivo
SELECT $timeSeries AS t, blob6 AS dispositivo, SUM(_sample_interval) AS n
FROM tangentopoly WHERE $timeFilter AND blob1 = 'ingresso' GROUP BY dispositivo, t ORDER BY t
```

```sql
-- l'imbuto, come tabella
SELECT blob1 AS evento, SUM(_sample_interval) AS n
FROM tangentopoly WHERE $timeFilter GROUP BY evento
```

```sql
-- persone distinte per paese
SELECT blob5 AS paese, count(DISTINCT blob4) AS persone
FROM tangentopoly WHERE $timeFilter AND blob1 = 'ingresso' GROUP BY paese ORDER BY persone DESC
```

**D1 non è un datasource di Grafana.** Per portarci anche il registro esatto servirebbe una
rotta JSON protetta sul worker più il plugin Infinity: si fa, ma prima vale la pena vedere
se i pannelli su Analytics Engine ti bastano.

## Il registro: interrogare D1

```bash
pnpm --filter @tangentopoly/server exec wrangler d1 execute tangentopoly-partite --remote --command "SELECT esito, COUNT(*) n FROM partite GROUP BY esito"
```

Le domande che hai fatto, in SQL:

```sql
-- quante partite, come sono finite, quanto sono durate
SELECT esito, COUNT(*) AS partite, ROUND(AVG(durata_s) / 60.0, 1) AS minuti_medi,
       MAX(durata_s) / 60 AS piu_lunga_min
FROM partite GROUP BY esito;

-- partite per giorno
SELECT date(chiusa_il / 1000, 'unixepoch') AS giorno, COUNT(*) AS partite,
       ROUND(AVG(durata_s) / 60.0, 1) AS minuti_medi
FROM partite GROUP BY giorno ORDER BY giorno DESC LIMIT 14;

-- chi gioca, quanto, e da quando
SELECT MAX(nome) AS nome, pid, COUNT(DISTINCT codice) AS partite,
       date(MIN(entrato_il) / 1000, 'unixepoch') AS prima_volta,
       SUM(bancarotta) AS bancarotte
FROM partecipanti WHERE spettatore = 0 GROUP BY pid ORDER BY partite DESC LIMIT 20;

-- nuovi contro di ritorno, per giorno
WITH prime AS (SELECT pid, MIN(entrato_il) AS p FROM partecipanti GROUP BY pid)
SELECT date(pa.entrato_il / 1000, 'unixepoch') AS giorno,
       SUM(CASE WHEN pa.entrato_il = pr.p THEN 1 ELSE 0 END) AS nuovi,
       SUM(CASE WHEN pa.entrato_il > pr.p THEN 1 ELSE 0 END) AS di_ritorno
FROM partecipanti pa JOIN prime pr USING (pid)
GROUP BY giorno ORDER BY giorno DESC LIMIT 14;

-- dispositivi e paesi delle persone vere
SELECT dispositivo, paese, COUNT(DISTINCT pid) AS persone, COUNT(*) AS ingressi
FROM partecipanti GROUP BY dispositivo, paese ORDER BY ingressi DESC;

-- chi vince
SELECT vincitore, COUNT(*) AS vittorie, ROUND(AVG(vincitore_cassa)) AS cassa_media
FROM partite WHERE esito = 'finita' GROUP BY vincitore ORDER BY vittorie DESC;

-- quanto gioca il server al posto della gente
SELECT SUM(azioni_umane) AS a_mano, SUM(azioni_auto) AS automatiche,
       ROUND(100.0 * SUM(azioni_auto) / NULLIF(SUM(azioni_umane + azioni_auto), 0), 1) AS percento_auto
FROM partite;
```

## Le visite: Cloudflare Web Analytics

Visite, pagine viste, provenienza, browser e Core Web Vitals riguardano chi **apre** l'app, e
il server non li vede: quelli li dà Cloudflare Web Analytics, gratis e senza cookie, con una
dashboard sua. Va abilitato dal dashboard sul dominio del client e aggiunto uno snippet in
`index.html`. È l'unico pezzo che il repo non copre ancora.
