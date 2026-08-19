-- ============================================================
-- MiniChefs — 04-seed.sql
-- Datos base: planes, alérgenos, ingredientes, alergenos por ingrediente,
-- reglas de seguridad y 14 recetas de ejemplo.
-- ============================================================

-- Planes
-- Activos: Mensual y Anual. El semestral queda como plan inactivo (oculto en
-- la app) por decisión de producto; se conserva la fila por trazabilidad.
INSERT INTO public.subscription_plans (code, name, description, price_usd, billing_interval_months, is_best_value, sort_order, is_active) VALUES
  ('mensual',   'Mensual', 'Acceso completo, facturación mensual.',            4.99,  1, false, 1, true),
  ('semestral', 'Pro',     'Acceso completo, facturación cada 6 meses.',       15.00, 6, false, 2, false),
  ('anual',     'Anual',   'Acceso completo, facturación anual. Mejor valor.', 29.99, 12, true,  3, true)
ON CONFLICT (code) DO NOTHING;

-- Alérgenos
INSERT INTO public.allergens (code, name, sort_order) VALUES
  ('huevo','Huevo',1),('lacteos','Lácteos',2),('gluten','Gluten',3),
  ('mani','Maní',4),('frutos_secos','Frutos secos',5),('pescado','Pescado',6),
  ('mariscos','Mariscos',7),('ajonjoli','Ajonjolí',8),('soya','Soya',9),
  ('fresa','Fresa',10),('kiwi','Kiwi',11)
ON CONFLICT (code) DO NOTHING;

-- Ingredientes
INSERT INTO public.ingredients (code, name, category, is_free_sugar, is_juice, is_cow_milk_drink, is_honey, is_whole_nut) VALUES
  ('zanahoria','Zanahoria','verdura',false,false,false,false,false),
  ('papa','Papa','tuberculo',false,false,false,false,false),
  ('camote','Camote','tuberculo',false,false,false,false,false),
  ('pollo','Pechuga de pollo','proteina',false,false,false,false,false),
  ('res_molida','Carne de res molida','proteina',false,false,false,false,false),
  ('huevo','Huevo','proteina',false,false,false,false,false),
  ('avena','Hojuelas de avena','cereal',false,false,false,false,false),
  ('arroz','Arroz','cereal',false,false,false,false,false),
  ('platano','Plátano','fruta',false,false,false,false,false),
  ('manzana','Manzana','fruta',false,false,false,false,false),
  ('brocoli','Brócoli','verdura',false,false,false,false,false),
  ('espinaca','Espinaca','verdura',false,false,false,false,false),
  ('tomate','Tomate','verdura',false,false,false,false,false),
  ('lenteja','Lentejas','legumbre',false,false,false,false,false),
  ('queso_fresco','Queso fresco','lacteo',false,false,false,false,false),
  ('yogur_natural','Yogur natural sin azúcar','lacteo',false,false,false,false,false),
  ('aceite_oliva','Aceite de oliva','grasa',false,false,false,false,false),
  ('pan_integral','Pan integral','cereal',false,false,false,false,false),
  ('salmon','Salmón','proteina',false,false,false,false,false),
  ('aguacate','Aguacate','grasa',false,false,false,false,false),
  ('miel','Miel','endulzante',true,false,false,true,false),
  ('leche_vaca','Leche de vaca','lacteo',false,false,true,false,false),
  ('jugo_naranja','Jugo de naranja','bebida',true,true,false,false,false),
  ('nuez_entera','Nuez entera','frutosseco',false,false,false,false,true),
  ('mantequilla_mani','Mantequilla de maní','proteina',false,false,false,false,false),
  ('atun','Atún en agua','proteina',false,false,false,false,false),
  ('quinoa','Quinoa','cereal',false,false,false,false,false),
  ('calabaza','Calabaza','verdura',false,false,false,false,false),
  ('fresa','Fresa','fruta',false,false,false,false,false)
ON CONFLICT (code) DO NOTHING;

-- Alérgenos por ingrediente
INSERT INTO public.ingredient_allergens (ingredient_id, allergen_id)
SELECT i.id, a.id FROM public.ingredients i JOIN public.allergens a ON
  (i.code='huevo' AND a.code='huevo') OR
  (i.code='queso_fresco' AND a.code='lacteos') OR
  (i.code='yogur_natural' AND a.code='lacteos') OR
  (i.code='leche_vaca' AND a.code='lacteos') OR
  (i.code='pan_integral' AND a.code='gluten') OR
  (i.code='avena' AND a.code='gluten') OR
  (i.code='salmon' AND a.code='pescado') OR
  (i.code='atun' AND a.code='pescado') OR
  (i.code='nuez_entera' AND a.code='frutos_secos') OR
  (i.code='mantequilla_mani' AND a.code='mani') OR
  (i.code='fresa' AND a.code='fresa')
ON CONFLICT DO NOTHING;

-- Reglas de seguridad
INSERT INTO public.safety_rules (code, title, description, kind, min_age_months, max_age_months, ingredient_predicate, sort_order) VALUES
  ('no_miel_12m','Sin miel antes de 12 meses','La miel puede contener esporas de Clostridium botulinum. Prohibida en menores de 1 año.','prohibido',0,11,'is_honey',1),
  ('no_frutos_secos_60m','Nada de frutos secos enteros antes de los 5 años','Los frutos secos enteros son la principal causa de asfixia. Prefiere versiones molidas o en pasta.','prohibido',0,59,'is_whole_nut',2),
  ('no_azucar_libre_24m','Sin azúcares libres antes de 24 meses','La OMS recomienda cero azúcares añadidos en los primeros 2 años de vida.','prohibido',0,23,'is_free_sugar',3),
  ('no_jugos_12m','Sin jugos antes de 12 meses','Ofrece fruta entera o en trozos. Los jugos no aportan la fibra necesaria.','prohibido',0,11,'is_juice',4),
  ('no_leche_vaca_bebida_12m','Sin leche de vaca como bebida antes de 12 meses','Puede usarse en preparaciones pequeñas después de 6 meses, pero no como bebida principal.','prohibido',0,11,'is_cow_milk_drink',5),
  ('sal_reducida_24m','Sal muy reducida hasta los 2 años','Los riñones aún están madurando. Evita sal añadida.','evitar',0,23,NULL,6),
  ('lavado_manos','Lava manos y superficies','Siempre lava manos, tabla y utensilios antes de preparar comida infantil.','precaucion',0,NULL,NULL,7),
  ('coccion_completa','Cocción completa de proteínas','Huevo, pollo, res y pescado deben cocerse por completo hasta los 5 años.','precaucion',0,59,NULL,8)
ON CONFLICT (code) DO NOTHING;

-- 14 recetas de ejemplo
INSERT INTO public.recipes (slug, title, description, category, min_age_months, max_age_months, texture_stages, prep_minutes, cook_minutes, servings, difficulty, suitable_slots, is_batch_friendly, is_lunchbox_friendly, is_economic, requires_oven, requires_blender, image_filename, fallback_image, tips) VALUES
('pure-zanahoria-pollo','Puré de zanahoria con pollito','Un clásico primer sabor: dulce natural de la zanahoria con pollo bien cocido.','papilla',6,18,ARRAY[1,2],10,20,2,1,ARRAY['almuerzo','cena']::public.meal_slot[],true,false,true,false,true,'receta-pure-zanahoria-pollo.webp','placeholder-categoria-papilla_pure.svg','Puedes congelar en cubitos de silicona hasta 1 mes.'),
('papilla-camote-avena','Papilla de camote y avena','Suave, dulce y rica en fibra. Ideal para el desayuno.','papilla',6,24,ARRAY[1,2,3],5,15,2,1,ARRAY['desayuno']::public.meal_slot[],true,false,true,false,true,'receta-papilla-camote-avena.webp','placeholder-categoria-papilla_pure.svg',NULL),
('avena-platano','Avena con plátano','Desayuno tibio para empezar con energía.','desayuno',9,120,ARRAY[3,4,5],5,10,2,1,ARRAY['desayuno']::public.meal_slot[],false,false,true,false,false,'receta-avena-platano.webp','placeholder-categoria-desayuno.svg','Añade canela para un toque cálido.'),
('huevo-revuelto-aguacate','Huevo revuelto con aguacate','Proteína y grasa buena para arrancar el día.','desayuno',12,120,ARRAY[3,4,5],5,7,1,1,ARRAY['desayuno']::public.meal_slot[],false,false,true,false,false,'receta-huevo-revuelto-aguacate.webp','placeholder-categoria-desayuno.svg',NULL),
('pollo-arroz-brocoli','Pollo con arroz y brócoli','Almuerzo balanceado, fácil de preparar en batch.','almuerzo',10,120,ARRAY[3,4,5],10,25,3,2,ARRAY['almuerzo']::public.meal_slot[],true,true,true,false,false,'receta-pollo-arroz-brocoli.webp','placeholder-categoria-almuerzo.svg','Doble la cantidad y guarda para dos días.'),
('albondigas-tomate','Albóndigas de res en salsa de tomate','Suaves y fáciles de tomar con tenedor.','almuerzo',12,120,ARRAY[4,5],15,25,4,2,ARRAY['almuerzo','cena']::public.meal_slot[],true,true,true,false,false,'receta-albondigas-tomate.webp','placeholder-categoria-almuerzo.svg',NULL),
('lentejas-cremosas','Lentejas cremosas','Proteína vegetal completa cuando se combinan con arroz.','almuerzo',9,120,ARRAY[2,3,4,5],10,35,4,1,ARRAY['almuerzo','cena']::public.meal_slot[],true,false,true,false,true,'receta-lentejas-cremosas.webp','placeholder-categoria-almuerzo.svg','Congela porciones individuales.'),
('salmon-horno-camote','Salmón al horno con camote','Cena rica en omega-3.','cena',12,120,ARRAY[4,5],10,25,2,2,ARRAY['cena']::public.meal_slot[],false,false,false,true,false,'receta-salmon-horno-camote.webp','placeholder-categoria-cena.svg',NULL),
('sopa-calabaza','Sopa cremosa de calabaza','Reconfortante para las cenas frescas.','cena',8,120,ARRAY[1,2,3,4,5],10,25,4,1,ARRAY['cena']::public.meal_slot[],true,false,true,false,true,'receta-sopa-calabaza.webp','placeholder-categoria-cena.svg',NULL),
('yogur-fruta','Yogur con fruta','Colación fresca sin azúcar añadido.','colacion',9,120,ARRAY[3,4,5],3,0,1,1,ARRAY['colacion_am','colacion_pm']::public.meal_slot[],false,false,true,false,false,'receta-yogur-fruta.webp','placeholder-categoria-merienda.svg',NULL),
('lonchera-atun-quinoa','Lonchera: atún con quinoa','Balanceada: proteína, cereal, verdura y fruta.','lonchera',36,120,ARRAY[4,5],15,15,1,2,ARRAY['lonchera']::public.meal_slot[],true,true,true,false,false,'receta-lonchera-atun-quinoa.webp','placeholder-categoria-lonchera.svg','Termo si el hijo no tiene lonchera térmica.'),
('lonchera-huevo-pan','Lonchera: huevo duro con pan integral','Rápida y económica para días con prisa.','lonchera',18,120,ARRAY[4,5],5,10,1,1,ARRAY['lonchera']::public.meal_slot[],false,true,true,false,false,'receta-lonchera-huevo-pan.webp','placeholder-categoria-lonchera.svg',NULL),
('galletas-avena-platano','Galletas de avena y plátano','Postre sin azúcar añadido, ideal para colación.','postre',12,120,ARRAY[4,5],10,15,6,1,ARRAY['colacion_am','colacion_pm']::public.meal_slot[],true,true,true,true,false,'receta-galletas-avena-platano.webp','placeholder-categoria-postre.svg','Se conservan 3 días en recipiente hermético.'),
('agua-fruta-natural','Agua saborizada con fruta','Bebida fresca sin azúcar libre.','bebida',12,120,ARRAY[3,4,5],5,0,4,1,ARRAY['colacion_am','colacion_pm','almuerzo','cena']::public.meal_slot[],false,false,true,false,false,'receta-agua-fruta-natural.webp','placeholder-categoria-bebida.svg',NULL)
ON CONFLICT (slug) DO NOTHING;

-- Pasos genéricos por receta (con paso crítico de cocción)
INSERT INTO public.recipe_steps (recipe_id, step_number, instruction, is_safety_critical)
SELECT r.id, s.n, s.txt, s.crit FROM public.recipes r
CROSS JOIN LATERAL (VALUES
  (1, 'Lava y pela los ingredientes.', false),
  (2, 'Cocina hasta que la proteína esté completamente cocida en el centro.', true),
  (3, 'Ajusta la textura al estadio del hijo y sirve tibio.', false)
) AS s(n, txt, crit)
WHERE NOT EXISTS (SELECT 1 FROM public.recipe_steps rs WHERE rs.recipe_id = r.id);
