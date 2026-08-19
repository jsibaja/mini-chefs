"""
build_image_prompts.py — Genera el prompt visual de cada una de las 290 recetas
para el Space de Magnific (Nano Banana 2). Salida:
  seed/image-prompts.json  — lista [{slug, category, filename, aspect, prompt}]
  seed/image-prompts.csv   — mismas columnas, para pegar/duplicar en el Space

NO genera imágenes ni gasta créditos: solo produce texto.
"""
import json, os, glob, csv, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))

BASE = ("Fotografía gastronómica apetitosa y realista de comida para niños, "
        "servida sobre mesa de madera clara, luz natural suave de ventana lateral, "
        "ángulo cenital a 45 grados, fondo cálido neutro ligeramente desenfocado, "
        "props mínimos: servilleta de tela en tono verde manzana o menta y cubierto "
        "infantil, porción de tamaño infantil, colores naturales vivos del alimento, "
        "aspecto casero y fresco, sin manos, sin personas, sin texto, sin letras, "
        "sin marcas, sin empaques comerciales.")

# Bloque de estilo de servido por categoría (coincide con las plantillas del Space)
CAT_BLOCK = {
    "papilla":  "Servido en bowl pequeño de silicona color menta, textura de puré visible, cuchara de bebé al lado.",
    "desayuno": "Servicio matutino en plato infantil de cerámica crema, luz más clara y fresca.",
    "almuerzo": "Plato principal servido en plato infantil de cerámica crema, porción pequeña.",
    "cena":     "Plato principal servido en plato infantil de cerámica crema, porción pequeña, ambiente cálido de cena.",
    "colacion": "Porción para llevar sobre servilleta de tela, presentación sencilla.",
    "lonchera": "Servido dentro de un compartimento de lonchera bento abierta, vista cenital.",
    "postre":   "Porción individual pequeña en recipiente infantil, presentación sencilla sin decoración excesiva.",
    "bebida":   "Servido en vaso infantil con popote o termo infantil, fondo despejado.",
}
CAT_PLACEHOLDER = {  # para referencia; el nodo hereda categoría
    "papilla": "papillas", "desayuno": "desayunos", "almuerzo": "comidas",
    "cena": "comidas", "colacion": "meriendas", "lonchera": "loncheras",
    "postre": "postres", "bebida": "bebidas",
}

# Ingredientes que NO se ven en el plato o no lo definen visualmente
FILLER = {
    "agua","sal","pimienta","aceite","aceite_oliva","aceite_vegetal","aceite_coco",
    "aceite_girasol","ajo","ajo_en_polvo","cebolla","cebolla_morada","perejil","cilantro",
    "oregano","comino","laurel","canela","nuez_moscada","curcuma","paprika","vainilla",
    "esencia_vainilla","polvo_hornear","bicarbonato","levadura","caldo_pollo","caldo_verduras",
    "caldo_pescado","papel_horno","papel_de_horno","jengibre","vinagre","limon","jugo_limon",
    "gel_refrigerante","hielo","menta","agua_tibia",
}

def dish_visual(r):
    """Descripción visual limpia del platillo: título + hasta 3 ingredientes visibles."""
    title = r["title"]
    mains = []
    for ing in r.get("ingredients", []):
        code = ing.get("code", "")
        if code in FILLER:
            continue
        name = (ing.get("name") or code.replace("_", " ")).strip()
        # nombre corto: quitar aclaraciones entre paréntesis
        name = name.split("(")[0].strip().lower()
        if name and name not in mains:
            mains.append(name)
        if len(mains) >= 3:
            break
    if mains:
        return f"{title}, con {', '.join(mains)}, servido de forma apetitosa y natural"
    return f"{title}, servido de forma apetitosa y natural"

def main():
    files = sorted(glob.glob(os.path.join(HERE, "recipes", "*.json")))
    rows = []
    for f in files:
        r = json.load(open(f, encoding="utf-8"))
        cat = r["category"]
        block = CAT_BLOCK.get(cat, CAT_BLOCK["almuerzo"])
        prompt = f"{BASE} {block} PLATILLO: {dish_visual(r)}"
        rows.append({
            "slug": r["slug"],
            "category": cat,
            "filename": f"receta-{r['slug']}.webp",
            "aspect": "1:1",          # las tarjetas del recetario son cuadradas
            "prompt": prompt,
        })

    with open(os.path.join(HERE, "image-prompts.json"), "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False, indent=2)

    with open(os.path.join(HERE, "image-prompts.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["slug", "category", "filename", "aspect", "prompt"])
        w.writeheader()
        w.writerows(rows)

    from collections import Counter
    by_cat = Counter(r["category"] for r in rows)
    print(f"Prompts generados: {len(rows)}")
    print("Por categoría:", dict(by_cat))
    print("Ejemplo:", rows[0]["filename"], "->", rows[0]["prompt"][:130], "...")

if __name__ == "__main__":
    main()
