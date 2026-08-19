import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, Snowflake, Utensils } from "lucide-react";
import { categoryLabel, fetchRecipes, recipeImage, recipePhoto } from "@/lib/recipes";
import { ageLabel, useActiveChild } from "@/lib/active-child";
import { useFavorites } from "@/lib/favorites";
import { FavoriteButton } from "@/components/favorite-button";

export const Route = createFileRoute("/_authenticated/recetas/")({
  head: () => ({
    meta: [
      { title: "Recetas · MiniChefs" },
      { name: "description", content: "Recetario filtrado por edad y alergias del hijo activo." },
    ],
  }),
  component: RecetasIndex,
});

const CATS = ["todas", "favoritas", "papilla", "desayuno", "almuerzo", "cena", "colacion", "lonchera", "postre"] as const;

const PAGE_SIZE = 24;

/** Números de página a mostrar: 1 … alrededor de la actual … última. */
function pageList(total: number, current: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

function RecetasIndex() {
  const { active, children, setActive } = useActiveChild();
  const [cat, setCat] = useState<(typeof CATS)[number]>("todas");
  const [q, setQ] = useState("");
  // Paginación numerada: 24 tarjetas por página (menos fotos y DOM de golpe).
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [cat, q, active?.id]);

  const goToPage = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sin hijo activo mostramos el catálogo completo (sin filtrar por edad ni
  // alergias); con hijo activo, el filtro de seguridad se aplica automáticamente.
  const { data, isLoading } = useQuery({
    queryKey: [
      "recipes",
      active?.id,
      active?.ageMonths,
      active?.allergen_codes,
      active?.avoid_ingredient_ids,
    ],
    queryFn: () =>
      fetchRecipes({
        ageMonths: active?.ageMonths,
        allergenCodes: active?.allergen_codes ?? [],
        avoidIngredientIds: active?.avoid_ingredient_ids ?? [],
      }),
  });

  const { data: favs } = useFavorites();
  const favIds = useMemo(
    () => new Set((favs ?? []).map((f) => f.recipe_id)),
    [favs],
  );

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (cat === "favoritas") rows = rows.filter((r) => favIds.has(r.id));
    else if (cat !== "todas") rows = rows.filter((r) => r.category === cat);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(needle));
    }
    return rows;
  }, [data, cat, q, favIds]);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 lg:pt-10">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recetario</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">
          {active ? `Recetas seguras para ${active.name}` : "Todo el recetario"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active
            ? "Filtradas por edad y alergias. Todo lo prohibido no aparece."
            : "Estás viendo el catálogo completo. Agrega un hijo para filtrarlo por su edad y alergias."}
        </p>
      </header>

      {children.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active?.id === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.name} · {ageLabel(c.ageMonths)}
            </button>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar receta…"
        className="w-full rounded-full border border-input bg-background px-5 py-3 text-sm shadow-soft focus:border-primary focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              cat === c
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground hover:bg-accent"
            }`}
          >
            {c === "todas" ? "Todas" : c === "favoritas" ? "Favoritas ♥" : categoryLabel(c)}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando recetario…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-10 rounded-3xl bg-card p-8 text-center shadow-soft">
          <img
            src={
              cat === "favoritas"
                ? "/images/ui/vacio-favoritos.webp"
                : q.trim()
                  ? "/images/ui/vacio-busqueda.webp"
                  : "/images/ui/mascota-zana-pensando.webp"
            }
            alt=""
            className="mx-auto h-28 w-28 object-contain"
          />
          <p className="mt-3 font-display text-lg font-semibold">
            {cat === "favoritas"
              ? "Aún no tienes favoritas"
              : q.trim()
                ? "Sin resultados"
                : "Nada para mostrar"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cat === "favoritas"
              ? "Toca el corazón en una receta para guardarla aquí."
              : q.trim()
                ? "Prueba con otra palabra o quita algún filtro."
                : "Ajusta los filtros o cambia el hijo activo."}
          </p>
        </div>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
          <li key={r.id} className="relative">
            <FavoriteButton recipeId={r.id} size="sm" className="absolute right-3 top-3 z-10" />
            <Link
              to="/recetas/$slug"
              params={{ slug: r.slug }}
              className="group block overflow-hidden rounded-3xl bg-card shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="aspect-square w-full overflow-hidden bg-mint/40">
                <img
                  src={recipePhoto(r.image_filename, r.category)}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = recipeImage(r.category);
                  }}
                  alt={r.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3.5">
                <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-foreground">
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint/60 px-2 py-1 text-deep-green">
                    <Utensils className="h-3 w-3" /> desde {r.min_age_months}m
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-corn/50 px-2 py-1 text-deep-green">
                    <Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min
                  </span>
                  {r.is_freezable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-primary">
                      <Snowflake className="h-3 w-3" /> se congela
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length > PAGE_SIZE && (
        <nav aria-label="Páginas del recetario" className="mt-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
              className="grid h-10 w-10 place-items-center rounded-full bg-card font-semibold text-foreground shadow-soft hover:bg-accent disabled:opacity-40"
            >
              ‹
            </button>
            {pageList(Math.ceil(filtered.length / PAGE_SIZE), page).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-card text-foreground shadow-soft hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)}
              aria-label="Página siguiente"
              className="grid h-10 w-10 place-items-center rounded-full bg-card font-semibold text-foreground shadow-soft hover:bg-accent disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Página {page} de {Math.ceil(filtered.length / PAGE_SIZE)} · {filtered.length} recetas
          </p>
        </nav>
      )}
    </div>
  );
}
