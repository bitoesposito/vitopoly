import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

// sempre modalità scura
document.documentElement.classList.add("dark")

// Dev-only screen simulator: /dev in dev builds. DEV=false in prod → chunk never bundled.
const DevBar = import.meta.env.DEV && location.pathname === "/dev" ? lazy(() => import("./dev/DevBar.tsx")) : null

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider delayDuration={200}>
      <App />
      <Toaster />
      {DevBar && (
        <Suspense>
          <DevBar />
        </Suspense>
      )}
    </TooltipProvider>
  </StrictMode>
)
