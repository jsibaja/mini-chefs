// MiniChefs — payment-webhook (Deno / Supabase Edge Functions)
// Recibe eventos de Hotmart y hace upsert idempotente en `subscriptions`.
// Verifica el header `X-HOTMART-HOTTOK` contra el secret `HOTMART_HOTTOK`.
// Deploy: supabase functions deploy payment-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HOTMART_HOTTOK = Deno.env.get("HOTMART_HOTTOK")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type HotmartEvent =
  | "PURCHASE_APPROVED"
  | "PURCHASE_REFUNDED"
  | "SUBSCRIPTION_CANCELLATION"
  | "CHARGEBACK";

function statusForEvent(event: HotmartEvent): string {
  switch (event) {
    case "PURCHASE_APPROVED":
      return "activa";
    case "SUBSCRIPTION_CANCELLATION":
      return "cancelada";
    case "PURCHASE_REFUNDED":
    case "CHARGEBACK":
      return "reembolsada";
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const hottok = req.headers.get("x-hotmart-hottok") ?? "";
  if (!HOTMART_HOTTOK || hottok !== HOTMART_HOTTOK) {
    return new Response("Invalid HOTTOK", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.event as HotmartEvent;
  const email: string | undefined = payload.data?.buyer?.email;
  const transactionRef: string | undefined = payload.data?.purchase?.transaction;
  const productCode: string | undefined = payload.data?.subscription?.plan?.name;

  if (!event || !email || !transactionRef) {
    return new Response("Missing fields", { status: 400 });
  }

  // Buscar el usuario por email.
  const { data: userLookup } = await admin.auth.admin.listUsers();
  const user = userLookup?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return new Response("User not found", { status: 200 });

  // Plan por código (mensual / semestral / anual).
  const planCode = (productCode ?? "mensual").toLowerCase();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, billing_interval_months")
    .eq("code", planCode)
    .maybeSingle();

  const now = new Date();
  const end = plan
    ? new Date(now.getTime() + plan.billing_interval_months * 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan?.id ?? null,
        status: statusForEvent(event),
        hotmart_transaction_ref: transactionRef,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        raw_event: payload,
      },
      { onConflict: "hotmart_transaction_ref" },
    );

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
