import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MiniChefs — Tu copiloto de alimentación familiar" },
      {
        name: "description",
        content:
          "Planifica la semana, arma loncheras balanceadas y decide qué darle en dos toques. 301 recetas corregidas y seguras por edad para tus hijos de 6 meses a 9 años.",
      },
      { property: "og:title", content: "MiniChefs — Tu copiloto de alimentación familiar" },
      {
        property: "og:description",
        content:
          "Planificador semanal, armador de loncheras y decisor rápido. Recetas filtradas por edad y alergias, con seguridad alimentaria automática.",
      },
    ],
  }),
  component: Landing,
});

const PAINS = [
  {
    emoji: "😩",
    title: "“¿Qué le doy hoy?”",
    desc: "Son las 6 de la tarde, no compraste nada y tu mente está en blanco otra vez.",
  },
  {
    emoji: "😟",
    title: "La culpa de siempre",
    desc: "¿Será muy poca verdura? ¿Demasiada azúcar? ¿Ya podía comer esto a su edad?",
  },
  {
    emoji: "🥪",
    title: "La lonchera de mañana",
    desc: "Las mismas tres cosas de siempre, y aun así vuelve intacta a casa.",
  },
  {
    emoji: "👶🧒",
    title: "Dos edades, una cocina",
    desc: "El bebé come puré y el mayor lonchera. Terminas cocinando dos veces.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Agrega a tu hijo",
    desc: "Su fecha de nacimiento y alergias. MiniChefs calcula su etapa y esconde todo lo que no es seguro para él.",
  },
  {
    n: "2",
    title: "Genera tu semana",
    desc: "Un toque y tienes el menú completo por hijo, la lista de compras y las loncheras listas.",
  },
  {
    n: "3",
    title: "Cocina sin pensar",
    desc: "Sigue los pasos, marca lo hecho y deja que tu peque suba de nivel como Mini Chef.",
  },
];

const FEATURES = [
  {
    tag: "Planificador semanal",
    title: "Toda la semana resuelta en 2 minutos",
    desc: "Menú completo para cada hijo, adaptado a su edad exacta en meses, sus alergias y sus texturas. La lista de compras se arma sola, agrupada por sección del súper y lista para compartir por WhatsApp.",
    img: "/images/ui/modulo-planificador-semanal.webp",
    bullets: ["Un menú por cada hijo", "Lista de compras automática", "Genera tu semana en un toque"],
  },
  {
    tag: "El botón ‘¿Qué le doy hoy?’",
    title: "Cuando no sabes qué darle, en 30 segundos",
    desc: "Te da tres ideas seguras según la hora del día y el tiempo que tengas. Aceptas una y listo. Sin scroll infinito, sin culpa, sin improvisar con lo primero que aparezca.",
    img: "/images/ui/modulo-decisor-sos.webp",
    bullets: ["Filtra por su edad y alergias", "Tres ideas seguras al instante", "Rescata la mañana caótica"],
  },
  {
    tag: "Armador de loncheras",
    title: "Loncheras que un nutricionista aprobaría",
    desc: "Arrastra proteína, carbohidrato, fruta o verdura y bebida a las cuatro casillas. Un semáforo te avisa si está balanceada y si necesita gel refrigerante para mantener la cadena de frío.",
    img: "/images/ui/modulo-armador-lonchera.webp",
    bullets: ["Balance en tiempo real", "Aviso de cadena de frío", "Ideas que sí se comen"],
  },
];

const SAFETY = [
  "Miel bloqueada antes de los 12 meses",
  "Frutos secos enteros bloqueados antes de los 5 años",
  "Azúcares libres bloqueados antes de los 2 años",
  "Cortes anti-atragantamiento por etapa",
  "Alérgenos marcados en cada receta",
  "Cadena de frío en cada lonchera",
];

const BEFORE = [
  "Improvisas a última hora y casi siempre repites lo mismo.",
  "Cargas con la culpa de si comió suficiente y bien.",
  "Cocinas dos veces: el puré del bebé y la comida del mayor.",
  "La lonchera vuelve a casa casi intacta.",
  "Gastas energía decidiendo qué darle, todos los días.",
];

const AFTER = [
  "Abres la app y la semana entera ya está resuelta.",
  "Sabes que cada plato es seguro y balanceado para su edad.",
  "Una sola cocinada alcanza para todos tus hijos.",
  "Loncheras variadas que de verdad se comen.",
  "Recuperas tu cabeza para disfrutar a tu familia.",
];

const BENEFITS = [
  {
    icon: "🕐",
    title: "Recuperas tu tiempo",
    desc: "Se acaban las 40 microdecisiones de la semana. Dos minutos y tienes todo listo.",
  },
  {
    icon: "😌",
    title: "Sueltas la culpa",
    desc: "Cada comida está pensada por edad y balance. Dejas de dudar si lo hiciste bien.",
  },
  {
    icon: "🛡️",
    title: "Tranquilidad total",
    desc: "Nada inseguro para su edad llega a su plato. La seguridad es automática.",
  },
  {
    icon: "🍽️",
    title: "Menos peleas en la mesa",
    desc: "Variedad, recetas que sí les gustan y tu peque cocinando lo que va a comer.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Una cocina para todos",
    desc: "Del bebé que empieza sólidos al escolar con lonchera, sin cocinar dos veces.",
  },
  {
    icon: "💚",
    title: "Hijos que comen mejor",
    desc: "Más verduras, menos azúcar escondida y el hábito de probar cosas nuevas.",
  },
];

const SHOWCASE = [
  "helado-de-mango",
  "nuggets-de-pollo",
  "risotto-de-champinones",
  "muffins-de-calabaza",
  "panqueques-de-banana",
  "pure-de-zanahoria-y-papa",
  "arroz-con-pollo-y-verduras",
  "mini-pizza-casera-con-tomates-cherry",
  "tortitas-de-papa-y-queso",
  "batido-de-papaya",
  "hummus-clasico",
  "pastel-de-zanahoria-sin-azucar-refinada",
];

// Todos los planes dan acceso idéntico y completo. Lo único que cambia entre
// ellos es cuánto ahorras según el plazo que elijas.
const PLAN_BENEFITS = [
  "301 recetas corregidas, seguras por edad y fotografiadas",
  "Planificador semanal de comidas por hijo",
  "Armador de loncheras balanceadas",
  "Ideas al instante: ‘¿Qué le doy hoy?’",
  "Recetario filtrado por edad y alergias",
  "Nota 'Para toda la familia' en cada receta: una cocinada para todos",
  "Escudo de Seguridad automático por edad",
  "Pasaporte de Sabores y niveles Mini Chef",
  "Lista de compras automática, lista para enviar por WhatsApp",
];

const PLANS = [
  {
    name: "Mensual",
    price: "$4.99",
    cycle: "por mes",
    equiv: "Pago mes a mes",
    save: null as string | null,
    note: "Máxima flexibilidad, cancela cuando quieras",
    best: false,
  },
  {
    name: "Anual",
    price: "$29.99",
    cycle: "por año",
    equiv: "Equivale a $2.50 al mes",
    save: "Ahorras 50%",
    note: "Un solo pago al año, sin renovar cada mes",
    best: true,
  },
];

const FAQ = [
  {
    q: "¿MiniChefs reemplaza al pediatra?",
    a: "No. Es una herramienta de organización y no sustituye la consulta con tu pediatra o nutricionista. La introducción de alimentos, texturas y alérgenos debe hacerse siempre bajo su orientación.",
  },
  {
    q: "¿Sirve si tengo hijos de edades muy distintas?",
    a: "Sí. Cada hijo tiene su perfil y su etapa, y cada receta incluye su nota 'Para toda la familia' con cómo adaptar la misma cocinada para los grandes y los chicos.",
  },
  {
    q: "¿El plan mensual y el anual dan lo mismo?",
    a: "Sí, exactamente lo mismo: acceso completo a toda la app. Lo único que cambia es el precio. El anual sale a $2.50 al mes (50% menos que el mensual) con un solo pago al año.",
  },
  {
    q: "¿Funciona sin internet?",
    a: "Instala MiniChefs en tu teléfono y ábrela al instante como una app. Tu lista de compras puedes enviarla por WhatsApp para tenerla siempre a mano, incluso donde falla la señal.",
  },
  {
    q: "¿Las recetas son seguras para bebés?",
    a: "Cada receta trae su edad mínima, sus alérgenos y su adaptación de textura. El Escudo de Seguridad bloquea automáticamente lo que no corresponde a la edad de tu hijo.",
  },
];

function Landing() {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/ui/icono-pwa-512.webp"
              alt="MiniChefs"
              className="h-10 w-10 rounded-2xl shadow-soft"
            />
            <span className="font-display text-xl font-bold text-deep-green">MiniChefs</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent sm:px-4"
            >
              Ingresar
            </Link>
            <a
              href="#precios"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Ver planes
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:pb-24 lg:pt-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-mint/50 px-3 py-1 text-xs font-semibold text-deep-green">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Para hijos de 6 meses a 9 años
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-deep-green lg:text-6xl">
            Deja de preguntarte{" "}
            <span className="text-primary">qué darle de comer</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            MiniChefs planifica la semana, arma las loncheras y decide por ti en dos toques —
            con 301 recetas seguras para cada edad. Sin culpa, sin listas eternas.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#precios"
              className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5"
            >
              Ver los planes
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-full border border-input bg-background px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Suscripción desde $4.99 al mes · Acceso completo · Cancela cuando quieras
          </p>
        </div>

        {/* Hero visual */}
        <div className="mt-10 lg:mt-0">
          <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-corn/60 to-carrot/40 shadow-lift">
            <img
              src="/images/ui/hero-landing.webp"
              alt="Mamá e hija cocinando juntas"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/85 p-4 backdrop-blur">
              <p className="font-display text-sm font-semibold text-deep-green">Hoy le toca…</p>
              <p className="text-xs text-muted-foreground">
                Puré de zanahoria con pollito · listo en 15 min
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 py-6 text-center sm:grid-cols-4">
          {[
            ["301", "recetas seguras"],
            ["6m–9a", "una app, todas las edades"],
            ["OMS · AAP", "guías pediátricas"],
            ["Auto", "seguridad por edad"],
          ].map(([big, small]) => (
            <div key={small}>
              <p className="font-display text-2xl font-bold text-primary">{big}</p>
              <p className="mt-1 text-xs text-muted-foreground">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problema / agitación */}
      <section className="mx-auto max-w-5xl px-5 py-16 lg:py-20">
        <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Si eres mamá o papá, esto te suena
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Darles de comer bien no debería consumir tu energía todos los días. Pero pasa.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PAINS.map((p) => (
            <div key={p.title} className="flex gap-4 rounded-3xl bg-card p-5 shadow-soft">
              <span className="text-3xl">{p.emoji}</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center font-display text-xl font-semibold text-deep-green lg:text-2xl">
          MiniChefs se encarga de la parte difícil para que tú solo cocines y disfrutes.
        </p>
      </section>

      {/* Antes → Después (transformación) */}
      <section className="border-y border-border bg-card/60 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
            Así cambia tu semana
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            La misma cocina, la misma familia. Lo que cambia eres tú, con la carga mental fuera.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-background/60 p-6">
              <p className="font-display text-lg font-bold text-muted-foreground">Hoy, sin ayuda</p>
              <ul className="mt-4 space-y-3">
                {BEFORE.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="mt-0.5 flex-none text-base">😮‍💨</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 border-primary bg-mint/20 p-6 shadow-lift">
              <p className="font-display text-lg font-bold text-deep-green">Con MiniChefs</p>
              <ul className="mt-4 space-y-3">
                {AFTER.map((a) => (
                  <li key={a} className="flex items-start gap-3 text-sm font-medium text-foreground">
                    <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      ✓
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
            Cómo funciona
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            En tres pasos pasas del “no sé qué darle” a la semana resuelta.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-3xl bg-card p-6 text-center shadow-soft">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features (deep dives) */}
      <section className="mx-auto max-w-5xl px-5 py-16 lg:py-20">
        <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Todo lo que hace por ti
        </h2>
        <div className="mt-12 flex flex-col gap-14">
          {FEATURES.map((f, i) => (
            <div
              key={f.tag}
              className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div className="overflow-hidden rounded-[2rem] bg-mint/30 shadow-lift">
                <img src={f.img} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{f.tag}</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-deep-green lg:text-3xl">
                  {f.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.desc}</p>
                <ul className="mt-4 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lo que ganas (beneficios) */}
      <section className="border-y border-border bg-card/60 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
            Lo que de verdad ganas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            No compras “otra app de recetas”. Recuperas tu tiempo, tu calma y la tranquilidad de
            estar haciéndolo bien.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-3xl bg-card p-6 shadow-soft">
                <span className="text-3xl">{b.icon}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-deep-green">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escudo de seguridad */}
      <section className="border-y border-border bg-safety-soft/50 py-16 lg:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] bg-background shadow-lift">
            <img
              src="/images/ui/modulo-escudo-seguridad.webp"
              alt=""
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-safety">
              Escudo de Seguridad
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-deep-green lg:text-3xl">
              Nunca verás una receta peligrosa para su edad
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Corregimos los errores de miles de recetas que circulan por internet. MiniChefs
              bloquea solo lo que no es seguro para la edad de tu hijo y te dice cómo adaptar
              cortes y texturas. Paz mental que ninguna receta suelta te da.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {SAFETY.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 flex-none text-safety">🛡️</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Para cada etapa */}
      <section className="mx-auto max-w-5xl px-5 py-16 lg:py-20">
        <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Crece con tu hijo
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
          De las primeras papillas a las loncheras del colegio. Una sola app para toda la infancia.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            {
              img: "/images/ui/hero-modo-bebe.webp",
              tag: "6 a 24 meses",
              title: "Modo bebé",
              desc: "Guía de texturas mes a mes, alimentación complementaria y Pasaporte de Sabores para registrar cada primer bocado.",
            },
            {
              img: "/images/ui/hero-modo-escolar.webp",
              tag: "2 a 9 años",
              title: "Modo escolar",
              desc: "Loncheras balanceadas, snacks para llevar y el niño cocinando como Mini Chef lo que él mismo ayudó a preparar.",
            },
          ].map((c) => (
            <div key={c.title} className="overflow-hidden rounded-[2rem] bg-card shadow-soft">
              <img src={c.img} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{c.tag}</p>
                <h3 className="mt-1 font-display text-xl font-bold text-deep-green">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recetario visual (prueba de valor) */}
      <section className="border-y border-border bg-card/60 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
            301 recetas listas para cocinar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Corregidas, seguras por edad y pensadas para que de verdad se las coman. Desde las
            primeras papillas hasta la merienda del cole.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SHOWCASE.map((slug) => (
              <div
                key={slug}
                className="aspect-square overflow-hidden rounded-2xl bg-mint/30 shadow-soft"
              >
                <img
                  src={`/images/recipes/receta-${slug}.webp`}
                  alt={`Foto de la receta ${slug.replace(/-/g, " ")}`}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            …y 289 más, cada una con su foto, sus pasos y su adaptación por edad.
          </p>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="mx-auto max-w-5xl px-5 py-16 lg:py-20">
        <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Elige tu plan
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Ambos planes incluyen <b className="text-foreground">exactamente lo mismo</b>: acceso
          completo a toda la app. Lo único que cambia es cuánto ahorras según el plazo.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl items-start gap-5 sm:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border-2 bg-card p-6 shadow-soft ${
                p.best ? "border-primary shadow-lift md:-mt-3" : "border-transparent"
              }`}
            >
              {p.best && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft">
                  Mejor valor
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-deep-green">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cycle}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{p.equiv}</span>
                {p.save && (
                  <span className="rounded-full bg-carrot/20 px-2 py-0.5 text-xs font-bold text-carrot">
                    {p.save}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>

              <Link
                to="/auth"
                className={`mt-5 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  p.best
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "border border-input bg-background text-foreground hover:bg-accent"
                }`}
              >
                Suscribirme
              </Link>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Todo incluido
                </p>
                <ul className="mt-3 space-y-2">
                  {PLAN_BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ambos planes dan acceso completo. Solo cambia cuánto ahorras. Cancela cuando quieras.
        </p>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-card/60 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-deep-green lg:text-4xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-card p-5 shadow-soft">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-semibold text-foreground marker:content-['']">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="flex-none text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center lg:py-24">
        <img
          src="/images/ui/mascota-zana-celebracion.webp"
          alt=""
          className="mx-auto h-24 w-24 object-contain"
        />
        <h2 className="mt-4 font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Alimentar a tus hijos no debería estresarte
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Imagina llegar a la semana sabiendo exactamente qué cocinar, con la certeza de que es
          seguro para su edad y el gusto de verlos comer feliz. Eso es MiniChefs, todos los días.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5"
        >
          Suscribirme y empezar
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Acceso completo desde el primer día · Cancela cuando quieras
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Al continuar aceptas nuestro{" "}
          <Link to="/legal" className="underline">
            aviso legal
          </Link>
          .
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/images/ui/icono-pwa-512.webp" alt="" className="h-8 w-8 rounded-xl" />
            <span className="font-display text-lg font-bold text-deep-green">MiniChefs</span>
          </div>
          <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
            MiniChefs es una herramienta de organización y no reemplaza la consulta con tu pediatra
            o nutricionista. Verifica siempre etiquetas y posibles alérgenos.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {year} MiniChefs · Hecho con cariño para familias latinoamericanas ·{" "}
            <Link to="/legal" className="underline">
              Aviso legal
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
