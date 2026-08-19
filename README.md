# Mini Chefs

Crea "MiniChefs": una web app PWA de suscripción, mobile-first, en español neutro latinoamericano, para madres y padres con hijos de 6 meses a 9 años. Es un "copiloto de alimentación familiar": planificador semanal de comidas por hijo, armador de loncheras balanceadas, decisor rápido "Hoy le toca", recetario filtrado por edad y alergias, y gamificación donde el niño progresa como Mini Chef.

REGLAS GLOBALES
- Toda la UI en español neutro latinoamericano (tuteo con "tú", jamás "vos" ni "vosotros", sin modismos regionales). Código, tablas, variables y nombres de archivo en inglés.
- Mobile-first real: tab bar inferior de 5 ítems (Hoy, Plan, Recetas, Compras, Progreso) + botón flotante "SOS" visible en Hoy y Plan; en desktop (≥1024px) la tab bar se convierte en sidebar izquierda fija. Touch targets amplios (≥44px), sin scroll horizontal, respetar safe areas de iOS (env(safe-area-inset-*)), transiciones suaves.
- Modo oscuro completo con persistencia (default: sistema; toggle en Ajustes).
- DISEÑO "Huerto Alegre" (premium familiar, cálido y apetitoso, no infantil-cursi): fondo crema cálido #FFF6EC, primario verde manzana #6BBF59, acentos naranja zanahoria #F4913A, amarillo maíz #F7C948, coral suave #F27E63, menta #A8D8C9, verde profundo #2F5D3A para textos/acentos. El rojo se reserva EXCLUSIVAMENTE para avisos de seguridad alimentaria. Tipografías Google Fonts: "Baloo 2" (títulos) y "Nunito" (texto). Esquinas redondeadas generosas, sombras suaves. Todo como design tokens semánticos en Tailwind/index.css — nunca hex sueltos en componentes.

BACKEND — activa Lovable Cloud con este esquema (RLS habilitado en TODAS las tablas):
- profiles (1:1 auth.users, creado por trigger handle_new_user): display_name, country_code, timezone, household_size int default 2, dessert_weekly_limit int default 2, protein_targets jsonb, vacation_mode bool, theme, equipment jsonb (oven/blender/air_fryer bools), cooking_mode ('daily'|'batch'), budget_mode ('normal'|'economic'), weekday_time_budget int, legal_accepted_at, onboarding_completed_at.
- children: user_id FK, name, birth_date, gestational_weeks int null (prematuros: edad corregida hasta 24m), avatar, texture_stage, attends_school bool, school_nut_free bool, has_thermal_lunchbox bool, is_selective_eater bool, mini_chef_level int, mini_chef_xp int.
- allergens (catálogo), child_allergens (child_id+allergen_id unique, severity), child_food_preferences (child_id+ingredient_id, 'le_gusta'|'no_come'|'por_probar').
- subscription_plans: code ('mensual'|'semestral'|'anual'), name, price_usd, billing_interval_months, hotmart_offer_code, is_active.
- subscriptions: user_id, plan_id, status ('pendiente'|'activa'|'vencida'|'cancelada'), started_at, current_period_end, canceled_at, hotmart_transaction_ref UNIQUE, hotmart_subscriber_code, hotmart_offer_code, raw_payload jsonb. Solo service_role escribe.
- ingredients: name unique, store_section, allergen_id FK null, is_priority_allergen bool, is_trackable_food bool, is_vegetable bool, veggie_color, min_age_months, choking_risk bool, is_common_pantry bool. + ingredient_country_terms (ingredient_id, country_code, term) para sinónimos regionales (palta/aguacate, frutilla/fresa).
- recipes: slug unique, title, description, category ('papilla_pure'|'desayuno'|'almuerzo'|'merienda'|'cena'|'postre'|'snack'|'bebida'|'acompanamiento_dip'|'base'), meal_slots text[], min_age_months NOT NULL, max_age_months, stage_min int, stage_max int (rango de etapas 1-5 que cubre), texture_stage, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, difficulty, tags text[], conservation ('estable_ambiente'|'requiere_frio'|'requiere_termo'), is_freezable, freezer_months, contains_protein, protein_group, lunchbox_component, veggie_colors text[], carb_base, is_occasional_sweet, has_free_sugars, is_baked, oven_temp_c, equipment text[] ('oven'|'blender'|'air_fryer'|'stove_only'|'no_cook'), cost_tier ('economic'|'medium'|'premium'), seasons text[], pantry_only bool, nutrition_blurb, tips text[], family_mode_note, image_url, source_book, source_refs jsonb, is_published, search_vector.
- recipe_ingredients (recipe_id, ingredient_id, quantity, unit, note, is_optional, sort_order), recipe_steps (step_number, instruction, timer_seconds, is_safety_critical, safety_note, kid_min_age_years, kid_task_label), recipe_variants (recipe_id, age_band '6_8m'|'9_11m'|'12_24m'|'2_5a'|'6_9a', adaptation_text, transformation_type 'blend'|'mash'|'safe_cut'|'as_is', texture_note, cut_note, serving_note; UNIQUE(recipe_id,age_band)), recipe_allergens (PK recipe_id+allergen_id, source), recipe_relations (relation_type 'base_de'|'acompanamiento'|'version_lonchera'|'variante_de'), substitutions (ingredient_id, substitute_ingredient_id, ratio_text, quantity_factor, contexts text[], min_age_months).
- safety_rules: code unique, rule_type, target_kind, target_ingredient_id, target_value, min_age_months, action ('bloquear'|'adaptar'|'avisar'), message, adaptation_text, is_active.
- menu_templates (age_band, week_structure jsonb, is_vacation), balance_rules (code, scope, rule_config jsonb, user_overridable, warning_message), education_modules (slug, title, module_type, category, age_band, content jsonb, is_published), user_module_progress, editorial_collections (slug, title, subtitle, criteria jsonb, sort_order, is_active).
- favorites (user_id, child_id null, recipe_id, unique), collections + collection_recipes (colecciones personales del usuario), recipe_notes (user_id+recipe_id unique, note, photo_url), pantry_items (user_id+ingredient_id unique, is_staple).
- meal_plans (user_id, child_id, week_start, status, template_id, is_vacation_mode, cloned_from_plan_id; UNIQUE(child_id,week_start)), meal_plan_slots (meal_plan_id, slot_date, slot_type 'desayuno'|'almuerzo'|'merienda'|'cena'|'lonchera', recipe_id null, freezer_item_id null, is_locked, status 'planificado'|'cocinado'|'omitido', origin, cook_together, recycle_to_lunchbox; UNIQUE(plan,date,type)), child_slot_settings (child_id, weekday int, slot_type, is_external bool — "este almuerzo lo da la guardería"), lunchboxes (meal_plan_slot_id unique, is_balanced, cold_chain_ok, packing_checklist jsonb, packed_at, adherence 'volvio_vacia'|'volvio_a_medias'|'volvio_llena'), lunchbox_items (component, recipe_id null, ingredient_id null), shopping_lists + shopping_list_items (store_section, is_checked, is_manual, source_recipe_ids), batch_cooking_sessions + batch_cooking_tasks (task_type, timer_minutes, oven_temp_c, is_done), freezer_items (recipe_id null, label, portions, frozen_at, expires_at, contains_protein, used_at).
- cooking_log (user_id, child_id, recipe_id, cooked_at, child_helped, kid_steps_done, reaction 'lo_devoro'|'lo_probo'|'lo_rechazo'|'posible_reaccion', photo_url), food_exposures (child_id, ingredient_id, recipe_id, exposed_at, reaction, route 'camuflado'|'de_frente'), passport_stamps (child_id+ingredient_id unique, first_tasted_at, accepted_at), achievements (code, name, description, audience 'padre'|'nino', criteria jsonb) + user_achievements (progress jsonb, earned_at), streaks (user_id+streak_type unique), mini_chef_missions (code, title, age_band '3_4'|'5_7'|'8_9', skill_code, level, xp_reward) + child_mission_progress, sos_requests (user_id, child_id, requested_at, request_type, meal_type, time_available_minutes, offered_recipe_ids, chosen_recipe_id), weekly_summaries, monthly_reports, push_subscriptions, reminders.

RLS: catálogo (recipes, ingredients, safety_rules, plans, etc.) = SELECT para authenticated, escritura solo service_role. Datos personales = políticas de dueño (user_id = auth.uid(); tablas colgadas de children vía función owns_child(child_id) SECURITY DEFINER; tablas nietas vía EXISTS al padre). Función has_active_subscription(uid) SECURITY DEFINER STABLE (subscriptions con status='activa' y current_period_end > now()); las políticas INSERT de meal_plans, lunchboxes, batch_cooking_sessions, food_exposures y collections la exigen. sos_requests permite INSERT sin suscripción solo si el usuario lleva 0 hoy (límite de 1 diaria del modo prueba, validado en BD). Storage: bucket recipe-images público lectura, bucket user-photos privado por carpeta {user_id}/.

AUTH: registro/login con email y contraseña + recuperación de contraseña. Sin verificación de email obligatoria por ahora.

PAYWALL (nunca hardcodeado): hook useSubscription que lee subscriptions. Sin suscripción activa = modo prueba: puede ver recetario y fichas, usar el decisor 1 vez al día; Planificador, Armador, Compras y Progreso se ven bloqueados con vista previa y CTA al paywall. Pantalla de planes: Básico $4.99/mensual, Pro $9.00/semestral, Premium $15.00/anual con badge "Mejor valor" — los 3 dan acceso completo idéntico, solo cambia la facturación. Botón "Continuar con Hotmart" como placeholder deshabilitado (tooltip "Muy pronto").

EDGE FUNCTIONS placeholder (estructura + TODOs documentados, sin conectar aún):
- payment-webhook: para Hotmart. Comentarios documentando: verificación del header X-HOTMART-HOTTOK contra secreto, eventos PURCHASE_APPROVED (upsert subscriptions status 'activa', started_at, current_period_end según billing_interval_months del plan mapeado por hotmart_offer_code), SUBSCRIPTION_CANCELLATION ('cancelada', acceso hasta current_period_end), PURCHASE_REFUNDED/CHARGEBACK (revocación), idempotencia por hotmart_transaction_ref.
- send-email: wrapper para Resend (variables RESEND_API_KEY y SEND_FROM_DOMAIN), placeholder documentado.
- Carpeta src/emails/ (o emails/) con 5 plantillas HTML transaccionales en español neutro con la identidad visual Huerto Alegre: bienvenida, confirmación de suscripción, recuperación de contraseña, aviso de renovación próxima, suscripción vencida.

PWA COMPLETA: manifest.json (name "MiniChefs", short_name "MiniChefs", theme_color #6BBF59, background_color #FFF6EC, display standalone, íconos 192/512 — crea placeholders PNG simples con la inicial "M" sobre verde manzana), service worker con precache del shell + runtime cache de recetas visitadas, instalable, y pantalla de onboarding de instalación con pasos específicos para iOS Safari (Compartir → Agregar a pantalla de inicio).

PANTALLAS v1 (todas con estados vacíos cuidados con CTA y microcopy amable anti-culpa):
1. Landing pública de marketing (hero, cómo funciona, planes, CTA)
2. Auth (login/registro/recuperar contraseña)
3. Onboarding: aceptación legal (disclaimer "esta app no reemplaza la consulta con el pediatra" + aviso de alérgenos) → wizard de perfil de hijo (nombre, fecha de nacimiento, alergias del catálogo, ¿escuela libre de maní?, ¿lonchera térmica?, ¿nació antes de las 37 semanas? con semanas de gestación) → perfil del hogar (equipamiento horno/licuadora/freidora, modo de cocina diario|una vez por semana, presupuesto normal|económico, cuántos comen en casa)
4. Home "Hoy": selector de hijo en la cabecera (avatar + nombre + edad, pivota toda la UI), comidas de hoy, micro-consejo, acceso grande al decisor "Hoy le toca", pendientes
5. Recetario: búsqueda + colecciones contextuales arriba + rejilla por tipo de comida; el filtro por edad del hijo activo y sus alergias se aplica SIEMPRE automático; chips de un tap (≤15 min, proteína, congelable)
6. Ficha de receta: imagen con componente RecipeImage (fallback automático a placeholder de categoría), badges (edad mínima, alérgenos, conservación, tiempo total), ingredientes con cantidades, pasos numerados, variantes por edad, nota personal, favorito
7. Planificador semanal por hijo: slots según etapa del hijo, botón "Generar mi semana" (v1: selección aleatoria de recetas válidas por edad/alergia/slot — el motor avanzado llega después), candado por slot, marcar cocinado
8. Armador de Loncheras: lienzo de 4 casillas (proteína, carbohidrato, fruta/verdura, bebida) con semáforo de balance en vivo y aviso de cadena de frío
9. Lista de compras generada del plan, agrupada por secciones del súper, checkable offline, botón compartir por WhatsApp
10. Decisor "Hoy le toca": 3 tarjetas de recetas válidas (hora local → tipo de comida; filtro por tiempo disponible) con "aceptar / dame otra"
11. Progreso: para el hijo (Pasaporte de Sabores con sellos por alimento probado + nivel Mini Chef) y para el padre (racha, logros)
12. Paywall + Gestión de suscripción (lee estado real de BD)
13. Ajustes: modo oscuro, modo vacaciones, cupo de dulces, comensales, legales, cerrar sesión
14. Pantalla legal permanente

SEED de ejemplo (para navegar todo; el catálogo real de 290 recetas se cargará en la siguiente fase): 3 subscription_plans, 11 allergens (huevo, lácteos, gluten, maní, frutos secos, pescado, mariscos, ajonjolí, soya, fresa, kiwi), safety_rules núcleo (miel bloqueada <12 meses, frutos secos enteros bloqueados <60 meses, dulces con azúcares libres bloqueados <24 meses, jugos bloqueados <12 meses, leche de vaca como bebida bloqueada <12 meses, espinaca/remolacha con aviso <12 meses), ~30 ingredients básicos con secciones de súper, 14 recetas de ejemplo distribuidas entre etapas y categorías (3 papillas 6-8m, 2 para 9-11m, 3 almuerzos/cenas, 2 desayunos, 2 snacks de lonchera, 2 postres sin azúcares libres) con ingredientes, pasos y al menos una variante de edad cada una, 6 achievements, 6 mini_chef_missions, 1 menu_template simple por etapa.

CONVENCIÓN DE IMÁGENES: las fichas usan receta-{slug}.webp; componente RecipeImage con onError → placeholder-categoria-{categoria}.webp. Crea los 7 placeholders de categoría como SVG/imagenes simples con la paleta (papillas, desayunos, comidas, meriendas, loncheras, postres, bebidas) en public/images/. Los assets de UI usarán nombres exactos que luego reemplazaremos (hero-landing.webp, mascota-zana-bienvenida.webp, etc.) — si no existen, degradar con elegancia.

SUPABASE INSTALLER KIT (obligatorio): carpeta /supabase-installer-kit/ en la raíz con: README-INSTALLER.md (dirigido a un LLM: qué es el kit, orden exacto de ejecución, variables a reemplazar, checklist de verificación), 01-schema.sql (tablas/tipos/índices tal cual existen), 02-rls-policies.sql, 03-functions-triggers.sql, 04-seed.sql, 05-edge-functions/ (código + instrucciones de deploy), 06-storage.md (buckets y políticas), env.example (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SEND_FROM_DOMAIN, HOTMART_HOTTOK, cada una con descripción). El kit debe reflejar EXACTAMENTE el backend real creado.

Cero menciones a "Pequeños Gourmets", "Loncheras Locas", "Saborcitos" ni a autores originales en ninguna parte.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5fb24433-066b-490a-8c48-3a89195ab3d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
