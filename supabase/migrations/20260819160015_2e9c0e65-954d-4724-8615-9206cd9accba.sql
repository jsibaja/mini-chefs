DO $$
DECLARE
  v_id uuid;
  v_plan uuid;
  v_months int;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = 'jsibaja@gmail.com';

  IF v_id IS NULL THEN
    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (
      v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'jsibaja@gmail.com', extensions.crypt('5jotas2013', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Juan Luis Sibaja'),
      now(), now(), '', '', '', '');

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, v_id::text, 'email',
            jsonb_build_object('sub', v_id::text, 'email', 'jsibaja@gmail.com', 'email_verified', true, 'phone_verified', false),
            now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = extensions.crypt('5jotas2013', extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_id;
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_id, 'Juan Luis Sibaja')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_id, 'owner'), (v_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id, billing_interval_months INTO v_plan, v_months
    FROM public.subscription_plans
   WHERE is_active = true
   ORDER BY billing_interval_months DESC
   LIMIT 1;

  IF v_plan IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = v_id AND status = 'activa' AND current_period_end > now()
  ) THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, current_period_end)
    VALUES (v_id, v_plan, 'activa', now(), now() + (coalesce(v_months, 12) || ' months')::interval);
  END IF;
END $$;