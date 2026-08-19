import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Baby, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ageLabel, monthsBetween } from "@/lib/active-child";
import { FoodAvoidPicker, type AvoidedFood } from "@/components/food-avoid-picker";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hijos")({
  head: () => ({
    meta: [
      { title: "Mis hijos · MiniChefs" },
      { name: "description", content: "Edita el nombre, la edad y las alergias de cada hijo." },
    ],
  }),
  component: HijosPage,
});

type Allergen = { id: string; code: string; name: string };
type ChildFull = {
  id: string;
  name: string;
  birth_date: string;
  gestational_weeks: number | null;
  school_nut_free: boolean;
  has_thermal_lunchbox: boolean;
  child_allergens: { allergen_id: string }[];
  child_food_preferences: { ingredient_id: string; preference: string }[];
};

function HijosPage() {
  const childrenQ = useQuery({
    queryKey: ["children-full"],
    queryFn: async (): Promise<ChildFull[]> => {
      const { data, error } = await supabase
        .from("children")
        .select(
          "id, name, birth_date, gestational_weeks, school_nut_free, has_thermal_lunchbox, child_allergens(allergen_id), child_food_preferences(ingredient_id, preference)",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const allergensQ = useQuery({
    queryKey: ["allergens-catalog"],
    queryFn: async (): Promise<Allergen[]> => {
      const { data, error } = await supabase
        .from("allergens")
        .select("id, code, name")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ingredientsQ = useQuery({
    queryKey: ["ingredients-catalog"],
    queryFn: async (): Promise<AvoidedFood[]> => {
      const { data, error } = await supabase.from("ingredients").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const children = childrenQ.data ?? [];
  const allergens = allergensQ.data ?? [];
  const ingredients = ingredientsQ.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-5 pb-12 pt-6 lg:pt-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Perfiles</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">Mis hijos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edita el nombre, la fecha de nacimiento y las alergias de cada hijo. Todo el recetario se
          reajusta al instante.
        </p>
      </header>

      {childrenQ.isLoading && <p className="mt-6 text-muted-foreground">Cargando…</p>}

      <div className="mt-6 space-y-4">
        {children.map((c) => (
          <ChildEditor key={c.id} child={c} allergens={allergens} ingredients={ingredients} />
        ))}
      </div>

      <Link
        to="/onboarding"
        className="mt-5 flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-primary/40 bg-card px-5 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        <Plus className="h-4 w-4" /> Agregar otro hijo
      </Link>
    </div>
  );
}

function ChildEditor({
  child,
  allergens,
  ingredients,
}: {
  child: ChildFull;
  allergens: Allergen[];
  ingredients: AvoidedFood[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const prefsToFoods = () => {
    const byId = new Map(ingredients.map((i) => [i.id, i.name] as const));
    return (child.child_food_preferences ?? [])
      .filter((p) => p.preference === "no_come")
      .map((p) => ({ id: p.ingredient_id, name: byId.get(p.ingredient_id) ?? "Alimento" }));
  };
  const [confirmDel, setConfirmDel] = useState(false);

  const [name, setName] = useState(child.name);
  const [birthDate, setBirthDate] = useState(child.birth_date);
  const [premature, setPremature] = useState(!!child.gestational_weeks);
  const [gestWeeks, setGestWeeks] = useState<number | "">(child.gestational_weeks ?? "");
  const [nutFree, setNutFree] = useState(child.school_nut_free);
  const [thermal, setThermal] = useState(child.has_thermal_lunchbox);
  const [sel, setSel] = useState<Set<string>>(
    new Set(child.child_allergens.map((a) => a.allergen_id)),
  );
  const [avoidFoods, setAvoidFoods] = useState<AvoidedFood[]>(prefsToFoods);

  const ageMonths = monthsBetween(child.birth_date, child.gestational_weeks);
  const currentAllergens = allergens.filter((a) => sel.has(a.id));

  const reset = () => {
    setName(child.name);
    setBirthDate(child.birth_date);
    setPremature(!!child.gestational_weeks);
    setGestWeeks(child.gestational_weeks ?? "");
    setNutFree(child.school_nut_free);
    setThermal(child.has_thermal_lunchbox);
    setSel(new Set(child.child_allergens.map((a) => a.allergen_id)));
    setAvoidFoods(prefsToFoods());
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !birthDate) throw new Error("Necesitamos el nombre y la fecha de nacimiento.");
      const { error: e1 } = await supabase
        .from("children")
        .update({
          name: name.trim(),
          birth_date: birthDate,
          gestational_weeks: premature && gestWeeks !== "" ? Number(gestWeeks) : null,
          school_nut_free: nutFree,
          has_thermal_lunchbox: thermal,
        })
        .eq("id", child.id);
      if (e1) throw e1;
      // Reemplaza el set de alergias.
      await supabase.from("child_allergens").delete().eq("child_id", child.id);
      const ids = Array.from(sel);
      if (ids.length) {
        const { error: e2 } = await supabase
          .from("child_allergens")
          .insert(ids.map((allergen_id) => ({ child_id: child.id, allergen_id })));
        if (e2) throw e2;
      }
      // Reemplaza los alimentos evitados.
      await supabase.from("child_food_preferences").delete().eq("child_id", child.id);
      if (avoidFoods.length) {
        const { error: e3 } = await supabase.from("child_food_preferences").insert(
          avoidFoods.map((f) => ({ child_id: child.id, ingredient_id: f.id, preference: "no_come" })),
        );
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      toast.success("Datos actualizados");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["children-full"] });
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes-hoy"] });
      qc.invalidateQueries({ queryKey: ["plan-recipes"] });
      qc.invalidateQueries({ queryKey: ["lonchera-recipes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("children").delete().eq("id", child.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hijo eliminado");
      qc.invalidateQueries({ queryKey: ["children-full"] });
      qc.invalidateQueries({ queryKey: ["children"] });
    },
    onError: () =>
      toast.error("No se pudo eliminar. Puede tener planes o datos asociados."),
  });

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      {/* Cabecera del hijo */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-mint/60 text-deep-green">
          <Baby className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-deep-green">{child.name}</p>
          <p className="text-xs text-muted-foreground">{ageLabel(ageMonths)}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        )}
      </div>

      {/* Resumen (modo lectura) */}
      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentAllergens.length === 0 ? (
            <span className="rounded-full bg-mint/40 px-3 py-1 text-xs text-deep-green">
              Sin alergias registradas
            </span>
          ) : (
            currentAllergens.map((a) => (
              <span
                key={a.id}
                className="rounded-full bg-safety-soft px-3 py-1 text-xs font-semibold text-safety"
              >
                {a.name}
              </span>
            ))
          )}
          {avoidFoods.map((f) => (
            <span
              key={f.id}
              className="rounded-full bg-corn/40 px-3 py-1 text-xs font-semibold text-deep-green"
            >
              evita {f.name.toLowerCase()}
            </span>
          ))}
          {child.school_nut_free && (
            <span className="rounded-full bg-corn/50 px-3 py-1 text-xs text-deep-green">
              Colegio sin maní
            </span>
          )}
          {child.has_thermal_lunchbox && (
            <span className="rounded-full bg-corn/50 px-3 py-1 text-xs text-deep-green">
              Lonchera térmica
            </span>
          )}
        </div>
      )}

      {/* Formulario de edición */}
      {editing && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div>
            <label className="text-sm font-semibold">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {birthDate && (
              <p className="mt-2 inline-flex rounded-full bg-mint/50 px-3 py-1.5 text-sm font-semibold text-deep-green">
                🎂 {name.trim() || "Tu peque"} tiene{" "}
                {ageLabel(
                  monthsBetween(birthDate, premature && gestWeeks !== "" ? Number(gestWeeks) : null),
                )}
                {premature && gestWeeks !== "" ? " (edad corregida)" : ""}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
            <input
              type="checkbox"
              checked={premature}
              onChange={(e) => setPremature(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            <span className="text-sm">Nació antes de las 37 semanas</span>
          </label>
          {premature && (
            <div>
              <label className="text-sm font-semibold">Semanas de gestación</label>
              <input
                type="number"
                min={22}
                max={36}
                value={gestWeeks}
                onChange={(e) => setGestWeeks(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          <div>
            <p className="text-sm font-semibold">Alergias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allergens.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                    sel.has(a.id)
                      ? "border-safety bg-safety text-safety-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <FoodAvoidPicker ingredients={ingredients} selected={avoidFoods} onChange={setAvoidFoods} />

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
            <input
              type="checkbox"
              checked={nutFree}
              onChange={(e) => setNutFree(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            <span className="text-sm">
              En su colegio está prohibido el maní
              <span className="block text-xs text-muted-foreground">
                Si lo marcas, sus loncheras nunca llevarán maní.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
            <input
              type="checkbox"
              checked={thermal}
              onChange={(e) => setThermal(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            <span className="text-sm">Tiene lonchera térmica</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> {save.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              onClick={() => {
                reset();
                setEditing(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>

          {/* Eliminar */}
          <div className="border-t border-border pt-4">
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar este hijo
              </button>
            ) : (
              <div className="rounded-2xl bg-destructive/5 p-3">
                <p className="text-sm font-semibold text-destructive">
                  ¿Eliminar a {child.name}? Se borra su perfil y sus planes.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => del.mutate()}
                    disabled={del.isPending}
                    className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                  >
                    {del.isPending ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="rounded-full border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
