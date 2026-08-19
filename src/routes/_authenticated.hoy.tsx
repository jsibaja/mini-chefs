import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Clock, BookOpen, ArrowRight, X } from "lucide-react";
import { fetchRecipes, recipeImage, recipePhoto, categoryLabel } from "@/lib/recipes";
import { ageLabel, useActiveChild, useEntitlement } from "@/lib/active-child";
import { ensureMealPlan, fetchPlanEntries, weekStartMonday, ymdLocal, SLOTS } from "@/lib/meal-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hoy")({
  head: () => ({
    meta: [
      { title: "Hoy · MiniChefs" },
      { name: "description", content: "Las comidas de hoy y el decisor rápido." },
    ],
  }),
  component: HoyPage,
});

function HoyPage() {
  const { active, children, setActive, isLoading: isLoadingChildren } = useActiveChild();
  const { data: entitlement } = useEntitlement();
  // Ideas generadas POR COMIDA: cambiar de chip no borra lo ya generado.
  const [picksBySlot, setPicksBySlot] = useState<Record<string, any[]>>({});
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mc_tutorial_dismissed")) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    if (typeof window !== "undefined") localStorage.setItem("mc_tutorial_dismissed", "1");
    setShowWelcome(false);
  };

  const { data: recipes } = useQuery({
    queryKey: [
      "recipes-hoy",
      active?.id,
      active?.ageMonths,
      active?.allergen_codes,
      active?.avoid_ingredient_ids,
    ],
    enabled: !!active,
    queryFn: () =>
      fetchRecipes({
        ageMonths: active?.ageMonths,
        allergenCodes: active?.allergen_codes ?? [],
        avoidIngredientIds: active?.avoid_ingredient_ids ?? [],
      }),
  });

  // Comidas de HOY según el plan semanal del hijo activo.
  const todayPlanQ = useQuery({
    enabled: !!active,
    queryKey: ["today-plan", active?.id],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !active) return [];
      const planId = await ensureMealPlan(u.user.id, active.id, weekStartMonday());
      const entries = await fetchPlanEntries(planId);
      const today = ymdLocal(new Date());
      const order = new Map(SLOTS.map((s, i) => [s.code, i] as const));
      return entries
        .filter((e) => e.entry_date === today && e.recipes)
        .sort((a, b) => (order.get(a.slot) ?? 9) - (order.get(b.slot) ?? 9));
    },
  });
  const slotLabelOf = (code: string) => SLOTS.find((s) => s.code === code)?.label ?? code;

  // La hora sugiere la comida, pero la mamá puede elegir otra (ideas de cena a las 10 am).
  const hour = new Date().getHours();
  const slotAuto = hour < 10 ? "desayuno" : hour < 15 ? "almuerzo" : hour < 18 ? "colacion" : "cena";
  const [slot, setSlot] = useState<"desayuno" | "almuerzo" | "colacion" | "cena" | "lonchera">(slotAuto);

  const SLOT_OPTS = [
    ["desayuno", "Desayuno"],
    ["almuerzo", "Almuerzo"],
    ["colacion", "Merienda"],
    ["cena", "Cena"],
    ["lonchera", "Lonchera"],
  ] as const;
  // La lonchera es de niños escolarizados: no se ofrece para bebés.
  const slotOpts = SLOT_OPTS.filter(
    ([code]) => code !== "lonchera" || (active?.ageMonths ?? 0) >= 24,
  );
  const slotLabel = SLOT_OPTS.find(([code]) => code === slot)?.[1] ?? "Comida";

  // Las ideas ya generadas para la comida seleccionada (persisten al cambiar de chip).
  const pick = picksBySlot[slot] ?? null;

  // Qué categorías sirven para cada comida (las papillas cuentan como comida
  // principal para los bebés).
  const SLOT_CATS: Record<string, string[]> = {
    desayuno: ["desayuno", "papilla"],
    almuerzo: ["almuerzo", "papilla"],
    colacion: ["colacion", "postre", "bebida"],
    cena: ["cena", "papilla"],
  };
  const candidates = useMemo(() => {
    const list = recipes ?? [];
    if (slot === "lonchera") {
      return list.filter(
        (r) =>
          (r.category === "lonchera" || r.is_lunchbox_friendly) &&
          // Colegio libre de maní: la lonchera no puede llevar maní aunque el
          // niño no sea alérgico (política del colegio por sus compañeros).
          !(active?.school_nut_free && r.allergen_codes.includes("mani")),
      );
    }
    return list.filter((r) => SLOT_CATS[slot].includes(r.category));
  }, [recipes, slot]);

  const decide = async () => {
    // No consumir el uso gratis si no hay recetas que ofrecer.
    if (candidates.length === 0) {
      toast.error("No hay recetas para este momento del día. Prueba en el recetario.");
      return;
    }
    if (!entitlement?.hasActive) {
      // El cupo diario se valida y consume en el servidor (RPC atómica):
      // el cliente no puede reiniciar su propio contador.
      const { data: allowed, error } = await supabase.rpc("consume_decisor_use", {
        _daily_limit: 1,
      });
      if (error) {
        toast.error("No pudimos verificar tus ideas de hoy. Intenta de nuevo.");
        return;
      }
      if (!allowed) {
        // Sin redirección forzada: se avisa y la mamá decide si quiere ver los planes.
        toast.error("Ya usaste tu idea gratis de hoy. Mañana tienes más, o suscríbete para pedirlas sin límite.");
        return;
      }
    }

    // Barajado justo (Fisher-Yates)
    const arr = [...candidates];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setPicksBySlot((prev) => ({ ...prev, [slot]: arr.slice(0, 3) }));
  };

  // El botón flotante "¿Qué le doy?" dispara las ideas directamente.
  const decideRef = useRef(decide);
  decideRef.current = decide;
  useEffect(() => {
    const onSos = () => {
      document.getElementById("tarjeta-ideas")?.scrollIntoView({ behavior: "smooth" });
      decideRef.current();
    };
    window.addEventListener("minichefs:sos", onSos);
    return () => window.removeEventListener("minichefs:sos", onSos);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-6 lg:pt-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Hoy · {slotLabel}</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">
          Hola, {active?.name ? `familia de ${active.name}` : "familia"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resolvamos qué le vas a dar hoy. Sin culpa, sin listas eternas.
        </p>
      </header>

      {showWelcome && (
        <div className="relative mt-5 flex items-center gap-4 rounded-3xl border border-primary/30 bg-gradient-to-br from-mint via-corn/40 to-carrot/20 p-4 pr-10 shadow-soft">
          <button
            type="button"
            onClick={dismissWelcome}
            aria-label="Cerrar"
            className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-deep-green/60 hover:bg-background/50 hover:text-deep-green"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src="/images/ui/mascota-zana-bienvenida.webp"
            alt=""
            className="h-14 w-14 flex-none object-contain"
          />
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-deep-green">¿Primera vez por aquí?</p>
            <p className="mt-0.5 text-sm text-deep-green/80">
              Aprende a usar MiniChefs en un minuto.
            </p>
            <Link
              to="/tutorial"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <BookOpen className="h-3.5 w-3.5" /> Ver el tutorial <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {children.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active?.id === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.name} · {ageLabel(c.ageMonths)}
            </button>
          ))}
        </div>
      )}

      {!isLoadingChildren && children.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-primary/40 bg-card p-8 text-center shadow-soft">
          <img
            src="/images/ui/mascota-zana-bienvenida.webp"
            alt=""
            className="mx-auto h-24 w-24 object-contain"
          />
          <p className="mt-3 font-display text-lg font-semibold">Agrega a tu primer hijo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Con su edad y alergias personalizamos todo el recetario.
          </p>
          <Link
            to="/onboarding"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Empezar
          </Link>
        </div>
      )}

      <section
        id="tarjeta-ideas"
        className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-mint via-corn/60 to-carrot/30 p-5 shadow-lift sm:p-6"
      >
        {/* En móvil se apila (título arriba, botón ancho abajo); en pantalla
            grande van en la misma fila. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <img
              src="/images/ui/modulo-decisor-sos.webp"
              alt=""
              className="hidden h-16 w-16 flex-none rounded-2xl object-cover shadow-soft sm:block"
            />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-deep-green">
                ¿Qué le doy de comer ahora?
              </h2>
              <p className="mt-1 text-sm text-deep-green/80">
                Te damos 3 ideas seguras para {slotLabel.toLowerCase()}, según su edad y alergias.
              </p>
            </div>
          </div>
          <button
            onClick={decide}
            className="inline-flex w-full flex-none items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5 sm:w-auto sm:py-2"
          >
            <Sparkles className="h-4 w-4" /> Dame ideas
          </button>
        </div>

        {/* ¿Para qué comida? La hora sugiere, la mamá decide. Cada comida
            conserva sus ideas generadas al cambiar de chip. */}
        <div className="mt-4 flex flex-wrap gap-2">
          {slotOpts.map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setSlot(code)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                slot === code
                  ? "bg-deep-green text-deep-green-foreground shadow-soft"
                  : "bg-background/70 text-deep-green hover:bg-background"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {pick && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-deep-green/70">
              Ideas para {slotLabel.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() =>
                setPicksBySlot((prev) => {
                  const next = { ...prev };
                  delete next[slot];
                  return next;
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-deep-green transition-colors hover:bg-background"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          </div>
        )}
        {pick && (
          <div className="mt-2 flex flex-col gap-3">
            {pick.map((r) => (
              <Link
                key={r.id}
                to="/recetas/$slug"
                params={{ slug: r.slug }}
                className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-background/90 p-3 shadow-soft backdrop-blur transition-transform hover:-translate-y-0.5"
              >
                <img
                  src={recipePhoto(r.image_filename, r.category)}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = recipeImage(r.category);
                  }}
                  alt=""
                  className="h-14 w-14 flex-none rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  {/* Dos líneas: los nombres largos se leen completos y no desbordan. */}
                  <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground">
                    {r.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-mint/50 px-2 py-0.5 font-semibold text-deep-green">
                      {categoryLabel(r.category)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!entitlement?.hasActive && (
          <p className="mt-4 text-[11px] text-deep-green/70">
            Modo gratis: 1 uso al día.{" "}
            <Link to="/paywall" className="font-semibold underline">
              Suscríbete
            </Link>{" "}
            para uso ilimitado.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-foreground">Plan de hoy</h2>
        {(todayPlanQ.data?.length ?? 0) === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando armes tu plan semanal, aquí verás lo que corresponde a hoy.{" "}
            <Link to="/plan" className="font-semibold text-primary underline">
              Ir al plan
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todayPlanQ.data!.map((e: any) => (
              <li key={e.id}>
                <Link
                  to="/recetas/$slug"
                  params={{ slug: e.recipes.slug }}
                  className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-background/70 p-2.5 transition-colors hover:bg-accent"
                >
                  <img
                    src={recipePhoto(e.recipes.image_filename, e.recipes.category)}
                    onError={(ev) => {
                      ev.currentTarget.onerror = null;
                      ev.currentTarget.src = recipeImage(e.recipes.category);
                    }}
                    alt=""
                    className="h-11 w-11 flex-none rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {slotLabelOf(e.slot)}
                    </p>
                    <p className={`truncate text-sm font-semibold ${e.is_done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {e.recipes.title}
                    </p>
                  </div>
                  {e.is_done && (
                    <span className="flex-none rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-bold text-deep-green">
                      Hecho ✓
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
