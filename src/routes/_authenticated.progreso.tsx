import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Flame, Star, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveChild } from "@/lib/active-child";

export const Route = createFileRoute("/_authenticated/progreso")({
  head: () => ({
    meta: [
      { title: "Progreso · MiniChefs" },
      { name: "description", content: "Pasaporte de Sabores y nivel Mini Chef de tu hijo." },
    ],
  }),
  component: ProgresoPage,
});

function xpForNext(level: number) {
  return 50 + level * 50;
}

// Insignias del niño por nivel (1 a 6), en orden ascendente.
const MINICHEF_BADGES = [
  "minichef-ayudante-de-cocina",
  "minichef-aprendiz-batidor",
  "minichef-cocinerito-valiente",
  "minichef-sous-chef-junior",
  "minichef-chef-de-la-casa",
  "minichef-mini-chef-estrella",
] as const;

function ProgresoPage() {
  const { active } = useActiveChild();

  const achievementsQ = useQuery({
    enabled: !!active,
    queryKey: ["achievements", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_achievements")
        .select("id, code, title, earned_at")
        .eq("child_id", active!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tastedQ = useQuery({
    enabled: !!active,
    queryKey: ["tasted", active?.id],
    queryFn: async () => {
      // Ingredientes distintos usados en comidas marcadas como hechas.
      const { data, error } = await supabase
        .from("meal_plan_entries")
        .select("recipe_id, is_done, meal_plans!inner(child_id)")
        .eq("meal_plans.child_id", active!.id)
        .eq("is_done", true);
      if (error) throw error;
      const recipeIds = Array.from(new Set((data ?? []).map((e: any) => e.recipe_id).filter(Boolean)));
      if (recipeIds.length === 0) return { tasted: 0, ingredients: [] as string[] };
      const { data: ings } = await supabase
        .from("recipe_ingredients")
        .select("ingredients(code, name)")
        .in("recipe_id", recipeIds);
      const set = new Map<string, string>();
      (ings ?? []).forEach((r: any) => {
        if (r.ingredients?.code) set.set(r.ingredients.code, r.ingredients.name);
      });
      return { tasted: set.size, ingredients: Array.from(set.values()) };
    },
  });

  if (!active) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-10 text-sm text-muted-foreground">
        Agrega un hijo para ver su progreso.
      </div>
    );
  }

  const level = active as any as { mini_chef_level?: number; mini_chef_xp?: number };
  const currentLevel = (level.mini_chef_level as number) ?? 1;
  const currentXp = (level.mini_chef_xp as number) ?? 0;
  const needed = xpForNext(currentLevel);
  const pct = Math.min(100, Math.round((currentXp / needed) * 100));

  const achievements = achievementsQ.data ?? [];
  const tasted = tastedQ.data?.tasted ?? 0;
  const ingredientsList = tastedQ.data?.ingredients ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-12 pt-8 lg:pt-14">
      <h1 className="font-display text-3xl font-bold text-deep-green">Progreso de {active.name}</h1>
      <p className="mt-3 rounded-2xl bg-mint/30 px-4 py-2.5 text-sm text-deep-green/90">
        Cada vez que marcas una comida como <strong>hecha</strong> (en Hoy o Plan), {active.name} gana
        puntos y sube de nivel como Mini Chef. Probar alimentos nuevos llena su Pasaporte de Sabores.
      </p>

      <img
        src="/images/ui/modulo-pasaporte-sabores.webp"
        alt=""
        className="mt-5 aspect-[16/9] w-full rounded-3xl object-cover shadow-soft"
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <Star className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Nivel Mini Chef</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <img
              src={`/images/ui/${MINICHEF_BADGES[Math.min(currentLevel, MINICHEF_BADGES.length) - 1]}.webp`}
              alt=""
              className="h-14 w-14 flex-none object-contain"
            />
            <p className="font-display text-4xl font-bold text-deep-green">{currentLevel}</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {currentXp} de {needed} puntos para subir de nivel
          </p>
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-carrot">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Sellos ganados</span>
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-deep-green">
            {achievements.length}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Cada logro cuenta como un sello del pasaporte.
          </p>
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-coral">
            <Flame className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Sabores probados</span>
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-deep-green">{tasted}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ingredientes distintos ya aceptados.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-foreground">Logros</h2>
        {achievements.length === 0 ? (
          <div className="mt-3 rounded-3xl bg-card p-8 text-center shadow-soft">
            <img
              src="/images/ui/vacio-historial.webp"
              alt=""
              className="mx-auto h-28 w-28 object-contain"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Aún no hay sellos. Marca comidas como hechas para empezar a sumar.
            </p>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {achievements.map((a: any) => (
              <li key={a.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-deep-green">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.earned_at).toLocaleDateString("es")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-foreground">Pasaporte de Sabores</h2>
        {ingredientsList.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-soft">
            Cada ingrediente nuevo que pruebe se registra aquí automáticamente.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {ingredientsList.map((n) => (
              <span
                key={n}
                className="rounded-full bg-mint/60 px-3 py-1 text-xs font-semibold text-deep-green"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
