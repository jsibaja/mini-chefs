import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "minichefs.pwa_install_dismissed_at";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/** Prompt de instalación PWA con instrucciones iOS y evento nativo Android/Chrome. */
export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    if (isIOS()) {
      setIosMode(true);
      setVisible(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const close = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 shadow-lift lg:bottom-6">
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-primary/10 text-primary">
          {iosMode ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold text-deep-green">
            Instala MiniChefs en tu teléfono
          </p>
          {iosMode ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Toca <Share className="inline h-3 w-3" /> Compartir en Safari y luego{" "}
              <strong>Agregar a la pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ábrelo desde tu pantalla principal, sin buscador ni pestañas.
            </p>
          )}
          {!iosMode && (
            <button
              type="button"
              onClick={install}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft"
            >
              Instalar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
