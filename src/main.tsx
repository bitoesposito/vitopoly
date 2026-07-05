import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { Toaster } from "@/components/ui/sonner"

document.documentElement.classList.add("dark") // always dark; shadcn tokens need the class

// Dev-only screen simulator: /dev in dev builds. DEV=false in prod → chunk never bundled.
const DevBar = import.meta.env.DEV && location.pathname === "/dev" ? lazy(() => import("./dev/DevBar.tsx")) : null

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
    {DevBar && (
      <Suspense>
        <DevBar />
      </Suspense>
    )}
  </StrictMode>
)
