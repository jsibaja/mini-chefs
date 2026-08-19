"""
build_seed.py — Lee seed/recipes/*.json (recetas curadas), consolida ingredientes,
valida el catálogo (unicidad, seguridad, cobertura) y genera 05-seed-recipes.sql.

Uso: python seed/build_seed.py           # valida + genera SQL
     python seed/build_seed.py --check   # solo valida, no escribe SQL
"""
import json, os, re, sys, glob, unicodedata, io
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
RECIPES_DIR = os.path.join(HERE, "recipes")
OUT_SQL = os.path.join(HERE, "..", "supabase-installer-kit", "05-seed-recipes.sql")

VALID_CATEGORY = {"papilla","desayuno","almuerzo","cena","colacion","lonchera","postre","bebida"}
VALID_SLOTS = {"desayuno","colacion_am","almuerzo","colacion_pm","cena","lonchera"}
VALID_CONSERVATION = {"estable_ambiente","requiere_frio","requiere_termo"}
VALID_PROTEIN = {"pescado","carne_roja","pollo_pavo","huevo","legumbre","lacteo"}
VALID_BANDS = {"6_8m","9_11m","12_24m","2_5a","6_9a"}
VALID_COLORS = {"verde","rojo","naranja","morado","blanco_amarillo"}
VALID_CARB = {"pasta","arroz","quinua","cuscus","papa","avena","maiz","pan"}

# Ingredientes que disparan reglas de seguridad por code (heurística por substring)
HONEY = ("miel",)
WHOLE_NUT = ("nuez_entera","almendra_entera","cacahuate_entero","mani_entero","pistacho_entero","avellana_entera")
FREE_SUGAR_HINT = ("miel","panela","azucar","agave","jarabe","sirope")

def sql_str(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def sql_bool(b):
    return "true" if b else "false"

def sql_int(n):
    return "NULL" if n is None else str(int(n))

def sql_num(n):
    return "NULL" if n is None else str(n)

def sql_text_array(arr):
    if not arr:
        return "ARRAY[]::TEXT[]"
    inner = ",".join(sql_str(x) for x in arr)
    return "ARRAY[" + inner + "]::TEXT[]"

def sql_slot_array(arr):
    if not arr:
        return "ARRAY[]::public.meal_slot[]"
    inner = ",".join(sql_str(x) for x in arr)
    return "ARRAY[" + inner + "]::public.meal_slot[]"

def sql_int_array(arr):
    if not arr:
        return "NULL"
    return "ARRAY[" + ",".join(str(int(x)) for x in arr) + "]::INT[]"

def norm_title(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii","ignore").decode()
    t = re.sub(r"[^a-z0-9 ]", "", t.lower())
    return re.sub(r"\s+", " ", t).strip()

def main():
    check_only = "--check" in sys.argv
    files = sorted(glob.glob(os.path.join(RECIPES_DIR, "*.json")))
    recipes = []
    errors = []
    warnings = []
    slugs = {}
    title_norms = defaultdict(list)
    ingredients = {}   # code -> {name, category, flags...}

    for f in files:
        base = os.path.basename(f)
        try:
            r = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            errors.append(f"{base}: JSON inválido — {e}")
            continue

        slug = r.get("slug")
        if not slug:
            errors.append(f"{base}: sin slug"); continue
        if slug in slugs:
            errors.append(f"DUPLICADO slug '{slug}' en {base} y {slugs[slug]}")
        slugs[slug] = base

        for field in ("title","category","min_age_months"):
            if r.get(field) in (None, ""):
                errors.append(f"{slug}: falta '{field}'")

        cat = r.get("category")
        if cat not in VALID_CATEGORY:
            errors.append(f"{slug}: category inválida '{cat}'")

        for s in r.get("suitable_slots", []):
            if s not in VALID_SLOTS:
                errors.append(f"{slug}: slot inválido '{s}'")
        cons = r.get("conservation")
        if cons not in VALID_CONSERVATION:
            errors.append(f"{slug}: conservation inválida '{cons}'")
        pg = r.get("protein_group")
        if pg not in (None,) and pg not in VALID_PROTEIN:
            errors.append(f"{slug}: protein_group inválido '{pg}'")
        cb = r.get("carb_base")
        if cb not in (None,) and cb not in VALID_CARB:
            warnings.append(f"{slug}: carb_base no estándar '{cb}'")
        for c in r.get("veggie_colors", []):
            if c not in VALID_COLORS:
                warnings.append(f"{slug}: veggie_color no estándar '{c}'")

        min_age = r.get("min_age_months") or 0
        title_norms[norm_title(r.get("title",""))].append(slug)

        ings = r.get("ingredients", [])
        if not ings:
            warnings.append(f"{slug}: sin ingredientes")
        codes = []
        for ing in ings:
            code = ing.get("code")
            if not code:
                errors.append(f"{slug}: ingrediente sin code"); continue
            codes.append(code)
            if code not in ingredients:
                ingredients[code] = {
                    "name": ing.get("name", code.replace("_"," ").capitalize()),
                    "category": ing.get("category"),
                    "is_honey": any(h in code for h in HONEY),
                    "is_whole_nut": code in WHOLE_NUT,
                    "is_free_sugar": any(h in code for h in FREE_SUGAR_HINT),
                    "is_juice": ("jugo" in code) and code not in ("jugo_limon", "jugo_lima"),
                    "is_cow_milk_drink": code in ("leche_vaca","leche_de_vaca"),
                }

        # --- Reglas de seguridad ---
        has_honey = any(any(h in c for h in HONEY) for c in codes)
        has_whole_nut = any(c in WHOLE_NUT for c in codes)
        has_free_sugar_flag = r.get("has_free_sugars", False)
        if has_honey and min_age < 12:
            errors.append(f"SEGURIDAD {slug}: contiene miel y min_age_months={min_age} (<12)")
        if has_whole_nut and min_age < 60:
            errors.append(f"SEGURIDAD {slug}: fruto seco entero y min_age_months={min_age} (<60)")
        if has_free_sugar_flag and min_age < 24:
            errors.append(f"SEGURIDAD {slug}: has_free_sugars=true y min_age_months={min_age} (<24)")
        if has_free_sugar_flag and not r.get("is_occasional_sweet", False):
            warnings.append(f"{slug}: has_free_sugars=true pero is_occasional_sweet=false")
        # Jugos de fruta: no antes de los 12 meses (OMS/AAP). El limón/lima es
        # acidulante en cantidades mínimas, no cuenta como jugo de fruta.
        has_juice = any(("jugo" in c) and c not in ("jugo_limon", "jugo_lima") for c in codes)
        if has_juice and min_age < 12:
            errors.append(f"SEGURIDAD {slug}: lleva jugo de fruta y min_age_months={min_age} (<12)")
        if r.get("is_freezable") and r.get("freezer_months") is None:
            warnings.append(f"{slug}: is_freezable sin freezer_months")

        for v in r.get("variants", []):
            if v.get("age_band") not in VALID_BANDS:
                errors.append(f"{slug}: variant age_band inválido '{v.get('age_band')}'")

        steps = r.get("steps", [])
        nums = [s.get("step_number") for s in steps]
        if nums and sorted(nums) != list(range(1, len(nums)+1)):
            warnings.append(f"{slug}: step_number no consecutivos {nums}")

        recipes.append(r)

    # duplicados por título normalizado
    for tn, sl in title_norms.items():
        if len(sl) > 1:
            errors.append(f"TÍTULO DUPLICADO '{tn}': {sl}")

    print(f"Archivos: {len(files)} | Recetas válidas: {len(recipes)} | Ingredientes únicos: {len(ingredients)}")
    print(f"ERRORES: {len(errors)} | ADVERTENCIAS: {len(warnings)}")
    for e in errors[:80]:
        print("  ✗", e)
    for w in warnings[:40]:
        print("  ·", w)

    # distribución
    by_cat = defaultdict(int)
    by_stage = defaultdict(int)
    for r in recipes:
        by_cat[r.get("category")] += 1
        for s in r.get("texture_stages", []):
            by_stage[s] += 1
    print("Por categoría:", dict(by_cat))
    print("Por etapa (texture_stage):", dict(sorted(by_stage.items())))

    if check_only:
        return 1 if errors else 0
    if errors:
        print("\nNO se genera SQL: corrige los errores primero.")
        return 1

    # ---------- Generar SQL ----------
    lines = []
    lines.append("-- ============================================================")
    lines.append("-- MiniChefs — 05-seed-recipes.sql  (GENERADO por seed/build_seed.py)")
    lines.append(f"-- {len(recipes)} recetas, {len(ingredients)} ingredientes. NO editar a mano.")
    lines.append("-- Ejecutar DESPUÉS de 01/02/03 y de la migración recipe_curation_fields.")
    lines.append("-- ============================================================\n")

    # ingredientes
    lines.append("INSERT INTO public.ingredients (code, name, category, is_free_sugar, is_juice, is_cow_milk_drink, is_honey, is_whole_nut) VALUES")
    vals = []
    for code, m in sorted(ingredients.items()):
        vals.append(f"  ({sql_str(code)}, {sql_str(m['name'])}, {sql_str(m['category'])}, "
                    f"{sql_bool(m['is_free_sugar'])}, {sql_bool(m['is_juice'])}, {sql_bool(m['is_cow_milk_drink'])}, "
                    f"{sql_bool(m['is_honey'])}, {sql_bool(m['is_whole_nut'])})")
    lines.append(",\n".join(vals) + "\nON CONFLICT (code) DO NOTHING;\n")

    # recetas
    for r in recipes:
        lines.append(f"-- {r['slug']}")
        lines.append("INSERT INTO public.recipes (slug, title, description, category, min_age_months, max_age_months, "
                     "texture_stages, prep_minutes, cook_minutes, servings, difficulty, suitable_slots, "
                     "is_batch_friendly, is_lunchbox_friendly, is_economic, requires_oven, requires_blender, "
                     "conservation, is_freezable, freezer_months, protein_group, veggie_colors, carb_base, "
                     "has_free_sugars, is_occasional_sweet, nutrition_blurb, tips, family_mode_note, "
                     "source_book, source_numbers, image_filename, fallback_image) VALUES (")
        ts = r.get("texture_stages") or [1,2,3,4,5]
        src = r.get("source", {})
        row = [
            sql_str(r["slug"]), sql_str(r["title"]), sql_str(r.get("description")), sql_str(r["category"]),
            sql_int(r["min_age_months"]), sql_int(r.get("max_age_months")),
            "ARRAY[" + ",".join(str(int(x)) for x in ts) + "]::INT[]",
            sql_int(r.get("prep_minutes",15)), sql_int(r.get("cook_minutes",15)),
            sql_int(r.get("servings",2)), sql_int(r.get("difficulty",1)),
            sql_slot_array(r.get("suitable_slots")),
            sql_bool(r.get("is_batch_friendly")), sql_bool(r.get("is_lunchbox_friendly")),
            sql_bool(r.get("is_economic")), sql_bool(r.get("requires_oven")), sql_bool(r.get("requires_blender")),
            sql_str(r.get("conservation","estable_ambiente")), sql_bool(r.get("is_freezable")),
            sql_int(r.get("freezer_months")),
            ("NULL" if not r.get("protein_group") else sql_str(r["protein_group"]) + "::public.protein_group"),
            sql_text_array(r.get("veggie_colors")), sql_str(r.get("carb_base")),
            sql_bool(r.get("has_free_sugars")), sql_bool(r.get("is_occasional_sweet")),
            sql_str(r.get("nutrition_blurb")), sql_str(r.get("tips")), sql_str(r.get("family_mode_note")),
            sql_str(src.get("book")), sql_int_array(src.get("numbers")),
            sql_str(r.get("image_filename") or f"receta-{r['slug']}.webp"),
            sql_str(r.get("fallback_image")),
        ]
        lines.append("  " + ", ".join(row))
        lines.append(") ON CONFLICT (slug) DO NOTHING;")

        # ingredientes de la receta
        for ing in r.get("ingredients", []):
            lines.append(
                "INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, amount, unit, note, sort_order) "
                f"SELECT r.id, i.id, {sql_num(ing.get('amount'))}, {sql_str(ing.get('unit'))}, {sql_str(ing.get('note'))}, {sql_int(ing.get('sort_order',0))} "
                f"FROM public.recipes r, public.ingredients i WHERE r.slug={sql_str(r['slug'])} AND i.code={sql_str(ing['code'])} "
                "ON CONFLICT (recipe_id, ingredient_id, sort_order) DO NOTHING;")
        # pasos
        for st in r.get("steps", []):
            lines.append(
                "INSERT INTO public.recipe_steps (recipe_id, step_number, instruction, is_safety_critical) "
                f"SELECT r.id, {sql_int(st['step_number'])}, {sql_str(st['instruction'])}, {sql_bool(st.get('is_safety_critical'))} "
                f"FROM public.recipes r WHERE r.slug={sql_str(r['slug'])} ON CONFLICT (recipe_id, step_number) DO NOTHING;")
        # variantes
        for v in r.get("variants", []):
            lines.append(
                "INSERT INTO public.recipe_variants (recipe_id, age_band, adaptation_text) "
                f"SELECT r.id, {sql_str(v['age_band'])}::public.age_band, {sql_str(v['adaptation_text'])} "
                f"FROM public.recipes r WHERE r.slug={sql_str(r['slug'])} ON CONFLICT (recipe_id, age_band) DO NOTHING;")
        lines.append("")

    os.makedirs(os.path.dirname(OUT_SQL), exist_ok=True)
    with open(OUT_SQL, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"\nSQL generado: {OUT_SQL} ({len(lines)} líneas)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
