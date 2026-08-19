import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";

export type AvoidedFood = { id: string; name: string };

/**
 * Buscador de alimentos a evitar (además de los alérgenos del catálogo).
 * La mamá escribe, elige de la lista real de ingredientes y queda como chip.
 * Al estar atado a ingredientes reales, el recetario puede excluirlos de verdad.
 */
export function FoodAvoidPicker({
  ingredients,
  selected,
  onChange,
}: {
  ingredients: AvoidedFood[];
  selected: AvoidedFood[];
  onChange: (next: AvoidedFood[]) => void;
}) {
  const [q, setQ] = useState("");

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return ingredients
      .filter((i) => i.name.toLowerCase().includes(needle) && !selectedIds.has(i.id))
      .slice(0, 8);
  }, [q, ingredients, selectedIds]);

  return (
    <div>
      <p className="text-sm font-semibold">¿Evita algún otro alimento?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Escribe el alimento (ej: durazno, cerdo, tomate) y elígelo. Las recetas que lo contengan no
        le aparecerán.
      </p>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-safety-soft px-3 py-1.5 text-sm font-semibold text-safety"
            >
              {s.name}
              <button
                type="button"
                aria-label={`Quitar ${s.name}`}
                onClick={() => onChange(selected.filter((x) => x.id !== s.id))}
                className="grid h-4 w-4 place-items-center rounded-full hover:bg-safety/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alimento…"
          className="w-full rounded-2xl border border-input bg-background py-3 pl-10 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange([...selected, m]);
                setQ("");
              }}
              className="rounded-full border-2 border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-safety hover:bg-safety-soft hover:text-safety"
            >
              + {m.name}
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && matches.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          No encontramos ese alimento en nuestras recetas — no hace falta excluirlo.
        </p>
      )}
    </div>
  );
}
