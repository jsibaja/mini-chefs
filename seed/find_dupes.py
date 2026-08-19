"""
find_dupes.py — Detecta recetas duplicadas o casi idénticas ENTRE libros distintos.
Compara firma de ingredientes principales + similitud de título + categoría.
Uso: python seed/find_dupes.py
"""
import json, glob, os, re, sys, io, unicodedata
from itertools import combinations

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))

STOP = {"de","con","y","el","la","los","las","al","a","en","para","sin","un","una"}
# ingredientes de relleno que no definen identidad
FILLER = {"sal","pimienta","agua","aceite_oliva","aceite","aceite_vegetal","ajo","cebolla",
          "perejil","cilantro","oregano","comino","laurel","papel_horno","papel_de_horno"}

def norm(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii","ignore").decode().lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return [w for w in t.split() if w and w not in STOP]

def jaccard(a, b):
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

def main():
    recipes = []
    for f in sorted(glob.glob(os.path.join(HERE, "recipes", "*.json"))):
        r = json.load(open(f, encoding="utf-8"))
        codes = {i["code"] for i in r.get("ingredients", []) if i.get("code") not in FILLER}
        recipes.append({
            "slug": r["slug"], "title": r["title"], "cat": r.get("category"),
            "book": (r.get("source") or {}).get("book"),
            "codes": codes, "words": set(norm(r["title"])),
            "min_age": r.get("min_age_months"),
        })

    print(f"Analizando {len(recipes)} recetas...\n")
    hits = []
    for a, b in combinations(recipes, 2):
        ji = jaccard(a["codes"], b["codes"])
        jt = jaccard(a["words"], b["words"])
        # sospechoso: ingredientes muy parecidos Y (título parecido O misma categoría)
        score = 0.65 * ji + 0.35 * jt
        if ji >= 0.72 or (ji >= 0.55 and jt >= 0.5) or jt >= 0.8:
            hits.append((score, ji, jt, a, b))

    hits.sort(key=lambda x: -x[0])
    cross = [h for h in hits if h[3]["book"] != h[4]["book"]]
    same = [h for h in hits if h[3]["book"] == h[4]["book"]]

    print(f"=== SOSPECHOSOS ENTRE LIBROS DISTINTOS: {len(cross)} ===")
    for s, ji, jt, a, b in cross:
        print(f"[{s:.2f} ing={ji:.2f} tit={jt:.2f}] {a['book']}/{a['slug']} ({a['cat']})")
        print(f"                                  {b['book']}/{b['slug']} ({b['cat']})")
        print(f"    comunes: {sorted(a['codes'] & b['codes'])}")
        print(f"    solo A : {sorted(a['codes'] - b['codes'])}  |  solo B: {sorted(b['codes'] - a['codes'])}")
        print()

    print(f"=== SOSPECHOSOS DENTRO DEL MISMO LIBRO: {len(same)} ===")
    for s, ji, jt, a, b in same[:25]:
        print(f"[{s:.2f} ing={ji:.2f} tit={jt:.2f}] {a['book']}: {a['slug']}  <->  {b['slug']}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
