INSERT INTO public.subscription_plans (code, name, description, price_usd, billing_interval_months, is_best_value, sort_order, is_active) VALUES
  ('mensual',   'Mensual', 'Acceso completo, facturación mensual.',            4.99,  1, false, 1, true),
  ('semestral', 'Pro',     'Acceso completo, facturación cada 6 meses.',       15.00, 6, false, 2, false),
  ('anual',     'Anual',   'Acceso completo, facturación anual. Mejor valor.', 29.99, 12, true,  3, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, current_period_end)
SELECT u.id, p.id, 'activa', now(), now() + interval '10 years'
  FROM auth.users u, public.subscription_plans p
 WHERE lower(u.email) = 'jsibaja@gmail.com'
   AND p.code = 'anual'
   AND NOT EXISTS (
     SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = u.id AND s.status = 'activa' AND s.current_period_end > now()
   );