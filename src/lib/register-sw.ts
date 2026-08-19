/**
 * Registra el service worker SOLO en producción y fuera de previews de Lovable.
 * Cumple con la política PWA del proyecto: nada de service workers en el editor.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isPreview =
    inIframe ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";

  if (isPreview || killSwitch) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL?.endsWith("/sw.js")) r.unregister();
      });
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[MiniChefs] SW no registrado:", err);
    });
  });
}
