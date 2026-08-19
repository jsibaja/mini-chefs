import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Sparkles, Trophy, Sandwich, Download, Shield, ArrowRight, Snowflake } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutorial")({
  head: () => ({
    meta: [
      { title: "Cómo funciona · MiniChefs" },
      { name: "description", content: "Aprende a usar MiniChefs en un minuto." },
    ],
  }),
  component: TutorialPage,
});

const STEPS = [
  {
    n: "1",
    title: "Elige a tu hijo",
    body: "Arriba eliges el perfil de tu hijo. Todo —recetas, ideas y loncheras— se ajusta solo a su edad y a sus alergias.",
    icon: Users,
  },
  {
    n: "2",
    title: "Pide una idea o arma tu plan",
    body: "¿Con prisa? En «Hoy» toca «Dame ideas» y tienes 3 opciones seguras al instante. ¿Con calma? Arma el «Plan» de la semana.",
    icon: Sparkles,
  },
  {
    n: "3",
    title: "Cocina y celebra",
    body: "Abre la receta con su paso a paso. A medida que tu peque prueba cosas nuevas, sube de nivel como Mini Chef.",
    icon: Trophy,
  },
];

const SECTIONS: { label: string; img: string; desc: string }[] = [
  {
    label: "Hoy",
    img: "modulo-decisor-sos",
    desc: "Tu pantalla del día. Elige la comida (desayuno, almuerzo, merienda o cena), toca «Dame ideas» y tienes 3 opciones seguras al instante. Se acabó el «¿y ahora qué le doy?».",
  },
  {
    label: "Plan",
    img: "modulo-planificador-semanal",
    desc: "Arma el menú de esta semana o de la próxima: «Generar mi semana» lo llena solo, y para cambiar algo eliges viendo fotos. Lo que planeas aparece en «Hoy» y llena tus «Compras».",
  },
  {
    label: "Recetas",
    img: "modulo-recetario",
    desc: "301 recetas ya filtradas por la edad y las alergias de tu hijo. Cada una con foto, pasos y su adaptación por etapa.",
  },
  {
    label: "Compras",
    img: "modulo-lista-compras",
    desc: "La lista del súper se arma sola con tu plan (de esta semana o la próxima), ordenada por secciones. Marca lo que ya tienes — no se borra — y envíala por WhatsApp.",
  },
  {
    label: "Progreso",
    img: "modulo-academia-minichef",
    desc: "Tu hijo sube de nivel como Mini Chef y gana insignias al probar alimentos nuevos. Comer se vuelve un juego, no una pelea.",
  },
];

const TOOLS = [
  {
    title: "Cambiar de hijo",
    icon: Users,
    body: "El selector de arriba. Cada hijo tiene su edad, sus alergias y su progreso; en «Administrar hijos» editas sus datos cuando quieras.",
  },
  {
    title: "Armar lonchera",
    icon: Sandwich,
    body: "El botón «Lonchera» arma una vianda balanceada para el colegio. Guárdala para mañana y repite en un toque las que funcionaron.",
  },
  {
    title: "Botón «¿Qué le doy?»",
    icon: Sparkles,
    body: "El botón flotante coral te da 3 ideas al instante cuando no sabes qué dar y lo necesitas ya.",
  },
  {
    title: "Instalar en el teléfono",
    icon: Download,
    body: "Instálala como app en tu pantalla principal, para abrirla sin buscador ni pestañas.",
  },
];

function TutorialPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-6 lg:pt-10">
      {/* Hero */}
      <header className="rounded-3xl bg-gradient-to-br from-mint via-corn/50 to-carrot/20 p-6 shadow-lift sm:p-8">
        <div className="flex items-center gap-4">
          <img
            src="/images/ui/mascota-zana-bienvenida.webp"
            alt=""
            className="h-20 w-20 flex-none object-contain sm:h-24 sm:w-24"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-deep-green/70">
              Guía rápida
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-deep-green sm:text-4xl">
              Cómo funciona MiniChefs
            </h1>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-deep-green/90">
          MiniChefs es tu <strong>copiloto de alimentación familiar</strong>: te dice qué cocinar,
          adaptado a la edad y las alergias de cada hijo, sin que tengas que pensarlo. En un minuto
          entiendes todo. 👇
        </p>
        <p className="mt-3 text-sm text-deep-green/80">
          Por cierto: la zanahoria que te acompaña en la app se llama <strong>Zana</strong>, y es la
          mascota de MiniChefs. 🥕
        </p>
      </header>

      {/* Empieza en 3 pasos */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-deep-green">Empieza en 3 pasos</h2>
        <div className="mt-4 grid gap-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className="flex items-start gap-4 rounded-3xl bg-card p-5 shadow-soft"
              >
                <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground">
                  {s.n}
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                    <Icon className="h-4 w-4 text-primary" /> {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Las 5 pestañas */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-deep-green">Las 5 pestañas del menú</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esto hace cada una. Están abajo (en el celular) o a la izquierda (en la computadora).
        </p>
        <div className="mt-4 grid gap-4">
          {SECTIONS.map((sec) => (
            <div
              key={sec.label}
              className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft"
            >
              <img
                src={`/images/ui/${sec.img}.webp`}
                alt=""
                className="h-20 w-20 flex-none rounded-2xl object-cover shadow-soft"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div>
                <h3 className="font-display text-lg font-bold text-deep-green">{sec.label}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Crece con tu hijo: cómo está organizado el recetario por edades */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-deep-green">
          El recetario crece con tu hijo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          301 recetas para niños de <strong className="text-foreground">6 meses a 9 años</strong>.
          Tú no tienes que filtrar nada: eliges a tu hijo y la app le muestra solo lo apto para su
          edad.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
            <img
              src="/images/ui/hero-modo-bebe.webp"
              alt=""
              className="h-20 w-28 flex-none rounded-2xl object-cover shadow-soft"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <p className="font-display text-base font-bold text-deep-green">6 a 24 meses</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Papillas y purés por etapa de textura, comidas blandas, sin sal ni azúcar añadida.
                Nada que no corresponda a un bebé.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
            <img
              src="/images/ui/modulo-conquista-jardin.webp"
              alt=""
              className="h-20 w-28 flex-none rounded-2xl object-cover shadow-soft"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <p className="font-display text-base font-bold text-deep-green">2 a 5 años</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Comida de la familia adaptada, loncheras para el jardín y meriendas. Con cortes
                seguros mientras aprende a masticar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
            <img
              src="/images/ui/hero-modo-escolar.webp"
              alt=""
              className="h-20 w-28 flex-none rounded-2xl object-cover shadow-soft"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <p className="font-display text-base font-bold text-deep-green">6 a 9 años</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                El recetario completo: desayunos, almuerzos, cenas, loncheras escolares, meriendas y
                postres sin azúcar refinada.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-2xl bg-mint/30 px-4 py-2.5 text-sm text-deep-green/90">
          Por eso, si tu hijo tiene 8 meses verás papillas, y si tiene 6 años ya no: la app cambia
          sola cuando él crece.
        </p>
      </section>

      {/* Trucos rápidos */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-deep-green">Trucos rápidos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="rounded-3xl bg-card p-5 shadow-soft">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint/50 text-deep-green">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Congelar sin riesgo */}
      <section className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <Snowflake className="h-5 w-5" /> Congelar es tu mejor aliado
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cocinar una vez y guardar porciones en el congelador te ahorra días de cocina. Es seguro:
          el frío detiene a las bacterias sin quitarle nutrientes a la comida. Así se hace:
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            {
              t: "Hoy, cuando cocinas",
              p: "Reparte la comida en recipientes de una porción, deja que se enfríen máximo 2 horas y mételos al congelador con una etiqueta con la fecha.",
            },
            {
              t: "El día que se la das",
              p: "La noche anterior pasa un recipiente al refrigerador. Al día siguiente calienta esa comida hasta que salga humo y sírvela tibia.",
            },
            {
              t: "Nunca",
              p: "No descongeles sobre la mesa, no vuelvas a congelar lo que ya descongelaste, y bota lo que quedó en el plato de tu hijo.",
              alerta: true,
            },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl bg-card p-4 shadow-soft">
              <p
                className={`font-display text-sm font-bold ${
                  b.alerta ? "text-destructive" : "text-deep-green"
                }`}
              >
                {b.t}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.p}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Verás estos pasos en cada receta que se pueda congelar (busca la etiqueta ❄ «se congela»).
        </p>
      </section>

      {/* Seguridad */}
      <section className="mt-10 flex items-start gap-4 rounded-3xl border-2 border-safety/30 bg-safety-soft p-5">
        <img
          src="/images/ui/modulo-escudo-seguridad.webp"
          alt=""
          className="hidden h-16 w-16 flex-none rounded-2xl object-cover sm:block"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-safety">
            <Shield className="h-5 w-5" /> La seguridad es automática
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            MiniChefs bloquea solo lo que no corresponde a la edad de tu hijo (miel, frutos secos
            enteros, azúcares) y marca los alérgenos. Aun así, no reemplaza a tu pediatra: introduce
            alimentos nuevos siempre con su orientación.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 text-center">
        <Link
          to="/hoy"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5"
        >
          ¡Listo, empecemos! <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          Puedes volver a esta guía cuando quieras desde Ajustes.
        </p>
      </div>
    </div>
  );
}
