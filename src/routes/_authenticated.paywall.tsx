import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlement } from "@/lib/active-child";

export const Route = createFileRoute("/_authenticated/paywall")({
  head: () => ({
    meta: [
      { title: "Planes · MiniChefs" },
      { name: "description", content: "Mensual o Anual. Ambos dan acceso completo a MiniChefs." },
    ],
  }),
  component: PaywallPage,
});

function PaywallPage() {
  const { data: entitlement } = useEntitlement();
  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 pb-12 pt-8 lg:pt-14">
      <header className="text-center">
        <img
          src="/images/ui/hero-paywall.webp"
          alt=""
          className="mx-auto mb-4 aspect-[16/9] w-full max-w-md rounded-3xl object-cover shadow-soft"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Suscripción</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green lg:text-4xl">
          Elige el plan de tu familia
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Ambos planes dan acceso completo. Solo cambia cuánto ahorras.
        </p>
        {entitlement?.hasActive && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint/60 px-4 py-2 text-sm font-semibold text-deep-green">
            <Check className="h-4 w-4" /> Ya tienes una suscripción activa
          </p>
        )}
      </header>

      {isLoading && (
        <p className="mt-8 text-center text-sm text-muted-foreground">Cargando planes…</p>
      )}

      <div className="mx-auto mt-10 grid max-w-2xl gap-5 md:grid-cols-2">
        {(plans ?? []).map((p: any) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-3xl p-6 shadow-soft ${
              p.is_best_value
                ? "border-2 border-primary bg-card ring-4 ring-primary/10"
                : "bg-card"
            }`}
          >
            {p.is_best_value && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase text-primary-foreground">
                Mejor valor
              </span>
            )}
            <h2 className="font-display text-2xl font-bold text-deep-green">{p.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
            <p className="mt-5">
              <span className="font-display text-4xl font-bold text-foreground">
                US$ {Number(p.price_usd).toFixed(2)}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                / {p.billing_interval_months === 1 ? "mes" : `${p.billing_interval_months} meses`}
              </span>
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Recetario filtrado por edad y alergias",
                "Planificador semanal por hijo",
                "Ideas al instante (‘¿Qué le doy hoy?’) sin límite",
                "Lista de compras automática",
                "Progreso Mini Chef",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {entitlement?.hasActive ? (
              <button
                type="button"
                disabled
                className="mt-6 inline-flex items-center justify-center rounded-full bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed"
              >
                Ya activo
              </button>
            ) : p.hotmart_offer_code ? (
              // Checkout de Hotmart: se activa al llenar hotmart_offer_code en el plan.
              <a
                href={`https://pay.hotmart.com/${p.hotmart_offer_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                Suscribirme
              </a>
            ) : (
              <Link
                to="/"
                hash="precios"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                Suscribirme
              </Link>
            )}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Pagos seguros. Cancela cuando quieras.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
