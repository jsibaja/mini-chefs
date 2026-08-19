-- ============================================================
-- MiniChefs — 03-functions-triggers.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER children_updated_at BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER recipe_notes_updated_at BEFORE UPDATE ON public.recipe_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- owns_child
CREATE OR REPLACE FUNCTION public.owns_child(_child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.children WHERE id = _child_id AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_child(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_child(UUID) TO authenticated;

-- has_active_subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'activa' AND current_period_end > now()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;


-- ---------- has_role (roles sin recursión en RLS) ----------
-- Nota: has_role solo revela el rol de la propia cuenta (no filtra roles ajenos).
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND _user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- ---------- consume_decisor_use (cupo diario del decisor, atómico) ----------
CREATE OR REPLACE FUNCTION public.consume_decisor_use(_daily_limit integer DEFAULT 1)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := current_date;
  v_uses int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF public.has_active_subscription(v_uid) THEN RETURN true; END IF;
  IF _daily_limit IS NULL OR _daily_limit < 0 OR _daily_limit > 100 THEN _daily_limit := 1; END IF;
  INSERT INTO public.decisor_daily_uses (user_id, used_on, uses)
  VALUES (v_uid, v_today, 0) ON CONFLICT (user_id, used_on) DO NOTHING;
  UPDATE public.decisor_daily_uses SET uses = uses + 1
   WHERE user_id = v_uid AND used_on = v_today AND uses < _daily_limit
  RETURNING uses INTO v_uses;
  RETURN v_uses IS NOT NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.consume_decisor_use(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_decisor_use(integer) TO authenticated;

-- ============================================================
-- GAMIFICACION: XP, niveles y logros al marcar comidas hechas
-- (auditoria 2026-08-16 — antes la pantalla Progreso no tenia backend)
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_minichef_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_child uuid; v_xp int; v_level int; v_needed int; v_done_count int;
BEGIN
  IF NEW.is_done = true AND (OLD.is_done IS DISTINCT FROM true) THEN
    SELECT child_id INTO v_child FROM meal_plans WHERE id = NEW.meal_plan_id;
    IF v_child IS NOT NULL THEN
      SELECT coalesce(mini_chef_xp,0), coalesce(mini_chef_level,1) INTO v_xp, v_level FROM children WHERE id = v_child;
      v_xp := v_xp + 10;
      v_needed := 50 + v_level * 50;
      WHILE v_xp >= v_needed LOOP
        v_xp := v_xp - v_needed; v_level := v_level + 1; v_needed := 50 + v_level * 50;
      END LOOP;
      UPDATE children SET mini_chef_xp = v_xp, mini_chef_level = v_level WHERE id = v_child;
      SELECT count(*) INTO v_done_count FROM meal_plan_entries e JOIN meal_plans mp ON mp.id = e.meal_plan_id
       WHERE mp.child_id = v_child AND e.is_done = true;
      IF v_done_count >= 1 THEN
        INSERT INTO child_achievements (child_id, code, title) VALUES (v_child, 'primera-comida', 'Primera comida completada') ON CONFLICT (child_id, code) DO NOTHING;
      END IF;
      IF v_done_count >= 10 THEN
        INSERT INTO child_achievements (child_id, code, title) VALUES (v_child, 'diez-comidas', '10 comidas completadas') ON CONFLICT (child_id, code) DO NOTHING;
      END IF;
      IF v_done_count >= 50 THEN
        INSERT INTO child_achievements (child_id, code, title) VALUES (v_child, 'cincuenta-comidas', '50 comidas completadas') ON CONFLICT (child_id, code) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.award_minichef_xp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_minichef_xp ON public.meal_plan_entries;
CREATE TRIGGER trg_award_minichef_xp
AFTER UPDATE OF is_done ON public.meal_plan_entries
FOR EACH ROW EXECUTE FUNCTION public.award_minichef_xp();

-- Seguridad: TRUNCATE ignora RLS; los roles de cliente no deben poder vaciar tablas
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ============================================================
-- PANEL DE ADMINISTRACION (/admin) — roles, stats y gestion
-- ============================================================
-- Rol owner (por encima de admin)
-- Solo para bases creadas ANTES de que existiera el rol owner: ejecutar esta
-- linea POR SEPARADO (Postgres no permite usar un valor de enum nuevo en la
-- misma transaccion). En una base nueva no hace falta: 01-schema.sql ya crea
-- app_role con 'owner'.
-- ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner' BEFORE 'admin';

-- is_staff / my_role: base de la seguridad del panel
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _uid AND role IN ('owner','admin'));
$$;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT role::text FROM user_roles WHERE user_id = auth.uid()
                   ORDER BY CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END LIMIT 1), 'user');
$$;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;

-- ============================================================
-- CAJA NEGRA DE HIJOS BORRADOS (children_deleted_log)
-- Guarda una copia completa del hijo (snapshot) y de sus datos
-- relacionados ANTES de borrarlo, para poder restaurarlo despues.
-- Se crea aqui, antes de las funciones que la usan
-- (log_child_deletion y restore_deleted_child).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.children_deleted_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    uuid NOT NULL,
  user_id     uuid,
  child_name  text,
  deleted_at  timestamptz NOT NULL DEFAULT now(),
  deleted_by  uuid DEFAULT auth.uid(),
  db_user     text DEFAULT CURRENT_USER,
  snapshot    jsonb NOT NULL,
  related     jsonb
);

ALTER TABLE public.children_deleted_log ENABLE ROW LEVEL SECURITY;

-- Cada mama solo puede ver la caja negra de sus propios hijos borrados.
DROP POLICY IF EXISTS "own deleted log" ON public.children_deleted_log;
CREATE POLICY "own deleted log" ON public.children_deleted_log
  FOR SELECT USING (auth.uid() = user_id);

-- Solo escribe el trigger (SECURITY DEFINER): los clientes unicamente leen.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.children_deleted_log FROM anon, authenticated;
GRANT SELECT ON public.children_deleted_log TO anon, authenticated;

-- ============================================================
-- FUNCIONES DEL PANEL /admin
-- Todas SECURITY DEFINER y con la verificacion is_staff() en la
-- primera linea del cuerpo (excepto admin_grant_access_service, que
-- solo la llama el backend con service_role).
-- ============================================================

-- admin_stats: tarjetas de resumen del panel (usuarios, activos, de pago, por plan)
CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE res jsonb;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT jsonb_build_object(
    'usuarios_total', (SELECT count(*) FROM auth.users),
    'nuevos_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'activos', (SELECT count(DISTINCT s.user_id) FROM subscriptions s WHERE s.status='activa' AND (s.current_period_end IS NULL OR s.current_period_end > now())),
    'de_pago', (SELECT count(DISTINCT s.user_id) FROM subscriptions s WHERE s.status='activa' AND (s.current_period_end IS NULL OR s.current_period_end > now()) AND s.hotmart_transaction_ref IS NOT NULL),
    'inactivos', (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND s.status='activa' AND (s.current_period_end IS NULL OR s.current_period_end > now()))),
    'por_plan', (SELECT coalesce(jsonb_object_agg(p.name, p.c), '{}'::jsonb) FROM (
        SELECT sp.name, count(DISTINCT s.user_id) AS c FROM subscriptions s
        JOIN subscription_plans sp ON sp.id=s.plan_id
        WHERE s.status='activa' AND (s.current_period_end IS NULL OR s.current_period_end > now())
        GROUP BY sp.name) p)
  ) INTO res;
  RETURN res;
END $function$;

-- admin_list_users: tabla de usuarios con rol, plan, estado y si es de pago
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, email text, display_name text, role text, plan_name text, plan_code text, status text, current_period_end timestamp with time zone, created_at timestamp with time zone, is_paid boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name,
         coalesce((SELECT ur.role::text FROM user_roles ur WHERE ur.user_id=u.id
                   ORDER BY CASE ur.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END LIMIT 1), 'user'),
         sp.name, sp.code::text,
         CASE WHEN s.id IS NULL THEN 'sin_suscripcion'
              WHEN s.status='activa' AND (s.current_period_end IS NULL OR s.current_period_end > now()) THEN 'activa'
              ELSE s.status::text END,
         s.current_period_end, u.created_at, (s.hotmart_transaction_ref IS NOT NULL)
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN LATERAL (SELECT * FROM subscriptions s2 WHERE s2.user_id=u.id ORDER BY s2.created_at DESC LIMIT 1) s ON true
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE _search IS NULL OR _search = ''
     OR u.email ILIKE '%'||_search||'%' OR coalesce(p.display_name,'') ILIKE '%'||_search||'%'
  ORDER BY u.created_at DESC;
END $function$;

-- admin_set_access: activar o desactivar el acceso de una cuenta
-- (protege tu propia cuenta y las cuentas owner)
CREATE OR REPLACE FUNCTION public.admin_set_access(_user_id uuid, _active boolean, _plan_code text DEFAULT NULL::text, _months integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_plan uuid; v_months int; v_sub uuid; v_me uuid := auth.uid();
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF NOT _active THEN
    IF _user_id = v_me THEN
      RAISE EXCEPTION 'No puedes desactivar tu propio acceso';
    END IF;
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'owner') THEN
      RAISE EXCEPTION 'No puedes desactivar una cuenta owner';
    END IF;
    UPDATE subscriptions SET status='cancelada', canceled_at=now(), updated_at=now()
     WHERE user_id=_user_id AND status='activa';
    RETURN jsonb_build_object('ok', true, 'estado', 'desactivado');
  END IF;

  SELECT id, billing_interval_months INTO v_plan, v_months FROM subscription_plans
   WHERE (_plan_code IS NULL AND code='mensual') OR code::text = _plan_code
   ORDER BY (code::text = coalesce(_plan_code,'mensual')) DESC LIMIT 1;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
  v_months := coalesce(_months, v_months, 1);

  SELECT id INTO v_sub FROM subscriptions WHERE user_id=_user_id ORDER BY created_at DESC LIMIT 1;
  IF v_sub IS NULL THEN
    INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_end)
    VALUES (_user_id, v_plan, 'activa', now(), now() + (v_months || ' months')::interval);
  ELSE
    UPDATE subscriptions SET plan_id=v_plan, status='activa', started_at=coalesce(started_at, now()),
           current_period_end = now() + (v_months || ' months')::interval, canceled_at=NULL, updated_at=now()
     WHERE id=v_sub;
  END IF;
  RETURN jsonb_build_object('ok', true, 'estado', 'activado');
END $function$;

-- admin_update_user: editar nombre, plan, estado y rol
-- (solo el owner cambia roles; nadie cambia su propio rol)
CREATE OR REPLACE FUNCTION public.admin_update_user(_user_id uuid, _display_name text DEFAULT NULL::text, _plan_code text DEFAULT NULL::text, _status text DEFAULT NULL::text, _role text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_plan uuid; v_months int; v_sub uuid; v_me uuid := auth.uid();
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF _display_name IS NOT NULL THEN
    UPDATE profiles SET display_name=_display_name, updated_at=now() WHERE id=_user_id;
  END IF;

  -- Solo el owner puede cambiar roles, y nadie puede quitarse su propio rol.
  IF _role IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id=v_me AND role='owner') THEN
      RAISE EXCEPTION 'Solo el owner puede cambiar roles';
    END IF;
    IF _user_id = v_me THEN RAISE EXCEPTION 'No puedes cambiar tu propio rol'; END IF;
    DELETE FROM user_roles WHERE user_id=_user_id;
    IF _role <> 'user' THEN
      INSERT INTO user_roles (user_id, role) VALUES (_user_id, _role::app_role) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF _plan_code IS NOT NULL OR _status IS NOT NULL THEN
    SELECT id, billing_interval_months INTO v_plan, v_months FROM subscription_plans WHERE code::text = coalesce(_plan_code, 'mensual');
    SELECT id INTO v_sub FROM subscriptions WHERE user_id=_user_id ORDER BY created_at DESC LIMIT 1;
    IF v_sub IS NULL AND coalesce(_status,'activa') = 'activa' THEN
      INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_end)
      VALUES (_user_id, v_plan, 'activa', now(), now() + (coalesce(v_months,1) || ' months')::interval);
    ELSIF v_sub IS NOT NULL THEN
      UPDATE subscriptions SET
        plan_id = coalesce(v_plan, plan_id),
        status = coalesce(_status::subscription_status, status),
        current_period_end = CASE WHEN _status='activa' THEN greatest(coalesce(current_period_end, now()), now() + (coalesce(v_months,1) || ' months')::interval) ELSE current_period_end END,
        canceled_at = CASE WHEN _status='cancelada' THEN now() ELSE NULL END,
        updated_at = now()
      WHERE id=v_sub;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END $function$;

-- admin_grant_access_service: alta de suscripcion desde el backend
-- (webhook de Hotmart / admin_create_user). NO la llama el navegador:
-- por eso mas abajo solo se concede a service_role.
CREATE OR REPLACE FUNCTION public.admin_grant_access_service(_user_id uuid, _plan_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_plan uuid; v_months int;
BEGIN
  SELECT id, billing_interval_months INTO v_plan, v_months
    FROM subscription_plans WHERE code::text = _plan_code;
  IF v_plan IS NULL THEN RETURN; END IF;
  INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_end)
  VALUES (_user_id, v_plan, 'activa', now(), now() + (coalesce(v_months,1) || ' months')::interval);
END $function$;

-- log_child_deletion: trigger BEFORE DELETE en children que llena la caja negra
CREATE OR REPLACE FUNCTION public.log_child_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.children_deleted_log (child_id, user_id, child_name, snapshot, related)
  VALUES (
    OLD.id, OLD.user_id, OLD.name, to_jsonb(OLD),
    jsonb_build_object(
      'allergens', (SELECT coalesce(jsonb_agg(to_jsonb(ca)), '[]'::jsonb) FROM child_allergens ca WHERE ca.child_id = OLD.id),
      'food_prefs', (SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM child_food_preferences p WHERE p.child_id = OLD.id),
      'plan_entries', (SELECT count(*) FROM meal_plan_entries e JOIN meal_plans mp ON mp.id = e.meal_plan_id WHERE mp.child_id = OLD.id),
      'achievements', (SELECT count(*) FROM child_achievements a WHERE a.child_id = OLD.id)
    )
  );
  RETURN OLD;
END $function$;

-- restore_deleted_child: recrea el hijo desde la caja negra
-- (solo la dueña de ese registro puede restaurarlo)
CREATE OR REPLACE FUNCTION public.restore_deleted_child(_log_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; v_new uuid;
BEGIN
  SELECT * INTO r FROM children_deleted_log WHERE id = _log_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Registro no encontrado'; END IF;
  IF r.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  INSERT INTO children (user_id, name, birth_date, gestational_weeks, school_nut_free,
                        has_thermal_lunchbox, mini_chef_level, mini_chef_xp)
  VALUES (r.user_id,
          r.snapshot->>'name',
          (r.snapshot->>'birth_date')::date,
          nullif(r.snapshot->>'gestational_weeks','')::int,
          coalesce((r.snapshot->>'school_nut_free')::bool, false),
          coalesce((r.snapshot->>'has_thermal_lunchbox')::bool, false),
          coalesce((r.snapshot->>'mini_chef_level')::int, 1),
          coalesce((r.snapshot->>'mini_chef_xp')::int, 0))
  RETURNING id INTO v_new;

  INSERT INTO child_allergens (child_id, allergen_id)
  SELECT v_new, (a->>'allergen_id')::uuid FROM jsonb_array_elements(coalesce(r.related->'allergens','[]'::jsonb)) a
  ON CONFLICT DO NOTHING;

  INSERT INTO child_food_preferences (child_id, ingredient_id, preference)
  SELECT v_new, (p->>'ingredient_id')::uuid, coalesce(p->>'preference','no_come')
  FROM jsonb_array_elements(coalesce(r.related->'food_prefs','[]'::jsonb)) p
  ON CONFLICT DO NOTHING;

  RETURN v_new;
END $function$;

-- protect_last_owner: trigger BEFORE DELETE en user_roles
-- que impide quedarse sin ningun owner
CREATE OR REPLACE FUNCTION public.protect_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.role = 'owner' AND (SELECT count(*) FROM user_roles WHERE role='owner') <= 1 THEN
    RAISE EXCEPTION 'No se puede quitar el último owner: el proyecto quedaría sin responsable';
  END IF;
  RETURN OLD;
END $function$;

-- Gestion de CUENTAS sin Edge Functions (Lovable Cloud): admin_create_user,
-- admin_delete_user, admin_change_email y admin_change_password. Todas
-- SECURITY DEFINER, validan is_staff() antes de actuar, y crean/actualizan
-- auth.users + auth.identities con el mismo formato que GoTrue (bcrypt via
-- pgcrypto, aud/role 'authenticated', email confirmado, identity provider email).
-- Protecciones: no eliminar tu propia cuenta ni un owner; solo el owner asigna
-- roles de staff; correo unico validado.

-- admin_create_user: crea la cuenta completa (auth.users + auth.identities)
CREATE OR REPLACE FUNCTION public.admin_create_user(_email text, _password text, _display_name text DEFAULT NULL::text, _plan_code text DEFAULT NULL::text, _role text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_me uuid := auth.uid();
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _email IS NULL OR position('@' in _email) = 0 THEN RAISE EXCEPTION 'Correo no válido'; END IF;
  IF _password IS NULL OR length(_password) < 6 THEN RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(_email)) THEN
    RAISE EXCEPTION 'Ya existe una cuenta con ese correo';
  END IF;
  IF _role IS NOT NULL AND _role <> 'user'
     AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_me AND role = 'owner') THEN
    RAISE EXCEPTION 'Solo el owner puede asignar roles de staff';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    lower(_email), extensions.crypt(_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    coalesce(jsonb_build_object('display_name', _display_name), '{}'::jsonb),
    now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
  VALUES (gen_random_uuid(), v_id, v_id::text, 'email',
          jsonb_build_object('sub', v_id::text, 'email', lower(_email), 'email_verified', true, 'phone_verified', false),
          now(), now(), NULL);

  -- El trigger handle_new_user crea el perfil; aseguramos el nombre.
  IF _display_name IS NOT NULL THEN
    UPDATE profiles SET display_name = _display_name WHERE id = v_id;
  END IF;
  IF _role IS NOT NULL AND _role <> 'user' THEN
    INSERT INTO user_roles (user_id, role) VALUES (v_id, _role::app_role) ON CONFLICT DO NOTHING;
  END IF;
  IF _plan_code IS NOT NULL AND _plan_code <> '' THEN
    PERFORM admin_grant_access_service(v_id, _plan_code);
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', v_id);
END $function$;

-- admin_delete_user: borra la cuenta (nunca la tuya, nunca un owner)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _user_id = v_me THEN RAISE EXCEPTION 'No puedes eliminar tu propia cuenta'; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'owner') THEN
    RAISE EXCEPTION 'No puedes eliminar una cuenta owner';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
  RETURN jsonb_build_object('ok', true);
END $function$;

-- admin_change_email: cambia el correo en auth.users y en auth.identities
CREATE OR REPLACE FUNCTION public.admin_change_email(_user_id uuid, _email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _email IS NULL OR position('@' in _email) = 0 THEN RAISE EXCEPTION 'Correo no válido'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(_email) AND id <> _user_id) THEN
    RAISE EXCEPTION 'Ese correo ya está en uso';
  END IF;
  UPDATE auth.users SET email = lower(_email), email_confirmed_at = coalesce(email_confirmed_at, now()),
         email_change = '', email_change_token_new = '', updated_at = now()
   WHERE id = _user_id;
  UPDATE auth.identities SET identity_data = identity_data || jsonb_build_object('email', lower(_email)),
         updated_at = now()
   WHERE user_id = _user_id AND provider = 'email';
  RETURN jsonb_build_object('ok', true);
END $function$;

-- admin_change_password: reescribe el hash bcrypt (pgcrypto) de la cuenta
CREATE OR REPLACE FUNCTION public.admin_change_password(_user_id uuid, _password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _password IS NULL OR length(_password) < 6 THEN RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres'; END IF;
  UPDATE auth.users SET encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
         updated_at = now() WHERE id = _user_id;
  RETURN jsonb_build_object('ok', true);
END $function$;

-- ============================================================
-- PERMISOS (GRANT EXECUTE)
-- El panel /admin llama estas funciones desde el navegador con la
-- sesion del staff: se conceden a authenticated y la propia funcion
-- corta con is_staff(). anon y PUBLIC no pueden ejecutarlas.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_access(uuid, boolean, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_access(uuid, boolean, text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_change_email(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_change_email(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_change_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_change_password(uuid, text) TO authenticated;

-- La mama restaura a su propio hijo desde la app.
REVOKE EXECUTE ON FUNCTION public.restore_deleted_child(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_deleted_child(uuid) TO authenticated;

-- Solo el backend (webhook Hotmart / edge functions) da acceso sin pasar por el panel.
REVOKE EXECUTE ON FUNCTION public.admin_grant_access_service(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_access_service(uuid, text) TO service_role;

-- Funciones de trigger: nadie las llama directamente.
REVOKE EXECUTE ON FUNCTION public.log_child_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_last_owner() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- TRIGGERS del panel y de la caja negra (al final: ya existen tabla y funciones)
-- ============================================================
DROP TRIGGER IF EXISTS trg_log_child_deletion ON public.children;
CREATE TRIGGER trg_log_child_deletion
BEFORE DELETE ON public.children
FOR EACH ROW EXECUTE FUNCTION public.log_child_deletion();

DROP TRIGGER IF EXISTS trg_protect_last_owner ON public.user_roles;
CREATE TRIGGER trg_protect_last_owner
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_owner();

-- Mantiene updated_at al dia en las notas personales de recetas.
DROP TRIGGER IF EXISTS recipe_notes_set_updated_at ON public.recipe_notes;
CREATE TRIGGER recipe_notes_set_updated_at BEFORE UPDATE ON public.recipe_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
