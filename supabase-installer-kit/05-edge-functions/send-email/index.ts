// MiniChefs — send-email (Deno / Supabase Edge Functions)
// Envuelve la API de Resend y renderiza plantillas HTML desde `../emails/`.
// Solo se puede invocar autenticado (verify_jwt = true por defecto).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SEND_FROM_DOMAIN = Deno.env.get("SEND_FROM_DOMAIN")!;

type TemplateKey =
  | "welcome"
  | "payment-confirmed"
  | "payment-failed"
  | "subscription-cancelled"
  | "password-reset";

const SUBJECTS: Record<TemplateKey, string> = {
  welcome: "¡Bienvenida a MiniChefs! 🥕",
  "payment-confirmed": "Pago confirmado — Tu MiniChefs está activo",
  "payment-failed": "No pudimos procesar tu pago",
  "subscription-cancelled": "Tu suscripción MiniChefs quedó cancelada",
  "password-reset": "Restablece tu contraseña de MiniChefs",
};

async function loadTemplate(key: TemplateKey, vars: Record<string, string>): Promise<string> {
  const url = new URL(`../emails/${key}.html`, import.meta.url);
  let html = await Deno.readTextFile(url);
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }
  return html;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: { to?: string; template?: TemplateKey; vars?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const { to, template, vars = {} } = body;
  if (!to || !template) return new Response("Missing 'to' or 'template'", { status: 400 });
  if (!(template in SUBJECTS)) return new Response("Unknown template", { status: 400 });

  const html = await loadTemplate(template, vars);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `MiniChefs <hola@${SEND_FROM_DOMAIN}>`,
      to: [to],
      subject: SUBJECTS[template],
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
