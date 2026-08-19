import { supabase } from "@/integrations/supabase/client";

export type RecipeCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  min_age_months: number;
  prep_minutes: number;
  cook_minutes: number;
  is_lunchbox_friendly: boolean;
  is_batch_friendly: boolean;
  is_freezable: boolean;
  freezer_months: number | null;
  is_economic: boolean;
  image_filename: string | null;
  fallback_image: string | null;
  suitable_slots: string[] | null;
  allergen_codes: string[];
};

const CATEGORY_TO_PLACEHOLDER: Record<string, string> = {
  papilla: "/images/ui/placeholder-categoria-papillas.webp",
  desayuno: "/images/ui/placeholder-categoria-desayunos.webp",
  almuerzo: "/images/ui/placeholder-categoria-comidas.webp",
  cena: "/images/ui/placeholder-categoria-comidas.webp",
  colacion: "/images/ui/placeholder-categoria-meriendas.webp",
  lonchera: "/images/ui/placeholder-categoria-loncheras.webp",
  postre: "/images/ui/placeholder-categoria-postres.webp",
  bebida: "/images/ui/placeholder-categoria-bebidas.webp",
};

export function recipeImage(cat: string) {
  return CATEGORY_TO_PLACEHOLDER[cat] ?? "/images/ui/placeholder-categoria-comidas.webp";
}

/** Nombre bonito de cada categoría de receta (para mostrar en la UI). */
export const CATEGORY_LABEL: Record<string, string> = {
  papilla: "Papilla",
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  colacion: "Colación",
  lonchera: "Lonchera",
  postre: "Postre",
  bebida: "Bebida",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? cat;
}

/**
 * Foto real de la receta si existe (servida desde public/images/recipes/),
 * con caída al placeholder de categoría cuando aún no hay foto.
 * Úsalo junto con un onError que apunte a recipeImage(category).
 */
export function recipePhoto(filename: string | null | undefined, cat: string) {
  return filename ? `/images/recipes/${filename}` : recipeImage(cat);
}

export async function fetchRecipes(opts: {
  ageMonths?: number;
  allergenCodes?: string[];
  avoidIngredientIds?: string[];
}): Promise<RecipeCard[]> {
  let query = supabase
    .from("recipes")
    .select(
      "id, slug, title, description, category, min_age_months, prep_minutes, cook_minutes, is_lunchbox_friendly, is_batch_friendly, is_freezable, freezer_months, is_economic, image_filename, fallback_image, suitable_slots, recipe_ingredients(ingredient_id, ingredients(ingredient_allergens(allergens(code))))",
    )
    .eq("is_published", true)
    .order("min_age_months", { ascending: true });

  if (opts.ageMonths != null) {
    // La receta es apta si el niño ya tiene la edad mínima Y no superó la máxima
    // (las que no tienen tope, como platos generales, valen para toda edad).
    query = query
      .lte("min_age_months", opts.ageMonths)
      .or(`max_age_months.is.null,max_age_months.gte.${opts.ageMonths}`);
  }
  const { data, error } = await query;
  if (error) throw error;

  const banned = new Set((opts.allergenCodes ?? []).map((a) => a.toLowerCase()));
  const avoided = new Set(opts.avoidIngredientIds ?? []);

  return (data ?? [])
    .map((r: any) => {
      const codes = new Set<string>();
      let hasAvoided = false;
      for (const ri of r.recipe_ingredients ?? []) {
        if (avoided.has(ri.ingredient_id)) hasAvoided = true;
        for (const ia of ri.ingredients?.ingredient_allergens ?? []) {
          const code = ia.allergens?.code;
          if (code) codes.add(code);
        }
      }
      return { ...r, allergen_codes: Array.from(codes), _hasAvoided: hasAvoided };
    })
    .filter((r: any) => !r._hasAvoided && !r.allergen_codes.some((c: string) => banned.has(c)));
}

export async function fetchRecipeBySlug(slug: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(*, ingredients(*)), recipe_steps(step_number, instruction, is_safety_critical)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}
