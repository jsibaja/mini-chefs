# Storage — Buckets y políticas

MiniChefs usa dos buckets. Créalos desde Studio o con el CLI y aplica las
políticas exactas indicadas abajo.

## `recipe-images` (público)

Imágenes oficiales del recetario. Lectura pública; solo el `service_role`
puede escribir.

```sql
-- Crear bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública
CREATE POLICY "recipe-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

-- Escritura solo service_role (implícito, no requiere policy adicional).
```

Convención de nombres:
- `recetas/receta-{slug}.webp` — imagen principal.
- Si no existe, la app usa `public/images/placeholder-categoria-{categoria}.svg`.

## `user-photos` (privado por carpeta `{user_id}/`)

Fotos que suben las familias (evidencia de cocina, fotos del hijo cocinando).
Cada usuario solo puede leer y escribir dentro de su propia carpeta.

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "user-photos own read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user-photos own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user-photos own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user-photos own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

Convención de path: `{user_id}/{child_id}/{timestamp}.webp`.

## Verificación

```sql
SELECT id, public FROM storage.buckets WHERE id IN ('recipe-images','user-photos');
SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

## Regla base de `storage.objects`

`storage.objects` tiene RLS habilitado y SOLO las políticas de arriba. Cualquier
otro bucket (por ejemplo respaldos como `database_export_*`) queda accesible
únicamente para `service_role`, que omite RLS. No agregues políticas amplias
del tipo `USING (true)` sin filtrar por `bucket_id`.
