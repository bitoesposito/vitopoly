import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";

// sempre modalità scura
document.documentElement.classList.add("dark");

// L'app installata: il worker sta in public/sw.js e non passa dal bundle. Solo in
// produzione — in sviluppo metterebbe in cache gli URL di Vite e ammazzerebbe l'HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// Dev-only screen simulator: /dev in dev builds. DEV=false in prod → chunk never bundled.
const DevBar = import.meta.env.DEV && location.pathname === "/dev" ? lazy(() => import("./dev/DevBar.tsx")) : null;

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
);
