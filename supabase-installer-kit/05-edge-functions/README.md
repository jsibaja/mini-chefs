# Edge Functions

Este directorio contiene el código listo para desplegar como
**Supabase Edge Functions** en proyectos fuera de Lovable. Dentro de
Lovable, `payment-webhook` corre como TanStack Server Route en
`src/routes/api/public/webhooks/hotmart.ts` y `send-email` como server
function; el código aquí es la versión Deno equivalente.

## Estructura

```
05-edge-functions/
├── payment-webhook/
│   ├── index.ts          # Handler Deno
│   └── README.md         # Cómo desplegarla
├── send-email/
│   ├── index.ts          # Handler Deno con Resend
│   └── README.md
└── emails/               # Plantillas HTML en español neutro
    ├── welcome.html
    ├── payment-confirmed.html
    ├── payment-failed.html
    ├── subscription-cancelled.html
    └── password-reset.html
```

## Deploy rápido

```bash
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy send-email
```

`payment-webhook` DEBE desplegarse con `--no-verify-jwt` porque Hotmart no
envía Authorization; la seguridad la aporta el header `X-HOTMART-HOTTOK`
verificado contra el secret `HOTMART_HOTTOK`.

## Secrets requeridos

```bash
supabase secrets set HOTMART_HOTTOK=xxxxxxxx
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set SEND_FROM_DOMAIN=notificaciones.minichefs.app
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

Ver `env.example` en la raíz del kit para la lista completa.
