import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useIsStaff } from "@/lib/admin";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · MiniChefs" },
      { name: "description", content: "Modo oscuro, modo vacaciones, cupo de dulces y más." },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isStaff } = useIsStaff();

  const profileQ = useQuery({
    queryKey: ["profile-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, vacation_mode, dessert_weekly_limit")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const [vacation, setVacation] = useState(false);
  const [dessertLimit, setDessertLimit] = useState(2);
  const [myName, setMyName] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setVacation(!!profileQ.data.vacation_mode);
      setDessertLimit(profileQ.data.dessert_weekly_limit ?? 2);
      setMyName(profileQ.data.display_name ?? "");
    }
  }, [profileQ.data]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyEmail(data.user?.email ?? ""));
  }, []);

  // Cada quien puede cambiar SU nombre.
  const saveName = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: myName.trim() })
        .eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nombre actualizado");
      qc.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  // Cambiar SU contraseña: pedimos la actual y la comprobamos antes, para que
  // nadie que tome el teléfono desbloqueado pueda cambiarla.
  const changePassword = useMutation({
    mutationFn: async () => {
      if (passNueva.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: myEmail,
        password: passActual,
      });
      if (authErr) throw new Error("Tu contraseña actual no es correcta");
      const { error } = await supabase.auth.updateUser({ password: passNueva });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setPassActual("");
      setPassNueva("");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo cambiar la contraseña"),
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<{ vacation_mode: boolean; dessert_weekly_limit: number }>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("profiles").update(patch).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ajustes guardados");
      qc.invalidateQueries({ queryKey: ["profile-me"] });
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-xl px-5 pb-12 pt-8 lg:pt-14">
      <h1 className="font-display text-3xl font-bold text-deep-green">Ajustes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Personaliza cómo se ve y se comporta MiniChefs.
      </p>

      <Link
        to="/tutorial"
        className="mt-6 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-mint via-corn/50 to-carrot/20 p-5 shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <img
          src="/images/ui/mascota-zana-bienvenida.webp"
          alt=""
          className="h-14 w-14 flex-none object-contain"
        />
        <div>
          <h2 className="font-display text-lg font-semibold text-deep-green">
            ¿Cómo funciona MiniChefs?
          </h2>
          <p className="mt-0.5 text-sm text-deep-green/80">
            Vuelve a ver la guía rápida de un minuto.
          </p>
        </div>
      </Link>

      {isStaff && (
        <Link
          to="/admin"
          className="mt-6 flex items-center justify-between gap-3 rounded-3xl border-2 border-carrot/40 bg-carrot/10 p-5 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-carrot">
              <ShieldCheck className="h-5 w-5" /> Administración
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Usuarios, accesos y suscripciones.
            </p>
          </div>
          <span className="font-display text-xl text-carrot">›</span>
        </Link>
      )}

      <Link
        to="/hijos"
        className="mt-6 flex items-center justify-between gap-3 rounded-3xl bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Mis hijos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Edita nombre, edad y alergias, o agrega otro hijo.
          </p>
        </div>
        <span className="font-display text-xl text-primary">›</span>
      </Link>

      {/* Mi cuenta: cada quien administra su propio nombre y contraseña */}
      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Mi cuenta</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tu nombre y tu contraseña. Solo tú puedes cambiarlos.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-semibold" htmlFor="mi-correo">
              Tu correo
            </label>
            <input
              id="mi-correo"
              value={myEmail}
              readOnly
              className="mt-1 w-full rounded-2xl border border-input bg-muted/50 px-4 py-3 text-base text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Es el correo con el que entras. Si necesitas cambiarlo, escríbenos.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="mi-nombre">
              Tu nombre
            </label>
            <div className="flex gap-2">
              <input
                id="mi-nombre"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="Cómo quieres que te llamemos"
                className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => saveName.mutate()}
                disabled={saveName.isPending || !myName.trim() || myName === (profileQ.data?.display_name ?? "")}
                className="mt-1 flex-none rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft disabled:bg-muted disabled:text-muted-foreground"
              >
                Guardar
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold">Cambiar mi contraseña</p>
            <div className="mt-2 space-y-2">
              <input
                type="password"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="password"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Tu contraseña nueva (mínimo 6)"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => changePassword.mutate()}
                disabled={changePassword.isPending || !passActual || passNueva.length < 6}
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:bg-muted disabled:text-muted-foreground"
              >
                {changePassword.isPending ? "Cambiando…" : "Cambiar contraseña"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Apariencia</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          El tema del sistema es la opción predeterminada.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                theme === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {t === "system" ? "Sistema" : t === "light" ? "Claro" : "Oscuro"}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Modo vacaciones</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pausa el planificador y los recordatorios sin perder tu progreso.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/60 p-3">
          <span className="text-sm font-semibold">
            {vacation ? "Activo" : "Desactivado"}
          </span>
          <button
            type="button"
            onClick={() => {
              const v = !vacation;
              setVacation(v);
              save.mutate({ vacation_mode: v });
            }}
            className={`h-7 w-12 rounded-full transition-colors ${
              vacation ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                vacation ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Cupo de dulces por semana</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cuántas veces puede aparecer un postre en el plan semanal.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={7}
            value={dessertLimit}
            onChange={(e) => setDessertLimit(Number(e.target.value))}
            onMouseUp={() => save.mutate({ dessert_weekly_limit: dessertLimit })}
            onTouchEnd={() => save.mutate({ dessert_weekly_limit: dessertLimit })}
            className="flex-1 accent-primary"
          />
          <span className="w-10 rounded-full bg-primary/10 py-1 text-center font-display text-lg font-bold text-primary">
            {dessertLimit}
          </span>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Suscripción</h2>
        <Link
          to="/paywall"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-input bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Mi suscripción
        </Link>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Legales</h2>
        <Link
          to="/legal"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-input bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Términos y privacidad
        </Link>
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Cuenta</h2>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 w-full rounded-full border border-destructive/30 bg-background px-5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}
