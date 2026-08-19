-- ============================================================
-- MiniChefs — 01-schema.sql (Fases 1 + 3 + 5 + 6)
-- Extensiones, enums, tablas y GRANTs.
-- Ejecutar en este orden: 01-schema.sql → 03-functions-triggers.sql
--                        → 02-rls-policies.sql → 04-seed.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ ENUMS ============
CREATE TYPE public.cooking_mode           AS ENUM ('daily', 'batch');
CREATE TYPE public.budget_mode            AS ENUM ('normal', 'economic');
CREATE TYPE public.allergen_severity      AS ENUM ('leve', 'moderada', 'severa');
CREATE TYPE public.subscription_plan_code AS ENUM ('mensual', 'semestral', 'anual');
CREATE TYPE public.subscription_status    AS ENUM ('pendiente', 'activa', 'vencida', 'cancelada');
CREATE TYPE public.recipe_category        AS ENUM ('papilla','desayuno','almuerzo','cena','colacion','lonchera','postre','bebida');
CREATE TYPE public.meal_slot              AS ENUM ('desayuno','colacion_am','almuerzo','colacion_pm','cena','lonchera');
CREATE TYPE public.safety_rule_kind       AS ENUM ('prohibido','evitar','precaucion','porcion_maxima');
CREATE TYPE public.conservation_kind      AS ENUM ('estable_ambiente','requiere_frio','requiere_termo');
CREATE TYPE public.protein_group          AS ENUM ('pescado','carne_roja','pollo_pavo','huevo','legumbre','lacteo');
CREATE TYPE public.age_band               AS ENUM ('6_8m','9_11m','12_24m','2_5a','6_9a');
CREATE TYPE public.app_role               AS ENUM ('owner','admin','user');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  country_code TEXT,
  timezone TEXT DEFAULT 'America/Mexico_City',
  household_size INT NOT NULL DEFAULT 2,
  dessert_weekly_limit INT NOT NULL DEFAULT 2,
  protein_targets JSONB DEFAULT '{}'::jsonb,
  vacation_mode BOOLEAN NOT NULL DEFAULT false,
  theme TEXT DEFAULT 'system',
  equipment JSONB DEFAULT '{"oven": true, "blender": true, "air_fryer": false}'::jsonb,
  cooking_mode public.cooking_mode NOT NULL DEFAULT 'daily',
  budget_mode public.budget_mode NOT NULL DEFAULT 'normal',
  weekday_time_budget INT DEFAULT 30,
  legal_accepted_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============ children ============
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gestational_weeks INT,
  avatar TEXT,
  texture_stage INT NOT NULL DEFAULT 1,
  attends_school BOOLEAN NOT NULL DEFAULT false,
  school_nut_free BOOLEAN NOT NULL DEFAULT false,
  has_thermal_lunchbox BOOLEAN NOT NULL DEFAULT false,
  is_selective_eater BOOLEAN NOT NULL DEFAULT false,
  mini_chef_level INT NOT NULL DEFAULT 1,
  mini_chef_xp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX children_user_id_idx ON public.children(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;

-- ============ user_roles ============
-- Los roles NUNCA van como columna de profiles: si vivieran en una tabla que
-- el propio usuario puede editar, cualquiera podría auto-otorgarse admin.
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX user_roles_user_idx ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ============ allergens ============
CREATE TABLE public.allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_priority BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allergens TO anon, authenticated;
GRANT ALL ON public.allergens TO service_role;

-- ============ child_allergens ============
CREATE TABLE public.child_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE RESTRICT,
  severity public.allergen_severity NOT NULL DEFAULT 'moderada',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, allergen_id)
);
CREATE INDEX child_allergens_child_idx ON public.child_allergens(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_allergens TO authenticated;
GRANT ALL ON public.child_allergens TO service_role;

-- ============ subscription_plans ============
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code public.subscription_plan_code NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_usd NUMERIC(10,2) NOT NULL,
  billing_interval_months INT NOT NULL,
  hotmart_offer_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_best_value BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

-- ============ subscriptions ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'pendiente',
  started_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  hotmart_transaction_ref TEXT UNIQUE,
  hotmart_subscriber_code TEXT,
  hotmart_offer_code TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX subscriptions_active_idx ON public.subscriptions(user_id, current_period_end) WHERE status = 'activa';
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- ============ ingredients ============
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  is_free_sugar BOOLEAN NOT NULL DEFAULT false,
  is_juice BOOLEAN NOT NULL DEFAULT false,
  is_cow_milk_drink BOOLEAN NOT NULL DEFAULT false,
  is_honey BOOLEAN NOT NULL DEFAULT false,
  is_whole_nut BOOLEAN NOT NULL DEFAULT false,
  store_section TEXT,
  is_priority_allergen BOOLEAN NOT NULL DEFAULT false,
  is_trackable_food BOOLEAN NOT NULL DEFAULT false,
  is_vegetable BOOLEAN NOT NULL DEFAULT false,
  veggie_color TEXT,
  min_age_months INT,
  choking_risk BOOLEAN NOT NULL DEFAULT false,
  is_common_pantry BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ingredients TO anon, authenticated;
GRANT ALL ON public.ingredients TO service_role;

CREATE TABLE public.ingredient_allergens (
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (ingredient_id, allergen_id)
);
GRANT SELECT ON public.ingredient_allergens TO anon, authenticated;
GRANT ALL ON public.ingredient_allergens TO service_role;

-- ============ recipes + steps ============
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category public.recipe_category NOT NULL,
  min_age_months INT NOT NULL DEFAULT 6,
  max_age_months INT,
  texture_stages INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  prep_minutes INT NOT NULL DEFAULT 15,
  cook_minutes INT NOT NULL DEFAULT 15,
  servings INT NOT NULL DEFAULT 2,
  difficulty INT NOT NULL DEFAULT 1,
  suitable_slots public.meal_slot[] NOT NULL DEFAULT ARRAY[]::public.meal_slot[],
  is_batch_friendly BOOLEAN NOT NULL DEFAULT false,
  is_lunchbox_friendly BOOLEAN NOT NULL DEFAULT false,
  is_economic BOOLEAN NOT NULL DEFAULT false,
  requires_oven BOOLEAN NOT NULL DEFAULT false,
  requires_blender BOOLEAN NOT NULL DEFAULT false,
  image_filename TEXT,
  fallback_image TEXT,
  tips TEXT,
  -- Campos de curaduría del catálogo (290 recetas)
  conservation public.conservation_kind NOT NULL DEFAULT 'estable_ambiente',
  is_freezable BOOLEAN NOT NULL DEFAULT false,
  freezer_months INT,
  protein_group public.protein_group,
  veggie_colors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  carb_base TEXT,
  has_free_sugars BOOLEAN NOT NULL DEFAULT false,
  is_occasional_sweet BOOLEAN NOT NULL DEFAULT false,
  nutrition_blurb TEXT,
  family_mode_note TEXT,
  source_book TEXT,
  source_numbers INT[],
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipes_min_age_idx ON public.recipes(min_age_months);
CREATE INDEX recipes_category_idx ON public.recipes(category);
CREATE INDEX recipes_conservation_idx ON public.recipes(conservation);
CREATE INDEX recipes_protein_group_idx ON public.recipes(protein_group);
CREATE INDEX recipes_free_sugars_idx ON public.recipes(has_free_sugars);

-- ============ recipe_variants (adaptación por banda de edad) ============
CREATE TABLE public.recipe_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  age_band public.age_band NOT NULL,
  adaptation_text TEXT NOT NULL,
  UNIQUE (recipe_id, age_band)
);
CREATE INDEX recipe_variants_recipe_idx ON public.recipe_variants(recipe_id);
GRANT SELECT ON public.recipe_variants TO anon, authenticated;
GRANT ALL ON public.recipe_variants TO service_role;
GRANT SELECT ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;

CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2),
  unit TEXT,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT recipe_ingredients_unique_row UNIQUE (recipe_id, ingredient_id, sort_order)
);
CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients(recipe_id);
GRANT SELECT ON public.recipe_ingredients TO anon, authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;

CREATE TABLE public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  instruction TEXT NOT NULL,
  is_safety_critical BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (recipe_id, step_number)
);
GRANT SELECT ON public.recipe_steps TO anon, authenticated;
GRANT ALL ON public.recipe_steps TO service_role;

-- ============ safety_rules ============
CREATE TABLE public.safety_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind public.safety_rule_kind NOT NULL,
  min_age_months INT,
  max_age_months INT,
  ingredient_predicate TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safety_rules TO anon, authenticated;
GRANT ALL ON public.safety_rules TO service_role;

-- ============ decisor_daily_uses ============
CREATE TABLE public.decisor_daily_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_on DATE NOT NULL,
  uses INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, used_on)
);
CREATE INDEX decisor_daily_uses_user_idx ON public.decisor_daily_uses(user_id, used_on DESC);
-- Solo lectura para el cliente: el cupo diario se consume vía RPC consume_decisor_use().
GRANT SELECT ON public.decisor_daily_uses TO authenticated;
GRANT ALL ON public.decisor_daily_uses TO service_role;

-- ============ meal_plans + entries ============
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, week_start)
);
CREATE INDEX meal_plans_user_idx ON public.meal_plans(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;

CREATE TABLE public.meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  slot public.meal_slot NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  custom_title TEXT,
  is_done BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (meal_plan_id, entry_date, slot)
);
CREATE INDEX meal_plan_entries_plan_idx ON public.meal_plan_entries(meal_plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_entries TO authenticated;
GRANT ALL ON public.meal_plan_entries TO service_role;

-- ============ child_achievements ============
CREATE TABLE public.child_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, code)
);
CREATE INDEX child_achievements_child_idx ON public.child_achievements(child_id);
GRANT SELECT, INSERT, DELETE ON public.child_achievements TO authenticated;
GRANT ALL ON public.child_achievements TO service_role;

-- ============ favorites ============
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX favorites_unique_user_child_recipe
  ON public.favorites (user_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid), recipe_id);
CREATE INDEX favorites_user_idx ON public.favorites(user_id);
CREATE INDEX favorites_recipe_idx ON public.favorites(recipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

-- ============ recipe_notes ============
CREATE TABLE public.recipe_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
CREATE INDEX recipe_notes_user_idx ON public.recipe_notes(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_notes TO authenticated;
GRANT ALL ON public.recipe_notes TO service_role;
-- Trigger de updated_at declarado en 03-functions-triggers.sql

-- Loncheras guardadas (armador de loncheras): una por hijo y fecha.
CREATE TABLE IF NOT EXISTS public.lunchboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  for_date date NOT NULL,
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, for_date)
);
ALTER TABLE public.lunchboxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own lunchboxes" ON public.lunchboxes;
DROP POLICY IF EXISTS "lunchboxes_owner_all" ON public.lunchboxes;
CREATE POLICY "lunchboxes_owner_all" ON public.lunchboxes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.lunchboxes FROM anon, authenticated;

-- Alimentos que cada hijo evita (ademas de sus alergias): filtra el recetario.
CREATE TABLE IF NOT EXISTS public.child_food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  preference text NOT NULL DEFAULT 'no_come' CHECK (preference IN ('no_come','le_gusta','por_probar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, ingredient_id)
);
ALTER TABLE public.child_food_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own child prefs" ON public.child_food_preferences;
CREATE POLICY "own child prefs" ON public.child_food_preferences
  FOR ALL
  USING (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()))
  WITH CHECK (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.child_food_preferences FROM anon, authenticated;
