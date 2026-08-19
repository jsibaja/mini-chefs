import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveChild } from "@/lib/active-child";
import { addDays, ensureMealPlan, fetchShoppingList, weekStartMonday } from "@/lib/meal-plan";
import { Share2, Check } from "lucide-react";

/** Nombres amigables de las secciones del súper (la BD usa códigos). */
const SECCION_LABEL: Record<string, string> = {
  proteina: "Carnes, huevo y proteínas",
  lacteo: "Lácteos",
  verdura: "Verduras",
  fruta: "Frutas",
  cereal: "Cereales, panes y granos",
  tuberculo: "Papas y tubérculos",
  legumbre: "Legumbres",
  condimento: "Condimentos y especias",
  bebida: "Bebidas",
  otros: "Otros",
};
function seccionLabel(cat: string): string {
  return SECCION_LABEL[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Lista de compras · MiniChefs" },
      { name: "description", content: "Ingredientes consolidados de tu plan semanal." },
    ],
  }),
  component: ComprasPage,
});

function dm(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function ComprasPage() {
  const { active } = useActiveChild();
  // 0 = esta semana, 1 = la próxima (para hacer la compra por adelantado).
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(weekStartMonday(), weekOffset * 7), [weekOffset]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Los marcados sobreviven a recargas y a cerrar la app (clave por semana e hijo):
  // en el súper no se puede perder lo que ya echaste al carrito.
  const storageKey = `mc_compras_${weekStart}_${active?.id ?? "sin-hijo"}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setChecked(new Set());
    }
  }, [storageKey]);

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(n)));
      } catch {
        /* almacenamiento lleno o bloqueado: seguimos en memoria */
      }
      return n;
    });
  };

  const listQ = useQuery({
    enabled: !!active,
    queryKey: ["shopping-list", active?.id, weekStart],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || !active) return [];
      const planId = await ensureMealPlan(userRes.user.id, active.id, weekStart);
      return fetchShoppingList(planId);
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof listQ.data>();
    for (const it of listQ.data ?? []) {
      const arr = map.get(it.category) ?? [];
      (arr as any).push(it);
      map.set(it.category, arr as any);
    }
    return Array.from(map.entries());
  }, [listQ.data]);

  const total = listQ.data?.length ?? 0;
  const doneCount = checked.size;

  const share = () => {
    if (!listQ.data?.length) return;
    const lines = ["🛒 Lista MiniChefs"];
    for (const [cat, items] of grouped) {
      lines.push(`\n*${cat.toUpperCase()}*`);
      for (const it of items ?? []) {
        lines.push(`• ${it.name}${it.amount ? ` — ${it.amount}${it.unit ?? ""}` : ""}`);
      }
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (!active) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-10">
        <h1 className="font-display text-2xl font-bold text-deep-green">Lista de compras</h1>
        <p className="mt-2 text-muted-foreground">
          Agrega a tu hijo, arma su plan y la lista del súper se hace sola.
        </p>
        <Link
          to="/onboarding"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          Agregar hijo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Compras</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">Lista de compras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana del {dm(weekStart)} al {dm(addDays(weekStart, 6))}
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={share}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5"
          >
            <Share2 className="h-4 w-4" /> WhatsApp
          </button>
        )}
      </header>

      <p className="mt-3 rounded-2xl bg-mint/30 px-4 py-2.5 text-sm text-deep-green/90">
        Se arma sola con las recetas de tu <strong>Plan</strong>. Marca lo que ya tienes en casa y
        envía el resto por WhatsApp.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-card p-1 shadow-soft">
        {([
          [0, "Esta semana"],
          [1, "Próxima semana"],
        ] as const).map(([off, label]) => (
          <button
            key={off}
            onClick={() => setWeekOffset(off)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              weekOffset === off
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {listQ.isLoading && <p className="mt-6 text-muted-foreground">Cargando…</p>}

      {!listQ.isLoading && total === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-primary/40 bg-card p-8 text-center shadow-soft">
          <img
            src="/images/ui/vacio-despensa.webp"
            alt=""
            className="mx-auto h-28 w-28 object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Tu plan semanal aún está vacío. Ve a <b>Plan</b> y pulsa <b>Generar mi semana</b>.
          </p>
        </div>
      )}

      {total > 0 && (
        <>
          {/* Progreso */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{doneCount} de {total} listos</span>
              <span>{Math.round((doneCount / total) * 100)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(doneCount / total) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {grouped.map(([cat, items]) => (
              <section key={cat} className="rounded-3xl bg-card p-5 shadow-soft">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-deep-green">
                  {seccionLabel(cat)}
                </h2>
                <ul className="mt-2 divide-y divide-border/60">
                  {(items ?? []).map((it: any) => {
                    const key = `${it.name}|${it.unit ?? ""}`;
                    const on = checked.has(key);
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-3 py-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleChecked(key);
                            }}
                            aria-label={on ? "Desmarcar" : "Marcar"}
                            className={`grid h-6 w-6 flex-none place-items-center rounded-full border-2 transition-colors ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background"
                            }`}
                          >
                            {on && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <span className={`text-sm ${on ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {it.name}
                            {it.amount ? (
                              <span className="ml-1 text-muted-foreground">
                                — {it.amount}
                                {it.unit ?? ""}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
