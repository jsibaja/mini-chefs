import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ageLabel, monthsBetween } from "@/lib/active-child";
import { FoodAvoidPicker, type AvoidedFood } from "@/components/food-avoid-picker";
import { toast, Toaster } from "sonner";

/**
 * Onboarding en 3 pasos:
 * 1) Aceptación legal
 * 2) Perfil del primer hijo
 * 3) Perfil del hogar
 *
 * ssr:false porque necesita la sesión desde localStorage.
 */
export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bienvenida · MiniChefs" },
      { name: "description", content: "Cuéntanos sobre tu hijo y tu hogar para personalizar todo." },
    ],
  }),
  component: OnboardingPage,
});

type Step = 1 | 2 | 3;
type Allergen = { id: string; code: string; name: string };

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // paso 2
  const [childName, setChildName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [premature, setPremature] = useState(false);
  const [gestWeeks, setGestWeeks] = useState<number | "">("");
  const [nutFreeSchool, setNutFreeSchool] = useState(false);
  const [thermalLunchbox, setThermalLunchbox] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(new Set());
  const [ingredientsList, setIngredientsList] = useState<AvoidedFood[]>([]);
  const [avoidFoods, setAvoidFoods] = useState<AvoidedFood[]>([]);

  // paso 3
  const [householdSize, setHouseholdSize] = useState(2);
  const [cookingMode, setCookingMode] = useState<"daily" | "batch">("daily");
  const [budgetMode, setBudgetMode] = useState<"normal" | "economic">("normal");
  const [oven, setOven] = useState(true);
  const [blender, setBlender] = useState(true);
  const [airFryer, setAirFryer] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);

      const { data: allergensData } = await supabase
        .from("allergens")
        .select("id, code, name")
        .order("sort_order");
      if (allergensData) setAllergens(allergensData);

      const { data: ingredientsData } = await supabase
        .from("ingredients")
        .select("id, name")
        .order("name");
      if (ingredientsData) setIngredientsList(ingredientsData);
    })();
  }, [navigate]);

  const toggleAllergen = (id: string) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const acceptLegal = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ legal_accepted_at: new Date().toISOString() })
      .eq("id", userId);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(2);
  };

  const saveChild = async () => {
    if (!userId) return;
    if (!childName.trim() || !birthDate) {
      toast.error("Necesitamos el nombre y la fecha de nacimiento.");
      return;
    }
    setLoading(true);
    const { data: child, error } = await supabase
      .from("children")
      .insert({
        user_id: userId,
        name: childName.trim(),
        birth_date: birthDate,
        gestational_weeks: premature && gestWeeks !== "" ? Number(gestWeeks) : null,
        school_nut_free: nutFreeSchool,
        has_thermal_lunchbox: thermalLunchbox,
      })
      .select()
      .single();

    if (error || !child) {
      setLoading(false);
      toast.error(error?.message ?? "No pudimos guardar los datos de tu hijo.");
      return;
    }

    if (selectedAllergens.size > 0) {
      const rows = Array.from(selectedAllergens).map((allergen_id) => ({
        child_id: child.id,
        allergen_id,
      }));
      const { error: allergenError } = await supabase.from("child_allergens").insert(rows);
      if (avoidFoods.length > 0) {
        await supabase.from("child_food_preferences").insert(
          avoidFoods.map((f) => ({ child_id: child.id, ingredient_id: f.id, preference: "no_come" })),
        );
      }
      if (allergenError) {
        // Las alergias son datos de SEGURIDAD: avisar fuerte (el perfil ya se creó,
        // así que seguimos para no duplicarlo, pero pedimos verificarlas).
        toast.error(
          "No pudimos guardar las alergias. Verifícalas en Ajustes → Mis hijos antes de usar el recetario.",
          { duration: 10000 },
        );
      }
    }

    setLoading(false);
    setStep(3);
  };

  const saveHousehold = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        household_size: householdSize,
        cooking_mode: cookingMode,
        budget_mode: budgetMode,
        equipment: { oven, blender, air_fryer: airFryer },
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("¡Todo listo! Te muestro cómo funciona.");
    navigate({ to: "/tutorial" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-lg px-5 py-8">
        {/* Progreso */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${step >= (n as Step) ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <img
              src="/images/ui/mascota-zana-bienvenida.webp"
              alt=""
              className="mb-4 h-28 w-28 object-contain"
            />
            <h1 className="font-display text-3xl font-bold text-deep-green">
              Antes de empezar…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Lee este aviso importante. Es breve y es clave.
            </p>

            <div className="mt-6 rounded-3xl border-2 border-safety/40 bg-safety-soft p-5">
              <p className="font-display font-semibold text-safety">
                Aviso de seguridad alimentaria
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                MiniChefs no reemplaza la consulta con tu pediatra o nutricionista. La
                introducción de alimentos, texturas y alérgenos debe hacerse siempre bajo su
                orientación, especialmente si tu hijo tiene antecedentes de alergias,
                enfermedades o nació antes de las 37 semanas.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                Verifica siempre etiquetas y contaminación cruzada. Ante cualquier reacción,
                consulta a un profesional de la salud de inmediato.
              </p>
            </div>

            <button
              type="button"
              onClick={acceptLegal}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Entiendo y acepto
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-3xl font-bold text-deep-green">
              Cuéntanos de tu hijo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Con esto adaptamos el recetario a su edad y alergias.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold">Nombre</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
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
                    🎂 {childName.trim() || "Tu peque"} tiene{" "}
                    {ageLabel(
                      monthsBetween(birthDate, premature && gestWeeks !== "" ? Number(gestWeeks) : null),
                    )}
                    {premature && gestWeeks !== "" ? " (edad corregida)" : ""}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
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
                <p className="text-sm font-semibold">Alergias conocidas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Marca las que aplican. Podrás cambiarlas después.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allergens.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => toggleAllergen(a.id)}
                      className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        selectedAllergens.has(a.id)
                          ? "border-safety bg-safety text-safety-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <FoodAvoidPicker
                ingredients={ingredientsList}
                selected={avoidFoods}
                onChange={setAvoidFoods}
              />

              {/* Preguntas de colegio solo cuando aplican (2+ años): a la mamá
                  de un bebé no se le pregunta por loncheras escolares. */}
              {birthDate && monthsBetween(birthDate, premature && gestWeeks !== "" ? Number(gestWeeks) : null) >= 24 && (
                <>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <input
                      type="checkbox"
                      checked={nutFreeSchool}
                      onChange={(e) => setNutFreeSchool(e.target.checked)}
                      className="h-5 w-5 accent-primary"
                    />
                    <span className="text-sm">
                      En su colegio está prohibido el maní
                      <span className="block text-xs text-muted-foreground">
                        Muchos colegios lo prohíben por alumnos alérgicos. Si lo marcas, sus
                        loncheras nunca llevarán maní.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <input
                      type="checkbox"
                      checked={thermalLunchbox}
                      onChange={(e) => setThermalLunchbox(e.target.checked)}
                      className="h-5 w-5 accent-primary"
                    />
                    <span className="text-sm">Tiene lonchera térmica</span>
                  </label>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={saveChild}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-display text-3xl font-bold text-deep-green">Tu hogar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Últimos detalles para adaptar las recetas.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold">¿Cuántos comen en casa?</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <p className="text-sm font-semibold">Modo de cocina</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["daily", "batch"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setCookingMode(m)}
                      className={`rounded-2xl border-2 p-3 text-sm font-semibold transition-colors ${
                        cookingMode === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {m === "daily" ? "Diario" : "Una vez por semana"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Presupuesto</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["normal", "economic"] as const).map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBudgetMode(b)}
                      className={`rounded-2xl border-2 p-3 text-sm font-semibold transition-colors ${
                        budgetMode === b
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {b === "normal" ? "Normal" : "Económico"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Equipamiento</p>
                <div className="mt-2 space-y-2">
                  {[
                    { label: "Horno", value: oven, set: setOven },
                    { label: "Licuadora", value: blender, set: setBlender },
                    { label: "Freidora de aire", value: airFryer, set: setAirFryer },
                  ].map((eq) => (
                    <label
                      key={eq.label}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <input
                        type="checkbox"
                        checked={eq.value}
                        onChange={(e) => eq.set(e.target.checked)}
                        className="h-5 w-5 accent-primary"
                      />
                      <span className="text-sm">{eq.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={saveHousehold}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Terminar y empezar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
