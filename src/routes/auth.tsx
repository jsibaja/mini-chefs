import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresa a MiniChefs" },
      { name: "description", content: "Inicia sesión en tu cuenta de MiniChefs." },
    ],
  }),
  component: AuthPage,
});

// El acceso es solo para suscriptores. No hay registro abierto: las cuentas se
// crean al confirmarse el pago (Hotmart) mediante el webhook del servidor.
// Aquí solo se permite iniciar sesión y recuperar la contraseña.
type Mode = "login" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // A qué correo enviamos el enlace (para dar instrucciones claras después).
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("¡Bienvenido de vuelta!");
        navigate({ to: "/hoy" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo(email);
        setMode("login");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo salió mal, intenta de nuevo.";
      toast.error(traducirError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link
          to="/"
          className="mb-6 flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <img src="/images/ui/icono-pwa-512.webp" alt="" className="h-12 w-12 rounded-2xl shadow-soft" />
          <span className="font-display text-2xl font-bold text-deep-green">MiniChefs</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground">
          {mode === "login" ? "Ingresa a tu cuenta" : "Recupera tu contraseña"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Ingresa con el correo de tu suscripción."
            : "Te enviaremos un enlace para restablecerla."}
        </p>

        {sentTo && (
          <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-5">
            <p className="font-display text-base font-bold text-primary">Revisa tu correo 📬</p>
            <p className="mt-1 text-sm text-foreground">
              Enviamos un enlace a <strong>{sentTo}</strong> para crear tu contraseña nueva. El
              enlace sirve por poco tiempo, así que úsalo pronto.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              ¿No te llega? Mira en la carpeta de spam o correo no deseado. Si en unos minutos sigue
              sin aparecer, escríbenos y te ayudamos a entrar.
            </p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="mt-3 text-xs font-semibold text-primary underline"
            >
              Entendido
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="auth-email" className="text-sm font-semibold text-foreground">Correo</label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="email"
            />
          </div>
          {mode === "login" && (
            <div>
              <label htmlFor="auth-password" className="text-sm font-semibold text-foreground">Contraseña</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoComplete="current-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Un momento…" : mode === "login" ? "Ingresar" : "Enviar correo"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <button className="text-primary hover:underline" onClick={() => setMode("forgot")}>
              Olvidé mi contraseña
            </button>
          ) : (
            <button className="text-primary hover:underline" onClick={() => setMode("login")}>
              Volver a ingresar
            </button>
          )}
        </div>

        {mode === "login" && (
          <div className="mt-8 rounded-3xl border border-dashed border-primary/40 bg-card p-5 text-center shadow-soft">
            <p className="font-display text-sm font-semibold text-foreground">
              ¿Aún no tienes cuenta?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adquiere tu plan y recibe tus datos de acceso para entrar a MiniChefs.
            </p>
            <Link
              to="/"
              hash="precios"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Ver los planes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function traducirError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(msg)) return "Tu correo aún no está confirmado.";
  if (/rate limit|too many|email rate/i.test(msg))
    return "Ya enviamos varios correos hace poco. Espera unos minutos e intenta de nuevo, o escríbenos y te ayudamos.";
  if (/error sending|smtp|failed to send/i.test(msg))
    return "No pudimos enviar el correo en este momento. Escríbenos y te ayudamos a recuperar tu acceso.";
  if (/user not found/i.test(msg))
    return "No encontramos una cuenta con ese correo. Revisa que esté bien escrito.";
  return msg;
}
