import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Aviso legal · MiniChefs" },
      { name: "description", content: "Aviso importante sobre alimentación infantil y responsabilidad." },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link to="/" className="text-sm font-semibold text-primary hover:underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold text-deep-green">Aviso legal</h1>

      <section className="mt-6 space-y-4 text-foreground">
        <div className="rounded-2xl border-2 border-safety/40 bg-safety-soft p-4 text-sm">
          <p className="font-semibold text-safety">Aviso importante de seguridad alimentaria</p>
          <p className="mt-2 text-foreground">
            Esta aplicación no reemplaza la consulta con tu pediatra, nutricionista o profesional
            de la salud. La introducción de alimentos, alérgenos y texturas debe hacerse siempre
            bajo su orientación, especialmente si tu hijo tiene antecedentes de alergias,
            enfermedades o parto prematuro.
          </p>
        </div>

        <h2 className="font-display text-xl">Sobre alérgenos</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          MiniChefs marca alérgenos y aplica reglas de seguridad por edad, pero los ingredientes
          reales de cada preparación son tu responsabilidad. Verifica siempre etiquetas y
          contaminación cruzada. Ante cualquier reacción, consulta a un profesional de la salud de
          inmediato.
        </p>

        <h2 className="font-display text-xl">Uso responsable del contenido</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Las recetas, tiempos y porciones son orientativos. Cada niño es diferente. La app es un
          apoyo para organizarte, no un dictamen nutricional individual.
        </p>
      </section>
    </div>
  );
}
