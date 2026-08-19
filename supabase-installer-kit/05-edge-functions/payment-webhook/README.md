# payment-webhook

Recibe callbacks de Hotmart (PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION,
PURCHASE_REFUNDED, CHARGEBACK) y sincroniza la tabla `subscriptions`.

## Deploy

```bash
supabase functions deploy payment-webhook --no-verify-jwt
supabase secrets set HOTMART_HOTTOK=xxxxxxxx
```

## Configurar en Hotmart

1. Herramientas → Postback (Webhook).
2. URL: `https://<project-ref>.functions.supabase.co/payment-webhook`.
3. HOTTOK: pega el mismo valor que guardaste en `HOTMART_HOTTOK`.
4. Marca los cuatro eventos: PURCHASE_APPROVED, PURCHASE_REFUNDED,
   SUBSCRIPTION_CANCELLATION, CHARGEBACK.

## Notas

- Idempotente: usa `hotmart_transaction_ref` como llave única.
- Si el email del comprador no existe como usuario, responde 200 sin
  crear nada para evitar reintentos infinitos.
- El mapeo de `plan.name` → código (mensual / semestral / anual) debe
  coincidir con los productos que crees en Hotmart.
