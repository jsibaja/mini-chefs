import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ageLabel, useActiveChild } from "@/lib/active-child";
import { fetchRecipes, recipeImage, recipePhoto, categoryLabel } from "@/lib/recipes";
import {
  DAYS,
  SLOTS,
  addDays,
  autoGenerateWeek,
  deleteEntry,
  ensureMealPlan,
  fetchPlanEntries,
  toggleDone,
  upsertEntry,
  weekStartMonday,
  type MealSlot,
  type PlanEntry,
} from "@/lib/meal-plan";
import { Sparkles, Trash2, Check, X, Clock, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan semanal · MiniChefs" },
      { name: "description", content: "Planifica la semana de tu hijo, un día a la vez." },
    ],
  }),
  component: PlanPage,
});

const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Qué categorías de receta tiene sentido ofrecer en cada comida del día.
const SLOT_CATS: Record<MealSlot, string[]> = {
  desayuno: ["desayuno", "papilla"],
  colacion_am: ["colacion", "postre", "bebida"],
  almuerzo: ["almuerzo", "papilla"],
  colacion_pm: ["colacion", "postre", "bebida"],
  cena: ["cena", "papilla"],
  lonchera: ["lonchera"],
};

function dm(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7; // 0 = lunes
}


function PlanPage() {
  const qc = useQueryClient();
  const { active, isLoading } = useActiveChild();
  // 0 = esta semana, 1 = la próxima: el domingo por la noche se planifica la que viene.
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(weekStartMonday(), weekOffset * 7), [weekOffset]);
  const [day, setDay] = useState(() => todayIndex());
  // Qué comida está eligiendo receta (abre el selector visual).
  const [picker, setPicker] = useState<MealSlot | null>(null);

  const cambiarSemana = (offset: number) => {
    setWeekOffset(offset);
    setDay(offset === 0 ? todayIndex() : 0);
  };

  const planQ = useQuery({
    enabled: !!active,
    queryKey: ["meal-plan", active?.id, weekStart],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || !active) throw new Error("Sin sesión");
      const planId = await ensureMealPlan(userRes.user.id, active.id, weekStart);
      const entries = await fetchPlanEntries(planId);
      return { planId, entries };
    },
  });

  const recipesQ = useQuery({
    enabled: !!active,
    queryKey: [
      "plan-recipes",
      active?.id,
      active?.ageMonths,
      active?.allergen_codes,
      active?.avoid_ingredient_ids,
    ],
    queryFn: () =>
      fetchRecipes({
        ageMonths: active?.ageMonths ?? 6,
        allergenCodes: active?.allergen_codes ?? [],
        avoidIngredientIds: active?.avoid_ingredient_ids ?? [],
      }),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!planQ.data || !recipesQ.data) return 0;
      const candidates = recipesQ.data.map((r: any) => ({
        id: r.id,
        category: r.category,
        suitable_slots: r.suitable_slots,
      }));
      return autoGenerateWeek({
        planId: planQ.data.planId,
        weekStart,
        candidates,
        existing: planQ.data.entries,
      });
    },
    onSuccess: (n) => {
      toast.success(n ? `${n} comidas asignadas` : "Tu semana ya está completa");
      qc.invalidateQueries({ queryKey: ["meal-plan", active?.id, weekStart] });
      qc.invalidateQueries({ queryKey: ["shopping-list"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo generar"),
  });

  const setEntry = useMutation({
    mutationFn: async (v: { date: string; slot: MealSlot; recipe_id: string | null }) => {
      if (!planQ.data) return;
      await upsertEntry({ planId: planQ.data.planId, entry_date: v.date, slot: v.slot, recipe_id: v.recipe_id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan", active?.id, weekStart] });
      qc.invalidateQueries({ queryKey: ["shopping-list"] });
      qc.invalidateQueries({ queryKey: ["today-plan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el cambio"),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan", active?.id, weekStart] });
      qc.invalidateQueries({ queryKey: ["shopping-list"] });
      qc.invalidateQueries({ queryKey: ["today-plan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo quitar"),
  });

  const markDone = useMutation({
    mutationFn: async (v: { id: string; done: boolean }) => toggleDone(v.id, v.done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan", active?.id, weekStart] });
      qc.invalidateQueries({ queryKey: ["today-plan"] });
      // El trigger de la BD otorga XP/nivel al marcar hecho: refrescar hijos y logros.
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["tasted"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const byKey = useMemo(() => {
    const m = new Map<string, PlanEntry>();
    for (const e of planQ.data?.entries ?? []) m.set(`${e.entry_date}|${e.slot}`, e);
    return m;
  }, [planQ.data]);

  // La lonchera solo aplica a niños en edad escolar (2+ años): a un bebé no se
  // le muestra una casilla que jamás podrá llenar.
  const visibleSlots = useMemo(
    () => (!active || active.ageMonths >= 24 ? SLOTS : SLOTS.filter((s) => s.code !== "lonchera")),
    [active],
  );

  // Cuántas comidas están llenas por día (para el selector de días).
  const filledPerDay = useMemo(() => {
    const counts = Array(7).fill(0);
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      for (const s of visibleSlots) {
        const e = byKey.get(`${date}|${s.code}`);
        if (e?.recipe_id) counts[i]++;
      }
    }
    return counts;
  }, [byKey, weekStart, visibleSlots]);

  // Opciones de receta por slot (filtradas por la comida).
  const optionsBySlot = useMemo(() => {
    const all = (recipesQ.data ?? []) as any[];
    const out: Record<string, any[]> = {};
    for (const s of SLOTS) {
      const cats = SLOT_CATS[s.code];
      const list = all.filter(
        (r) => cats.includes(r.category) || (r.suitable_slots ?? []).includes(s.code),
      );
      out[s.code] = list.length ? list : all;
    }
    return out;
  }, [recipesQ.data]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando…</div>;
  if (!active) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-10">
        <h1 className="font-display text-2xl font-bold text-deep-green">Plan semanal</h1>
        <p className="mt-2 text-muted-foreground">
          Agrega a tu hijo y armamos su menú de la semana en un toque.
        </p>
        <Link
          to="/onboarding"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          Agregar hijo
        </Link>
      </div>
    );
  }

  const selectedDate = addDays(weekStart, day);

  return (
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:pt-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Plan semanal</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">Plan de {active.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semana del {dm(weekStart)} al {dm(addDays(weekStart, 6))} · {ageLabel(active.ageMonths)}
        </p>
        <p className="mt-3 rounded-2xl bg-mint/30 px-4 py-2.5 text-sm text-deep-green/90">
          Elige una receta para cada comida. Lo que armes aquí aparece en <strong>Hoy</strong> y
          llena tu lista de <strong>Compras</strong>.
        </p>

        {/* Esta semana / la próxima: planifica el domingo sin pelear con la app */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-card p-1 shadow-soft">
          {([
            [0, "Esta semana"],
            [1, "Próxima semana"],
          ] as const).map(([off, label]) => (
            <button
              key={off}
              onClick={() => cambiarSemana(off)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                weekOffset === off
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Generar semana */}
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending || !recipesQ.data?.length}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <Sparkles className="h-5 w-5" />
        {generate.isPending ? "Generando…" : "Generar mi semana automáticamente"}
      </button>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        Llena los huecos con recetas aptas para {active.name}. Puedes cambiar cualquiera después.
      </p>

      {/* Selector de días */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((d, i) => {
          const isSel = i === day;
          const isToday = weekOffset === 0 && i === todayIndex();
          const filled = filledPerDay[i];
          return (
            <button
              key={d}
              onClick={() => setDay(i)}
              className={`flex flex-none flex-col items-center rounded-2xl px-3.5 py-2 transition-colors ${
                isSel
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-card text-foreground hover:bg-accent"
              }`}
            >
              <span className="text-xs font-semibold">{d}</span>
              <span className={`text-[11px] ${isSel ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {dm(addDays(weekStart, i)).slice(0, 5)}
              </span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  filled >= visibleSlots.length
                    ? isSel
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : filled > 0
                      ? "bg-corn"
                      : "bg-transparent"
                }`}
                title={`${filled}/6 comidas`}
              />
              {isToday && !isSel && (
                <span className="sr-only">hoy</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Comidas del día seleccionado */}
      <div className="mt-4">
        <h2 className="font-display text-xl font-bold text-deep-green">
          {DAY_FULL[day]} <span className="text-base font-normal text-muted-foreground">· {dm(selectedDate)}</span>
        </h2>

        <div className="mt-3 space-y-3">
          {visibleSlots.map((s) => {
            const entry = byKey.get(`${selectedDate}|${s.code}`);
            const opts = optionsBySlot[s.code] ?? [];
            return (
              <div key={s.code} className="rounded-3xl bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {s.label}
                  </span>
                  {entry?.is_done && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint/60 px-2 py-0.5 text-[11px] font-semibold text-deep-green">
                      <Check className="h-3 w-3" /> Hecho
                    </span>
                  )}
                </div>

                <div className="mt-2 flex min-w-0 items-center gap-3">
                  {entry?.recipes ? (
                    <img
                      src={recipePhoto(entry.recipes.image_filename, entry.recipes.category)}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = recipeImage(entry.recipes!.category);
                      }}
                      alt=""
                      className="h-16 w-16 flex-none rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-mint/30 text-2xl">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`line-clamp-2 text-sm font-semibold leading-snug ${
                        entry?.recipes ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {entry?.recipes?.title ?? "Aún sin receta"}
                    </p>
                    {entry?.recipes && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-mint/50 px-2 py-0.5 text-[10px] font-semibold text-deep-green">
                          {categoryLabel(entry.recipes.category)}
                        </span>
                        <Link
                          to="/recetas/$slug"
                          params={{ slug: entry.recipes.slug }}
                          className="text-xs font-semibold text-primary underline"
                        >
                          Ver receta
                        </Link>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPicker(s.code)}
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        entry?.recipes
                          ? "border border-input bg-background text-foreground hover:bg-accent"
                          : "bg-primary text-primary-foreground shadow-soft"
                      }`}
                    >
                      {entry?.recipes ? "Cambiar" : "Elegir receta"}
                    </button>
                  </div>
                </div>

                {entry && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => markDone.mutate({ id: entry.id, done: !entry.is_done })}
                      disabled={markDone.isPending}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        entry.is_done
                          ? "bg-mint/50 text-deep-green"
                          : "border border-input bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      {entry.is_done ? "Hecho ✓" : "Marcar hecho"}
                    </button>
                    <button
                      onClick={() => removeEntry.mutate(entry.id)}
                      disabled={removeEntry.isPending}
                      aria-label="Quitar del plan"
                      className="grid h-9 w-9 flex-none place-items-center rounded-full border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {picker && (
        <RecipePicker
          slotLabel={SLOTS.find((s) => s.code === picker)?.label ?? ""}
          options={optionsBySlot[picker] ?? []}
          currentId={byKey.get(`${selectedDate}|${picker}`)?.recipe_id ?? null}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            setEntry.mutate({ date: selectedDate, slot: picker, recipe_id: id });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Selector visual de recetas: buscador + filtros por categoría + tarjetas con
 * foto. La mamá elige con los ojos, no leyendo una lista de texto.
 */
function RecipePicker({
  slotLabel,
  options,
  currentId,
  onClose,
  onPick,
}: {
  slotLabel: string;
  options: any[];
  currentId: string | null;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("todas");

  const cats = useMemo(
    () => Array.from(new Set(options.map((r) => r.category))),
    [options],
  );

  const filtered = useMemo(() => {
    let rows = [...options].sort((a, b) => a.title.localeCompare(b.title, "es"));
    if (cat !== "todas") rows = rows.filter((r) => r.category === cat);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(needle));
    }
    return rows;
  }, [options, cat, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      {/* Fondo: tocar afuera cierra */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-deep-green/40 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-3xl bg-background shadow-lift lg:rounded-3xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{slotLabel}</p>
            <h2 className="font-display text-xl font-bold text-deep-green">Elige la receta</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 flex-none place-items-center rounded-full bg-card text-foreground shadow-soft hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Buscador + filtros */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {cats.length > 1 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {["todas", ...cats].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    cat === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground shadow-soft hover:bg-accent"
                  }`}
                >
                  {c === "todas" ? "Todas" : categoryLabel(c)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tarjetas con foto */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No encontramos recetas con ese nombre. Prueba con otra palabra.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((r) => {
                const isCurrent = r.id === currentId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onPick(r.id)}
                      className={`group block w-full overflow-hidden rounded-2xl bg-card text-left shadow-soft transition-transform hover:-translate-y-0.5 ${
                        isCurrent ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-mint/30">
                        <img
                          src={recipePhoto(r.image_filename, r.category)}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = recipeImage(r.category);
                          }}
                          alt={r.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {isCurrent && (
                          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                          {r.title}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
