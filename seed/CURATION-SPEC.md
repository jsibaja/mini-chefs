# Especificación de curaduría — Catálogo MiniChefs (290 recetas)

Este documento es la fuente de verdad para los agentes que curan recetas. Cada receta curada se escribe como UN archivo JSON en `seed/recipes/{slug}.json`.

## Formato JSON canónico (todos los campos obligatorios salvo los marcados null-ok)

```json
{
  "slug": "kebab-case-ascii-unico",
  "title": "Nombre en español neutro, atractivo, sin marcas registradas",
  "description": "1-2 frases apetitosas y honestas para la ficha.",
  "category": "papilla|desayuno|almuerzo|cena|colacion|lonchera|postre|bebida",
  "min_age_months": 6,
  "max_age_months": null,
  "texture_stages": [1, 2, 3, 4, 5],
  "prep_minutes": 10,
  "cook_minutes": 20,
  "servings": 2,
  "difficulty": 1,
  "suitable_slots": ["desayuno", "colacion_am", "almuerzo", "colacion_pm", "cena", "lonchera"],
  "is_batch_friendly": false,
  "is_lunchbox_friendly": false,
  "is_economic": false,
  "requires_oven": false,
  "requires_blender": false,
  "conservation": "estable_ambiente|requiere_frio|requiere_termo",
  "is_freezable": false,
  "freezer_months": null,
  "protein_group": null,
  "veggie_colors": [],
  "carb_base": null,
  "has_free_sugars": false,
  "is_occasional_sweet": false,
  "nutrition_blurb": "1-2 frases factuales de por qué es buena para el niño. Sin claims médicos.",
  "tips": "Un consejo útil y NUEVO (no repetir el último paso).",
  "family_mode_note": null,
  "variants": [
    { "age_band": "6_8m", "adaptation_text": "Cómo adaptarla exactamente para esa edad." }
  ],
  "ingredients": [
    { "code": "zanahoria", "name": "Zanahoria", "amount": 2, "unit": "unidad", "note": "en cubos", "sort_order": 1 }
  ],
  "steps": [
    { "step_number": 1, "instruction": "Texto imperativo con tú.", "is_safety_critical": false }
  ],
  "source": { "book": "gourmets|loncheras|saborcitos|nueva", "numbers": [5, 24], "pages": [23, 42] },
  "image_filename": "receta-{slug}.webp",
  "fallback_image": "placeholder-categoria-{papillas|desayunos|comidas|meriendas|loncheras|postres|bebidas}.webp"
}
```

## Reglas de valores
- `texture_stages`: etapas que puede comer TAL CUAL o con la variante indicada. 1=6-8m (puré), 2=9-11m (machacado/trocitos blandos), 3=12-24m (familiar adaptada), 4=2-5a, 5=6-9a. Una papilla de inicio: [1,2]. Un plato escolar duro: [4,5] o [3,4,5] si tiene variante.
- `min_age_months` coherente con texture_stages: etapa 1→6, 2→9, 3→12, 4→24, 5→72... usa el MENOR con el que sea segura (con variante incluida).
- `difficulty`: 1 fácil, 2 media, 3 elaborada.
- `protein_group`: pescado|carne_roja|pollo_pavo|huevo|legumbre|lacteo|null (solo el dominante).
- `veggie_colors`: subconjunto de verde|rojo|naranja|morado|blanco_amarillo (colores de verduras/frutas protagonistas).
- `carb_base`: pasta|arroz|quinua|cuscus|papa|avena|maiz|pan|null.
- `conservation`: crítico para loncheras. Con lácteo/huevo/carne/pescado sin cadena de frío = requiere_frio (o requiere_termo si va caliente).
- `is_freezable` + `freezer_months`: 3 meses, o 2 si contiene proteína animal.
- `has_free_sugars`: true si lleva miel, panela, agave, azúcar, jarabe de arce, dátiles/pasas TRITURADOS como endulzante, jugo concentrado. Si true ⇒ `min_age_months >= 24` y `is_occasional_sweet: true` (regla OMS).
- `ingredients.code`: snake_case ascii en singular (zanahoria, pechuga_pollo, harina_avena, leche_materna_o_formula). Reutiliza códigos obvios; la consolidación posterior unifica.
- `steps.is_safety_critical: true` para pasos de cocción completa de pollo/huevo/pescado, revisión de espinas, retirar palillos, cortes anti-atragantamiento.
- `variants`: incluye una por CADA banda de edad donde la preparación cambia (no dupliques la preparación base). age_band: 6_8m|9_11m|12_24m|2_5a|6_9a.

## Reglas editoriales innegociables (aplicar SIEMPRE)
1. **Español neutro latinoamericano**: tú (nunca vos/vosotros), papa (no patata), durazno, camote, frijoles, res (no ternera), refrigerador, jugo, crema, panqueques, waffles, paletas, hongos, arvejas, ejotes/vainitas, calabacita (zucchini), choclo/elote, betabel/remolacha con paréntesis en primera mención. Glosario completo en `Ebooks en PDF/extracciones/analisis-fase-a/libro_*.md`.
2. **Seguridad (correcciones obligatorias del material)**:
   - Miel: PROHIBIDA <12 meses. Receta con miel → o se sustituye (plátano maduro/dátil SOLO si min_age>=24 por regla de azúcares; para bebés: fruta madura sin triturar como puré) o min_age_months>=24.
   - Huevo: siempre bien cocido (nunca crudo: nada de mayonesa casera, claras crudas montadas → usar alternativas). Huevo ENTERO desde los 6 meses (corregir "solo yema").
   - Frutos secos: enteros PROHIBIDOS <60 meses (is_whole_nut). Molidos o en crema untada fina: permitidos desde 6m.
   - Espinaca/acelga/remolacha: como protagonista ⇒ min_age_months>=12, o variante 6-11m con porción pequeña y nota de nitratos en tips.
   - Leche de vaca como bebida principal <12m: no; en preparaciones cocidas pequeñas está bien desde 9-12m (usa "leche materna o fórmula" en papillas).
   - Leche materna NUNCA se hierve: se agrega tibia al final, fuera del fuego.
   - Jugos: no <12 meses; marcarlos ocasionales.
   - Uvas/tomates cherry: siempre "en cuartos a lo largo" en steps para <5a (safety_critical).
   - Palillos/brochetas: paso safety_critical "retira los palillos antes de servir a menores de 5".
   - Cadena de frío: toda lonchera con proteína/lácteo lleva conservation correcta y consejo de gel refrigerante/termo.
   - Sal/azúcar: nada añadido <12m; "poca sal, caldo casero sin sal" 12m+.
   - Avena y "sin gluten": solo si "avena certificada sin gluten".
3. **Sin marcas registradas ni personajes** (Superman, Blanca Nieves, Nutella, Snickers, galletas María, Instant Pot...) ni anglicismos innecesarios (Fake Sushi, Cake Pops, Immunity Shot). Renombra con gancho kid-friendly + subtítulo descriptivo.
4. **Sin claims médicos** ("sube defensas", "antigripal", "anticancerígeno", "previene alergias", "quema grasa"). nutrition_blurb factual en clave de crecimiento y energía, no de dieta adulta (nada de "solo claras", "baja en carbohidratos", colesterol).
5. **Recetas rotas**: corrige técnica (leudados, temperaturas reales, tiempos reales incluyendo refrigeración, ingredientes fantasma, cantidades vagas → cuantificar). Los hallazgos por receta están en `analisis-fase-a/libro_*.md`.
6. **Consejo (tips)**: contenido NUEVO útil (conservación, variante, edad) — jamás repetir el último paso.
7. **Cero menciones** a los ebooks o autores originales.

## Salida
- Un archivo por receta: `seed/recipes/{slug}.json` (UTF-8, JSON válido).
- El slug es asignado en el plan de procesamiento; úsalo tal cual.
