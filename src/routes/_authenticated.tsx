import { Link, Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ChefHat, Home, Lock, Sandwich, Settings, ShieldCheck, ShoppingBasket, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsStaff } from "@/lib/admin";
import { useEntitlement } from "@/lib/active-child";
import { ChildSwitcher } from "@/components/child-switcher";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AppShell,
});

type NavItem = { to: string; label: string; icon: typeof Home };

const NAV: NavItem[] = [
  { to: "/hoy", label: "Hoy", icon: Home },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/recetas", label: "Recetas", icon: ChefHat },
  { to: "/compras", label: "Compras", icon: ShoppingBasket },
  { to: "/progreso", label: "Progreso", icon: Trophy },
];

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isStaff, isLoading: roleLoading } = useIsStaff();
  const { data: entitlement, isLoading: entLoading } = useEntitlement();
  const showSos = pathname.startsWith("/hoy") || pathname.startsWith("/plan");

  // CONTROL DE ACCESO: la app es por suscripción. Sin suscripción activa solo se
  // puede ver el paywall y los ajustes (para renovar o cerrar sesión). El staff
  // (owner/admin) siempre entra.
  const zonaLibre = pathname.startsWith("/paywall") || pathname.startsWith("/ajustes");
  const verificando = roleLoading || entLoading;
  const sinAcceso = !verificando && !isStaff && !entitlement?.hasActive && !zonaLibre;

  if (verificando) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <p className="text-sm text-muted-foreground">Un momento…</p>
      </div>
    );
  }

  if (sinAcceso) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-lift">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-corn/40 text-deep-green">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-deep-green">
            Tu acceso está en pausa
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu suscripción no está activa en este momento, así que el recetario y el planificador
            están en pausa. Tus datos y los perfiles de tus hijos siguen guardados.
          </p>
          <Link
            to="/paywall"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm"
          >
            Ver los planes
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="mt-3 w-full rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cerrar sesión
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            ¿Crees que es un error? Escríbenos y lo revisamos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden shrink-0 border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:gap-2 lg:p-4">
        <Link to="/hoy" className="mb-4 flex items-center gap-2 px-2">
          <img
            src="/images/ui/icono-pwa-512.webp"
            alt="MiniChefs"
            className="h-10 w-10 rounded-2xl shadow-soft"
          />
          <span className="font-display text-xl font-bold text-deep-green">MiniChefs</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {isStaff && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-carrot text-carrot-foreground shadow-soft"
                  : "text-carrot hover:bg-carrot/10",
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Administración</span>
            </Link>
          )}
          <Link
            to="/tutorial"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors",
              pathname.startsWith("/tutorial")
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span>Cómo funciona</span>
          </Link>
          <Link
            to="/ajustes"
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Settings className="h-5 w-5" />
            <span>Ajustes</span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Cabecera móvil con selector de hijo y accesos rápidos */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <ChildSwitcher />
          <div className="flex items-center gap-1">
            <Link
              to="/lonchera"
              className="inline-flex h-9 items-center gap-1 rounded-full bg-corn/50 px-3 text-xs font-semibold text-deep-green"
            >
              <Sandwich className="h-4 w-4" /> Lonchera
            </Link>
            <Link
              to="/tutorial"
              aria-label="Cómo funciona"
              className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground shadow-soft"
            >
              <BookOpen className="h-4 w-4" />
            </Link>
            <Link
              to="/ajustes"
              aria-label="Ajustes"
              className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground shadow-soft"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>
        {/* Cabecera desktop */}
        <header className="hidden items-center justify-end gap-3 border-b border-border bg-background/95 px-6 py-3 lg:flex">
          <ChildSwitcher />
          <Link
            to="/lonchera"
            className="inline-flex items-center gap-1.5 rounded-full bg-corn/50 px-3 py-1.5 text-xs font-semibold text-deep-green"
          >
            <Sandwich className="h-4 w-4" /> Lonchera
          </Link>
        </header>

        <main className="flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {showSos && (
        <button
          type="button"
          aria-label="SOS: dame ideas de comida ahora"
          onClick={() => {
            navigate({ to: "/hoy" });
            // Dispara el generador de ideas al llegar (la pantalla Hoy escucha este evento).
            window.setTimeout(() => window.dispatchEvent(new Event("minichefs:sos")), 300);
          }}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-3 text-sm font-bold text-coral-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        >
          <Sparkles className="h-4 w-4" />
          ¿Qué le doy?
        </button>
      )}

      <PwaInstallPrompt />

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
