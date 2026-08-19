-- ============================================================
-- MiniChefs — 02-rls-policies.sql
-- Habilita RLS y crea todas las políticas.
-- Requiere: 01-schema.sql + 03-functions-triggers.sql ya ejecutados.
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children_owner_all" ON public.children FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- allergens
ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergens_select_all" ON public.allergens FOR SELECT TO anon, authenticated USING (true);

-- child_allergens
ALTER TABLE public.child_allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_allergens_owner_all" ON public.child_allergens FOR ALL TO authenticated
  USING (public.owns_child(child_id)) WITH CHECK (public.owns_child(child_id));

-- subscription_plans / subscriptions
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_select_all" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (is_active = true);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Solo service_role escribe subscriptions (edge function del webhook).

-- ingredients / ingredient_allergens
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients_select_all" ON public.ingredients FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.ingredient_allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredient_allergens_select_all" ON public.ingredient_allergens FOR SELECT TO anon, authenticated USING (true);

-- recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_select_published" ON public.recipes FOR SELECT TO anon, authenticated USING (is_published = true);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_ingredients_select_all" ON public.recipe_ingredients FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_steps_select_all" ON public.recipe_steps FOR SELECT TO anon, authenticated USING (true);

-- safety_rules
ALTER TABLE public.safety_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_rules_select_all" ON public.safety_rules FOR SELECT TO anon, authenticated USING (true);

-- decisor_daily_uses (solo lectura; escritura vía RPC consume_decisor_use)
ALTER TABLE public.decisor_daily_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisor_select_own" ON public.decisor_daily_uses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- meal_plans / entries
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plans_owner_all" ON public.meal_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan_entries_owner_all" ON public.meal_plan_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()));

-- child_achievements
ALTER TABLE public.child_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_achievements_owner_all" ON public.child_achievements FOR ALL TO authenticated
  USING (public.owns_child(child_id)) WITH CHECK (public.owns_child(child_id));

-- favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_owner_all" ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipe_notes
ALTER TABLE public.recipe_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_notes_owner_all" ON public.recipe_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- recipe_variants (catálogo, solo lectura)
ALTER TABLE public.recipe_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_variants_read" ON public.recipe_variants FOR SELECT TO anon, authenticated USING (true);


-- user_roles (lectura propia; los admins ven todos)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_read_all" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Endurecimiento: roles y suscripciones son de solo lectura para el cliente
-- ============================================================
-- Un usuario autenticado NUNCA debe poder escribir su rol ni su suscripcion
-- (seria hacerse admin o regalarse acceso). Los cambios legitimos pasan por
-- funciones SECURITY DEFINER que validan is_staff(), y los pagos por el webhook
-- con service_role.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_plans FROM authenticated, anon;

-- Unico staff del proyecto (ajustar el correo al desplegar en otro entorno):
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT u.id, r.role FROM auth.users u,
--      (VALUES ('owner'::public.app_role), ('admin'::public.app_role)) AS r(role)
--  WHERE lower(u.email) = 'anunciosfbads2@gmail.com'
-- ON CONFLICT DO NOTHING;

-- CATALOGO Y CONTENIDO: solo lectura para el cliente (defensa en profundidad).
-- Un usuario normal jamas debe poder tocar recetas, ingredientes, alergenos ni
-- las reglas de seguridad alimentaria (podria desactivar el bloqueo de miel o
-- frutos secos por edad). Los logros los otorga el trigger, no el usuario.
REVOKE INSERT, UPDATE, DELETE ON
  public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_variants,
  public.ingredients, public.ingredient_allergens, public.allergens, public.safety_rules,
  public.child_achievements
FROM authenticated, anon;
-- El usuario solo escribe SUS datos: children, child_allergens,
-- child_food_preferences, meal_plans, meal_plan_entries, lunchboxes, favorites,
-- recipe_notes y profiles (limitados por RLS a su propio user_id).

-- ============================================================
-- CONTENIDO DE PAGO: el recetario solo para suscriptores activos
-- ============================================================
-- Antes estas policies decian `true`, asi que una cuenta sin suscripcion (o
-- desactivada desde el panel) podia descargar TODO el catalogo por la API REST.
DROP POLICY IF EXISTS recipes_select_published ON public.recipes;
CREATE POLICY recipes_select_subscribers ON public.recipes FOR SELECT TO authenticated
  USING (is_published = true AND (public.has_active_subscription(auth.uid()) OR public.is_staff()));

DROP POLICY IF EXISTS recipe_steps_select_all ON public.recipe_steps;
CREATE POLICY recipe_steps_select_subscribers ON public.recipe_steps FOR SELECT TO authenticated
  USING (public.has_active_subscription(auth.uid()) OR public.is_staff());

DROP POLICY IF EXISTS recipe_ingredients_select_all ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_select_subscribers ON public.recipe_ingredients FOR SELECT TO authenticated
  USING (public.has_active_subscription(auth.uid()) OR public.is_staff());

DROP POLICY IF EXISTS recipe_variants_read ON public.recipe_variants;
CREATE POLICY recipe_variants_select_subscribers ON public.recipe_variants FOR SELECT TO authenticated
  USING (public.has_active_subscription(auth.uid()) OR public.is_staff());
