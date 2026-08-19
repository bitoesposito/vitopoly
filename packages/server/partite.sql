-- Il registro delle partite. Applicato con:
--   pnpm --filter @tangentopoly/server exec wrangler d1 execute tangentopoly-partite --remote --file partite.sql
-- Una riga per partita, una per partecipante: così "quante partite" è un conteggio esatto e
-- "chi ha giocato" è una join, non una stima.

CREATE TABLE IF NOT EXISTS partite (
  codice        TEXT PRIMARY KEY,   -- la stanza. Riscrivibile: la riga si aggiorna a fine partita
  aperta_il     INTEGER NOT NULL,   -- ms epoch: primo ingresso nella stanza
  iniziata_il   INTEGER,            -- quando è partita davvero (NULL = mai iniziata)
  chiusa_il     INTEGER,            -- fine partita o sfratto della stanza
  durata_s      INTEGER,            -- da iniziata_il a chiusa_il, in secondi
  esito         TEXT,               -- finita | abbandonata | mai iniziata
  giocatori     INTEGER NOT NULL,
  falliti       INTEGER,
  vincitore_pid TEXT,
  vincitore     TEXT,               -- il nome scelto in lobby
  vincitore_cassa INTEGER,
  azioni_umane  INTEGER DEFAULT 0,
  azioni_auto   INTEGER DEFAULT 0   -- quante volte il server ha giocato al posto di qualcuno
);

CREATE TABLE IF NOT EXISTS partecipanti (
  codice      TEXT NOT NULL,
  pid         TEXT NOT NULL,        -- l'UUID casuale del browser: non dice chi sei, dice se sei tornato
  nome        TEXT,
  inchiostro  INTEGER,              -- il token/colore, 0..7
  paese       TEXT,
  dispositivo TEXT,                 -- telefono | tablet | desktop
  entrato_il  INTEGER NOT NULL,
  spettatore  INTEGER DEFAULT 0,
  ua          TEXT,                 -- User-Agent grezzo, troncato: il dispositivo per esteso
  ip          TEXT,                 -- CF-Connecting-IP: è un dato personale, sta solo qui
  bancarotta  INTEGER,
  cassa       INTEGER,              -- contante a fine partita
  PRIMARY KEY (codice, pid)
);

CREATE INDEX IF NOT EXISTS partecipanti_pid ON partecipanti (pid);
CREATE INDEX IF NOT EXISTS partite_chiuse ON partite (chiusa_il);
