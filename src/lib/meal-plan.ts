import { supabase } from "@/integrations/supabase/client";

export type MealSlot = "desayuno" | "colacion_am" | "almuerzo" | "colacion_pm" | "cena" | "lonchera";

export const SLOTS: { code: MealSlot; label: string }[] = [
  { code: "desayuno", label: "Desayuno" },
  { code: "colacion_am", label: "Media mañana" },
  { code: "almuerzo", label: "Almuerzo" },
  { code: "colacion_pm", label: "Media tarde" },
  { code: "cena", label: "Cena" },
  { code: "lonchera", label: "Lonchera" },
];

export const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Formatea una fecha LOCAL como YYYY-MM-DD (toISOString usa UTC y desplaza el día). */
export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekStartMonday(date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return ymdLocal(d);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return ymdLocal(dt);
}

export type PlanEntry = {
  id: string;
  entry_date: string;
  slot: MealSlot;
  recipe_id: string | null;
  custom_title: string | null;
  is_done: boolean;
  recipes: {
    id: string;
    slug: string;
    title: string;
    category: string;
    image_filename: string | null;
  } | null;
};

export async function ensureMealPlan(userId: string, childId: string, weekStart: string) {
  // Upsert sobre la restricción UNIQUE (child_id, week_start): sin condición de carrera.
  const { data, error } = await supabase
    .from("meal_plans")
    .upsert(
      { user_id: userId, child_id: childId, week_start: weekStart },
      { onConflict: "child_id,week_start" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function fetchPlanEntries(planId: string): Promise<PlanEntry[]> {
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select(
      "id, entry_date, slot, recipe_id, custom_title, is_done, recipes(id, slug, title, category, image_filename)",
    )
    .eq("meal_plan_id", planId);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function upsertEntry(args: {
  planId: string;
  entry_date: string;
  slot: MealSlot;
  recipe_id: string | null;
}) {
  const { error } = await supabase
    .from("meal_plan_entries")
    .upsert(
      {
        meal_plan_id: args.planId,
        entry_date: args.entry_date,
        slot: args.slot,
        recipe_id: args.recipe_id,
      },
      { onConflict: "meal_plan_id,entry_date,slot" },
    );
  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleDone(id: string, is_done: boolean) {
  const { error } = await supabase.from("meal_plan_entries").update({ is_done }).eq("id", id);
  if (error) throw error;
}

/** Genera una semana automáticamente: llena slots vacíos con recetas aptas por edad/alergias. */
export async function autoGenerateWeek(args: {
  planId: string;
  weekStart: string;
  candidates: { id: string; category: string; suitable_slots?: MealSlot[] | null }[];
  existing: PlanEntry[];
}) {
  const slotCategoryHint: Record<MealSlot, string[]> = {
    desayuno: ["desayuno", "papilla"],
    colacion_am: ["colacion", "postre", "bebida"],
    almuerzo: ["almuerzo", "papilla"],
    colacion_pm: ["colacion", "postre", "bebida"],
    cena: ["cena", "papilla"],
    lonchera: ["lonchera"],
  };
  const taken = new Set(args.existing.map((e) => `${e.entry_date}|${e.slot}`));
  // Variedad: contar usos por receta (existentes + nuevos) para no repetir de más.
  const usage = new Map<string, number>();
  for (const e of args.existing) if (e.recipe_id) usage.set(e.recipe_id, (usage.get(e.recipe_id) ?? 0) + 1);
  const usedByDay = new Map<string, Set<string>>();
  for (const e of args.existing) {
    if (!e.recipe_id) continue;
    const set = usedByDay.get(e.entry_date) ?? new Set<string>();
    set.add(e.recipe_id);
    usedByDay.set(e.entry_date, set);
  }
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const inserts: any[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(args.weekStart, d);
    const dayUsed = usedByDay.get(date) ?? new Set<string>();
    usedByDay.set(date, dayUsed);
    for (const s of SLOTS) {
      if (taken.has(`${date}|${s.code}`)) continue;
      const hints = slotCategoryHint[s.code];
      const pool = args.candidates.filter(
        (r) => hints.includes(r.category) || (r.suitable_slots ?? []).includes(s.code),
      );
      if (pool.length === 0) continue;
      // Preferir: no repetida hoy y usada <2 veces en la semana; relajar si no alcanza.
      const fresh = pool.filter((r) => !dayUsed.has(r.id) && (usage.get(r.id) ?? 0) < 2);
      const relaxed = pool.filter((r) => !dayUsed.has(r.id));
      const pick = shuffle(fresh.length ? fresh : relaxed.length ? relaxed : pool)[0];
      dayUsed.add(pick.id);
      usage.set(pick.id, (usage.get(pick.id) ?? 0) + 1);
      inserts.push({
        meal_plan_id: args.planId,
        entry_date: date,
        slot: s.code,
        recipe_id: pick.id,
      });
    }
  }
  if (inserts.length === 0) return 0;
  const { error } = await supabase.from("meal_plan_entries").insert(inserts);
  if (error) throw error;
  return inserts.length;
}

/** Consolida ingredientes de todas las recetas del plan (agrupadas por categoría del súper). */
export async function fetchShoppingList(planId: string) {
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select(
      "recipes(recipe_ingredients(amount, unit, ingredients(name, category)))",
    )
    .eq("meal_plan_id", planId)
    .not("recipe_id", "is", null);
  if (error) throw error;

  type Item = { name: string; category: string; amount: number; unit: string | null };
  const map = new Map<string, Item>();
  for (const row of (data ?? []) as any[]) {
    const ings = row.recipes?.recipe_ingredients ?? [];
    for (const ri of ings) {
      const name = ri.ingredients?.name;
      if (!name) continue;
      const cat = ri.ingredients?.category ?? "otros";
      const unit = ri.unit ?? null;
      const key = `${name}|${unit ?? ""}`;
      const prev = map.get(key);
      const amt = Number(ri.amount ?? 0) || 0;
      if (prev) prev.amount += amt;
      else map.set(key, { name, category: cat, amount: amt, unit });
    }
  }
  const items = Array.from(map.values()).sort((a, b) =>
    a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
  );
  return items;
}
