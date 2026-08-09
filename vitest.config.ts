import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Config dei test tenuta separata da quella di Vite: infilare `test` dentro
// vite.config.ts costringe a importare defineConfig da "vitest/config", e lì i tipi dei
// plugin di Vite non combaciano più. mergeConfig eredita gli alias, che restano definiti
// una volta sola.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        reporter: ["text-summary", "text"],
        // La soglia vale SOLO dove il numero significa qualcosa: il motore è l'autorità
        // sulle regole ed è testabile per intero senza DOM. Sui componenti la copertura è
        // zero per costruzione (non c'è un harness DOM) e una soglia globale inviterebbe
        // solo a scrivere test finti per alzare la percentuale.
        //
        // Misurato: 81,2 istruzioni / 79,1 rami / 84 funzioni / 90,5 righe. Le soglie
        // stanno qualche punto sotto: abbastanza strette da scattare su una regressione,
        // abbastanza larghe da non essere ballerine. Verificate alzandole a 95 e
        // guardandole fallire — un cancello che non si è visto fallire non è un cancello.
        thresholds: {
          "packages/game/src/**": { statements: 85, branches: 74, functions: 80, lines: 86 },
        },
      },
    },
  })
);
