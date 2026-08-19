import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Snowflake, Check, X, Save, History } from "lucide-react";
import { fetchRecipes, recipeImage, recipePhoto, type RecipeCard } from "@/lib/recipes";
import { useActiveChild } from "@/lib/active-child";
import { addDays, ymdLocal } from "@/lib/meal-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lonchera")({
  head: () => ({
    meta: [
      { title: "Armador de loncheras · MiniChefs" },
      {
        name: "description",
        content: "Arma la lonchera en 4 casillas con semáforo de balance y cadena de frío.",
      },
    ],
  }),
  component: LoncheraPage,
});

type SlotKey = "proteina" | "carbo" | "frutaverdura" | "bebida";
type Item = { id: string; title: string; image: string; category: string; is_cold: boolean };

const SLOTS: { key: SlotKey; label: string; color: string; hint: string }[] = [
  { key: "proteina", label: "Proteína", color: "bg-carrot/25 text-carrot", hint: "Pollo, huevo, queso, atún…" },
  { key: "carbo", label: "Energía", color: "bg-corn/50 text-deep-green", hint: "Pan, arroz, papa, tortilla…" },
  { key: "frutaverdura", label: "Fruta o verdura", color: "bg-mint text-deep-green", hint: "Manzana, zanahoria, uvas…" },
  { key: "bebida", label: "Bebida", color: "bg-primary/15 text-primary", hint: "Agua, leche, yogur…" },
];

function classify(r: RecipeCard & { recipe_ingredients?: any[] }): SlotKey | null {
  const ings = (r as any).recipe_ingredients ?? [];
  const cats = new Set<string>(
    ings.map((ri: any) => ri.ingredients?.category).filter(Boolean),
  );
  if (cats.has("proteina")) return "proteina";
  if (cats.has("cereal") || cats.has("tuberculo")) return "carbo";
  if (cats.has("fruta") || cats.has("verdura")) return "frutaverdura";
  if (cats.has("bebida") || cats.has("lacteo")) return "bebida";
  return null;
}

function LoncheraPage() {
  const { active } = useActiveChild();
  const qc = useQueryClient();
  const [picks, setPicks] = useState<Record<SlotKey, Item | null>>({
    proteina: null,
    carbo: null,
    frutaverdura: null,
    bebida: null,
  });
  // Para cuándo es esta lonchera (por defecto mañana: se arma la noche anterior).
  const [paraCuando, setParaCuando] = useState<"manana" | "hoy">("manana");

  const hoy = ymdLocal(new Date());
  const manana = addDays(hoy, 1);
  const forDate = paraCuando === "manana" ? manana : hoy;

  const fechaLabel = (iso: string) =>
    iso === hoy ? "hoy" : iso === manana ? "mañana" : `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  // Historial: las últimas loncheras guardadas de este hijo.
  const recentQ = useQuery({
    enabled: !!active,
    queryKey: ["lunchboxes", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lunchboxes")
        .select("id, for_date, items")
        .eq("child_id", active!.id)
        .order("for_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !active) throw new Error("Sin sesión");
      const items = SLOTS.map((s) => ({ slot: s.key, ...picks[s.key]! })).filter((i) => i.id);
      const { error } = await supabase.from("lunchboxes").upsert(
        { user_id: u.user.id, child_id: active.id, for_date: forDate, items },
        { onConflict: "child_id,for_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Lonchera guardada para ${fechaLabel(forDate)} 🎒`);
      qc.invalidateQueries({ queryKey: ["lunchboxes", active?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const repetir = (items: any[]) => {
    const next: Record<SlotKey, Item | null> = {
      proteina: null,
      carbo: null,
      frutaverdura: null,
      bebida: null,
    };
    for (const it of items ?? []) {
      if (it?.slot && it?.id) next[it.slot as SlotKey] = it as Item;
    }
    setPicks(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Lonchera cargada. Ajusta lo que quieras y guárdala.");
  };

  const q = useQuery({
    enabled: !!active,
    queryKey: [
      "lonchera-recipes",
      active?.id,
      active?.ageMonths,
      active?.allergen_codes,
      active?.avoid_ingredient_ids,
      active?.school_nut_free,
    ],
    queryFn: async () => {
      // Traemos con recipe_ingredients para clasificar por macronutriente y
      // con los alérgenos para EXCLUIR lo prohibido para este hijo.
      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id, slug, title, category, min_age_months, image_filename, fallback_image, recipe_ingredients(ingredient_id, ingredients(code, category, is_cow_milk_drink, ingredient_allergens(allergens(code))))",
        )
        .eq("is_published", true)
        .eq("is_lunchbox_friendly", true)
        .lte("min_age_months", active?.ageMonths ?? 6)
        .or(`max_age_months.is.null,max_age_months.gte.${active?.ageMonths ?? 6}`)
        .order("min_age_months", { ascending: true });
      if (error) throw error;
      const banned = new Set((active?.allergen_codes ?? []).map((a) => a.toLowerCase()));
      // La lonchera va al colegio: si es libre de maní, el maní también queda fuera.
      if (active?.school_nut_free) banned.add("mani");
      const avoided = new Set(active?.avoid_ingredient_ids ?? []);
      return (data ?? [])
        .filter((r: any) => {
          for (const ri of r.recipe_ingredients ?? []) {
            if (avoided.has(ri.ingredient_id)) return false;
            for (const ia of ri.ingredients?.ingredient_allergens ?? []) {
              const code = ia.allergens?.code?.toLowerCase();
              if (code && banned.has(code)) return false;
            }
          }
          return true;
        })
        .map((r: any) => ({
          ...r,
          image: recipePhoto(r.image_filename, r.category),
          is_cold: (r.recipe_ingredients ?? []).some(
            (ri: any) => ri.ingredients?.category === "lacteo" || ri.ingredients?.category === "proteina",
          ),
        }));
    },
  });

  const grouped = useMemo(() => {
    const g: Record<SlotKey, Item[]> = { proteina: [], carbo: [], frutaverdura: [], bebida: [] };
    (q.data ?? []).forEach((r: any) => {
      const slot = classify(r as any);
      if (slot) {
        g[slot].push({ id: r.id, title: r.title, image: r.image, category: r.category, is_cold: r.is_cold });
      }
    });
    return g;
  }, [q.data]);

  const filled = Object.values(picks).filter(Boolean).length;
  const semaphore = filled >= 4 ? "verde" : filled >= 2 ? "amarillo" : "rojo";
  const needsColdChain = Object.values(picks).some((p) => p?.is_cold);
  const hasThermal = active?.has_thermal_lunchbox ?? false;

  if (!active) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-10">
        <h1 className="font-display text-2xl font-bold text-deep-green">Armador de loncheras</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Primero agrega el perfil de tu hijo para armar loncheras a su medida.
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

  return (
    <div className="mx-auto max-w-3xl px-5 pb-12 pt-8 lg:pt-14">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/images/ui/modulo-armador-lonchera.webp"
            alt=""
            className="hidden h-16 w-16 flex-none rounded-2xl object-cover shadow-soft sm:block"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Lonchera</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">
              Arma la lonchera de {active?.name ?? "tu hijo"}
            </h1>
          </div>
        </div>
        <Link to="/hoy" className="text-xs text-muted-foreground underline">
          Volver a Hoy
        </Link>
      </div>

      <p className="mt-4 rounded-2xl bg-mint/30 px-4 py-2.5 text-sm text-deep-green/90">
        Elige una receta en cada una de las 4 casillas (proteína, carbo, fruta o verdura, y bebida).
        El semáforo te avisa cuando la lonchera queda balanceada.
      </p>

      <div
        className={`mt-4 flex items-center gap-3 rounded-2xl p-4 shadow-soft ${
          semaphore === "verde"
            ? "bg-mint/60 text-deep-green"
            : semaphore === "amarillo"
              ? "bg-corn/60 text-deep-green"
              : "bg-coral/20 text-coral"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            semaphore === "verde" ? "bg-primary" : semaphore === "amarillo" ? "bg-carrot" : "bg-coral"
          }`}
        />
        <p className="text-sm font-semibold">
          {semaphore === "verde"
            ? "Lonchera balanceada. ¡Perfecta!"
            : semaphore === "amarillo"
              ? "Vas bien. Falta algún grupo para completar el equilibrio."
              : "Empieza a llenar las 4 casillas."}
        </p>
      </div>

      {needsColdChain && (
        <div
          className={`mt-3 flex items-center gap-3 rounded-2xl p-4 shadow-soft ${
            hasThermal ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}
        >
          {hasThermal ? <Snowflake className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <p className="text-sm font-semibold">
            {hasThermal
              ? "Esta lonchera necesita frío. Usa la lonchera térmica."
              : "Esta combinación necesita frío. Si no tienes lonchera térmica, elige opciones que aguanten fuera del refri."}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SLOTS.map((s) => {
          const picked = picks[s.key];
          return (
            <div key={s.key} className="rounded-3xl bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${s.color}`}>
                  {s.label}
                </span>
                {picked && (
                  <button
                    type="button"
                    onClick={() => setPicks((p) => ({ ...p, [s.key]: null }))}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> quitar
                  </button>
                )}
              </div>
              {picked ? (
                <div className="mt-3 flex min-w-0 items-center gap-3">
                  <img src={picked.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  <div>
                    <p className="font-display font-semibold text-foreground">{picked.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                      <Check className="h-3 w-3" /> agregado
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{s.hint}</p>
              )}
              <div className="mt-4 max-h-48 space-y-1 overflow-y-auto pr-1">
                {grouped[s.key].length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay recetas de este grupo para {active?.name}.
                  </p>
                ) : (
                  grouped[s.key].map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setPicks((p) => ({ ...p, [s.key]: it }))}
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors ${
                        picked?.id === it.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <img src={it.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      <span className="truncate">{it.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guardar la lonchera armada */}
      <div className="mt-8 rounded-3xl bg-card p-5 shadow-soft">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-background p-1">
          {([
            ["manana", "Para mañana"],
            ["hoy", "Para hoy"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setParaCuando(val)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                paraCuando === val
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={filled === 0 || saveMut.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          <Save className="h-5 w-5" />
          {saveMut.isPending ? "Guardando…" : "Guardar lonchera"}
        </button>
        {filled === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Llena al menos una casilla para guardar.
          </p>
        )}
      </div>

      {/* Historial: repetir en un toque las que funcionaron */}
      {(recentQ.data?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <History className="h-4 w-4 text-primary" /> Loncheras guardadas
          </h2>
          <ul className="mt-3 space-y-2">
            {recentQ.data!.map((lb: any) => (
              <li
                key={lb.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
              >
                <div className="flex -space-x-2">
                  {(lb.items ?? []).slice(0, 4).map((it: any, i: number) => (
                    <img
                      key={i}
                      src={it.image}
                      alt=""
                      className="h-10 w-10 rounded-full border-2 border-card object-cover"
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {fechaLabel(lb.for_date)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {(lb.items ?? []).map((it: any) => it.title).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => repetir(lb.items)}
                  className="flex-none rounded-full border border-input bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Repetir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
