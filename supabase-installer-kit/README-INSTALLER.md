# MiniChefs — Supabase Installer Kit

Este kit contiene TODO el backend real de MiniChefs, listo para reproducirlo
en cualquier proyecto Supabase nuevo. Se actualiza en el mismo cambio que
cada modificación de esquema, políticas, funciones o seed en la app.

## Para quién es
Está pensado para ser leído y ejecutado por **otro LLM** (o por un humano
técnico) que necesite recrear el backend fuera de Lovable.

## Orden EXACTO de ejecución

Ejecuta los archivos en este orden. No los mezcles.

1. **01-schema.sql** — extensiones, tipos enum (incluye el rol `owner`), las
   **23 tablas**, índices y GRANTs.
2. **02-rls-policies.sql** — habilita RLS, crea todas las políticas y **revoca
   la escritura** del cliente sobre catálogo, roles y suscripciones (un usuario
   normal no puede darse un rol, regalarse acceso ni tocar las reglas de
   seguridad alimentaria).
3. **03-functions-triggers.sql** — las **21 funciones** `SECURITY DEFINER`
   (`has_role`, `owns_child`, `has_active_subscription`, `is_staff`, `my_role`,
   las 9 del panel de administración, gamificación y la caja negra de hijos
   borrados) y los **10 triggers** (`handle_new_user`, `updated_at`,
   `trg_award_minichef_xp`, `trg_log_child_deletion`, `trg_protect_last_owner`).
4. **04-seed.sql** — datos base: alérgenos, planes de suscripción (Mensual
   $4.99 y Anual $29.99 activos), safety rules, logros, misiones y templates.
5. **05-seed-recipes.sql** — **catálogo completo: 301 recetas curadas**, con sus
   ingredientes, pasos, variantes por edad, los ajustes de la auditoría
   nutricional (topes de edad, pasos anti-atragantamiento, sal solo desde 12
   meses) y los consejos reescritos en lenguaje claro.
   ARCHIVO GENERADO en su primera parte: se regenera con
   `python seed/build_seed.py` a partir de `seed/recipes/*.json`; las secciones
   posteriores (auditoría y consejos) son migraciones idempotentes añadidas.
6. **05-edge-functions/** — `payment-webhook` (Hotmart) y `send-email` (Resend),
   cada uno con `index.ts` + `README.md`. El panel de administración **no
   necesita Edge Functions**: usa funciones de base de datos.
7. **06-storage.md** — buckets (`recipe-images` público, `user-photos`
   privado por carpeta `{user_id}/`) y sus políticas.
8. **07-correos-auth.md** — cómo dejar funcionando los correos de cuenta
   (recuperar contraseña) con SMTP propio y las URLs de redirección.

### Después de ejecutar
Asigna el staff inicial (sin esto nadie entra al panel `/admin`):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role FROM auth.users u,
     (VALUES ('owner'::public.app_role), ('admin'::public.app_role)) AS r(role)
 WHERE lower(u.email) = 'TU-CORREO-AQUI'
ON CONFLICT DO NOTHING;
```

> **Nota de esquema:** los campos de curaduría del catálogo
> (`conservation`, `protein_group`, `veggie_colors`, `carb_base`,
> `has_free_sugars`, `is_occasional_sweet`, `nutrition_blurb`,
> `family_mode_note`, `source_book`, `source_numbers`) y la tabla
> `recipe_variants` viven en la migración
> `supabase/migrations/20260724000000_recipe_curation_fields.sql`, ya
> incorporada a `01-schema.sql`. Si partes de cero, `01-schema.sql` los incluye.

## Variables de entorno (ver `env.example`)

Todas se configuran en Project Settings → Secrets del proyecto Supabase,
y en el archivo `.env` de la app (con prefijo `VITE_` cuando aplique).

| Nombre                          | Dónde                          |
| ------------------------------- | ------------------------------ |
| `SUPABASE_URL`                  | app (servidor) + edge          |
| `SUPABASE_PUBLISHABLE_KEY`      | app (cliente y servidor)       |
| `SUPABASE_SERVICE_ROLE_KEY`     | edge functions                 |
| `RESEND_API_KEY`                | edge `send-email`              |
| `SEND_FROM_DOMAIN`              | edge `send-email`              |
| `HOTMART_HOTTOK`                | edge `payment-webhook`         |

## Checklist de verificación

Después de ejecutar todo, verifica en Supabase:

- [ ] Todas las tablas de `public` tienen RLS habilitado (`SELECT
      relname, relrowsecurity FROM pg_class WHERE relnamespace =
      'public'::regnamespace AND relkind = 'r';`).
- [ ] Cada tabla de `public` tiene al menos un `GRANT` para
      `authenticated` o `anon` (según corresponda).
- [ ] Existe el trigger `on_auth_user_created` en `auth.users` que llama
      a `public.handle_new_user()`.
- [ ] `SELECT public.has_active_subscription(auth.uid());` corre sin
      error (devuelve `false` si no hay sesión).
- [ ] El seed insertó 3 planes, 11 alérgenos y **290 recetas con 264
      ingredientes** (`SELECT count(*) FROM public.recipes;` → 290).
- [ ] Ninguna receta con miel tiene `min_age_months < 12`, ninguna con
      `has_free_sugars = true` tiene `min_age_months < 24` y ninguna con
      fruto seco entero tiene `min_age_months < 60` (reglas OMS/AAP; el
      validador `seed/build_seed.py` lo comprueba antes de generar el SQL).
- [ ] Los buckets `recipe-images` y `user-photos` existen con las
      políticas indicadas en `06-storage.md`.

## Convención de nombres

- Código, tablas y columnas: inglés.
- Valores de enums que se muestran al usuario final (estados,
  reacciones): español neutro (`activa`, `lo_devoro`, etc.).

## Estado actual

El kit reproduce el backend completo: cuentas, suscripciones (preparadas
para Hotmart), catálogo curado de 290 recetas, planificación, loncheras,
gamificación, edge functions y storage.

## Cómo se regenera el catálogo

La fuente de verdad editorial son los archivos `seed/recipes/*.json`
(uno por receta, en la raíz del repo). Flujo:

```bash
python seed/build_seed.py --check   # valida: unicidad, seguridad por edad, campos
python seed/build_seed.py           # regenera 05-seed-recipes.sql
python seed/find_dupes.py           # detecta recetas repetidas entre libros
```

El validador **falla y no genera SQL** si detecta slugs o títulos
duplicados, bandas de edad inválidas o violaciones de las reglas de
seguridad alimentaria. Las reglas editoriales completas están en
`seed/CURATION-SPEC.md`.
