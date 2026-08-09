import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Treat the workspace game package as project source so Vite transpiles its TS.
      "@tangentopoly/game": path.resolve(__dirname, "./packages/game/src/index.ts"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      // La soglia vale SOLO dove il numero significa qualcosa: il motore è l'autorità
      // sulle regole ed è testabile per intero senza DOM. Sui componenti la copertura
      // è zero per costruzione (non c'è un harness DOM) e una soglia globale
      // inviterebbe solo a scrivere test finti per alzare la percentuale.
      thresholds: {
        "packages/game/src/**": { statements: 93, branches: 85, functions: 85, lines: 93 },
      },
    },
  },
});
