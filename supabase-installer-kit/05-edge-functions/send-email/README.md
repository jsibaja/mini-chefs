# send-email

Envía correos transaccionales usando Resend y renderiza las plantillas
HTML de `../emails/`. Sustituye variables `{{nombre}}` por texto plano.

## Deploy

```bash
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set SEND_FROM_DOMAIN=notificaciones.minichefs.app
```

## Uso

```ts
await supabase.functions.invoke("send-email", {
  body: {
    to: "mama@ejemplo.com",
    template: "welcome",
    vars: { nombre: "Luciana" },
  },
});
```

## Plantillas disponibles

| Clave                     | Cuándo se envía                                       |
| ------------------------- | ----------------------------------------------------- |
| `welcome`                 | Registro completado.                                  |
| `payment-confirmed`       | Webhook `PURCHASE_APPROVED`.                          |
| `payment-failed`          | Webhook con estado fallido.                           |
| `subscription-cancelled`  | Webhook `SUBSCRIPTION_CANCELLATION`.                  |
| `password-reset`          | El usuario pide recuperar su contraseña.              |
