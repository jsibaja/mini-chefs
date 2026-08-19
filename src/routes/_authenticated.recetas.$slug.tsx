import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, Clock, Users, Save, Snowflake } from "lucide-react";
import { categoryLabel, fetchRecipeBySlug, recipeImage, recipePhoto } from "@/lib/recipes";
import { ageLabel } from "@/lib/active-child";
import { FavoriteButton } from "@/components/favorite-button";
import { useRecipeNote, useSaveRecipeNote } from "@/lib/favorites";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recetas/$slug")({
  component: RecipePage,
});

function RecipePage() {
  const { slug } = Route.useParams();
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", slug],
    queryFn: () => fetchRecipeBySlug(slug),
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-5 pt-10 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (!recipe) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-10 text-center">
        <p className="font-display text-lg">Receta no encontrada</p>
        <Link to="/recetas" className="mt-4 inline-flex text-sm text-primary underline">
          Volver al recetario
        </Link>
      </div>
    );
  }

  const r = recipe as any;
  const steps = [...(r.recipe_steps ?? [])].sort((a, b) => a.step_number - b.step_number);
  const ingredients = r.recipe_ingredients ?? [];

  return (
    <article className="mx-auto max-w-3xl pb-16">
      <div className="relative">
        <img
          src={recipePhoto(r.image_filename, r.category)}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = recipeImage(r.category);
          }}
          alt={r.title}
          className="aspect-[16/10] w-full object-cover"
        />
        <Link
          to="/recetas"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft backdrop-blur"
        >
          <ArrowLeft className="h-3 w-3" /> Recetario
        </Link>
        <FavoriteButton recipeId={r.id} className="absolute right-4 top-4" />
      </div>

      <div className="px-5">
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-primary">
          {categoryLabel(r.category)}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">{r.title}</h1>
        {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}

        <div className="mt-5 flex flex-wrap gap-2 text-[12px] font-semibold">
          <span className="rounded-full bg-mint/60 px-3 py-1 text-deep-green">
            {r.max_age_months
              ? `de ${ageLabel(r.min_age_months)} a ${ageLabel(r.max_age_months)}`
              : `desde ${ageLabel(r.min_age_months)}`}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-corn/50 px-3 py-1 text-deep-green">
            <Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-foreground">
            <Users className="h-3 w-3" /> {r.servings} porciones
          </span>
          {r.is_freezable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-primary">
              <Snowflake className="h-3 w-3" />
              {r.freezer_months
                ? `se congela hasta ${r.freezer_months} ${r.freezer_months === 1 ? "mes" : "meses"}`
                : "se congela"}
            </span>
          )}
        </div>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-foreground">Ingredientes</h2>
          <ul className="mt-3 space-y-2">
            {ingredients.map((ri: any) => (
              <li key={ri.id} className="flex items-baseline justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
                <span className="min-w-0 text-sm text-foreground">{ri.ingredients?.name ?? "—"}</span>
                <span className="flex-none text-xs text-muted-foreground">
                  {ri.amount ? `${ri.amount} ${ri.unit ?? ""}` : ri.note ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-foreground">Preparación</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s: any) => (
              <li
                key={s.step_number}
                className={`rounded-2xl p-4 shadow-soft ${
                  s.is_safety_critical
                    ? "border-2 border-destructive/60 bg-destructive/5"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {s.step_number}
                  </span>
                  <div className="flex-1">
                    {s.is_safety_critical && (
                      <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Seguridad alimentaria
                      </p>
                    )}
                    <p className="text-sm text-foreground">{s.instruction}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {r.tips && (
          <section className="mt-8 rounded-3xl bg-mint/40 p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-deep-green">
              <img
                src="/images/ui/mascota-zana-pensando.webp"
                alt=""
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              Consejos para esta receta
            </h3>
            {/* Un consejo por línea: los tips vienen separados por " · ". */}
            <ul className="mt-2 space-y-1.5">
              {String(r.tips)
                .split("·")
                .map((t: string) => t.trim())
                .filter(Boolean)
                .map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-deep-green/90">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
            </ul>
          </section>
        )}

        {r.is_freezable && <FreezerGuide months={r.freezer_months} />}

        {r.family_mode_note && (
          <section className="mt-4 rounded-3xl bg-corn/30 p-5">
            <h3 className="font-display text-sm font-semibold text-deep-green">
              Para toda la familia
            </h3>
            <p className="mt-1 text-sm text-deep-green/90">{r.family_mode_note}</p>
          </section>
        )}

        <MyNote recipeId={r.id} />
      </div>
    </article>
  );
}

/**
 * Guía de congelado en 3 momentos concretos (hoy / el día que se sirve / nunca).
 * Cada frase nombra el objeto — nada de "úsala" o "lo ya descongelado".
 */
function FreezerGuide({ months }: { months: number | null }) {
  const plazo = months ? `${months} ${months === 1 ? "mes" : "meses"}` : "3 meses";

  const BLOQUES = [
    {
      titulo: "Hoy, cuando cocinas",
      pasos: [
        "Reparte la comida en varios recipientes, una porción en cada uno.",
        "Deja los recipientes enfriar sobre la mesa como máximo 2 horas y mételos al congelador.",
        `Pega una etiqueta con la fecha de hoy. Esa comida te sirve hasta ${plazo} después.`,
      ],
    },
    {
      titulo: "El día que se la vas a dar",
      pasos: [
        "La noche anterior, pasa un recipiente del congelador al refrigerador.",
        "Al día siguiente, calienta esa comida hasta que salga humo y revuélvela bien.",
        "Prueba con tu labio que esté tibia (no caliente) antes de servírsela.",
      ],
    },
    {
      titulo: "Nunca hagas esto",
      alerta: true,
      pasos: [
        "No dejes la comida descongelándose sobre la mesa: descongélala siempre en el refrigerador.",
        "No vuelvas a congelar una comida que ya descongelaste.",
        "No guardes lo que quedó en el plato de tu hijo: eso se bota.",
      ],
    },
  ];

  return (
    <section className="mt-4 rounded-3xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-primary">
        <Snowflake className="h-4 w-4" /> Cómo congelar esta receta
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Cocina una vez y ten comida lista para otros días. Congelar es seguro: el frío detiene a las
        bacterias sin quitarle nutrientes a la comida.
      </p>

      <div className="mt-4 space-y-4">
        {BLOQUES.map((b) => (
          <div key={b.titulo}>
            <p
              className={`font-display text-sm font-bold ${
                b.alerta ? "text-destructive" : "text-deep-green"
              }`}
            >
              {b.titulo}
            </p>
            <ol className="mt-1.5 space-y-1.5">
              {b.pasos.map((p, i) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                  <span
                    className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold ${
                      b.alerta
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {b.alerta ? "✕" : i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function MyNote({ recipeId }: { recipeId: string }) {
  const { data: note, isLoading } = useRecipeNote(recipeId);
  const save = useSaveRecipeNote();
  const [text, setText] = useState("");

  useEffect(() => {
    if (note?.note != null) setText(note.note);
  }, [note?.id]);

  const dirty = (note?.note ?? "") !== text;

  return (
    <section className="mt-8 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Mi nota</h3>
        {note?.updated_at && !dirty && (
          <span className="text-[11px] text-muted-foreground">Guardada</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Anota trucos, sustituciones o cómo le fue a tu peque. Solo tú la ves.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isLoading ? "Cargando…" : "Ej: le encantó con un poquito de canela."}
        rows={4}
        className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm shadow-soft focus:border-primary focus:outline-none"
      />
      <button
        type="button"
        disabled={!dirty || save.isPending}
        onClick={() => {
          save.mutate(
            { recipeId, note: text },
            { onSuccess: () => toast.success("Nota guardada") },
          );
        }}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        <Save className="h-4 w-4" /> {save.isPending ? "Guardando…" : "Guardar nota"}
      </button>
    </section>
  );
}
