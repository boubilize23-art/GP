import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* ───────────────────────────────────────────────────────────────────────────────
 *  Application installable (PWA)
 *
 *  Le service worker permet d'installer GestioPro sur Android et iPhone
 *  (icône, plein écran) et de conserver l'application consultable hors ligne.
 *  Uniquement en production : en développement, il masquerait les modifications
 *  en cours.
 * ─────────────────────────────────────────────────────────────────────────────── */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.info(
          "[GestioPro] Service worker actif — application installable (PWA).",
          registration.scope
        );
      })
      .catch((err) => {
        console.warn(
          "[GestioPro] Service worker non enregistré (navigation privée ?) :",
          err
        );
      });
  });
}
