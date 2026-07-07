import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
})
