# Fase 0: seguridad y servicios compartidos

## Implementado

- `TenantContext` incluye empresa, usuario, rubro, sucursal y permisos.
- En produccion se verifica usuario, empresa activa, membresia activa, rubro y rol en Supabase.
- Las APIs internas exigen permisos mediante `authorizeRequest`.
- Los permisos aceptan coincidencia exacta, comodin global `*` o comodin de dominio terminado en `.*`.
- Los roles de sistema no pueden ser modificados por usuarios de empresa.
- Rol y sucursal de una membresia deben pertenecer a la misma empresa.
- Los uploads validan permiso, tamano, MIME, firma binaria y entidad.
- Las rutas de storage incluyen empresa y rubro.
- Existen buckets separados para catalogo publico y archivos privados.

## Variables de servidor

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` nunca puede exponerse con prefijo `NEXT_PUBLIC_` ni enviarse al navegador.

## Migraciones requeridas

Aplicar en orden:

1. `20260717000013_scalability_foundations.sql`
2. `20260717000014_rbac_and_storage.sql`
3. `20260717000015_gastronomy_domain.sql`
4. `20260717000016_gastronomy_operations.sql`
5. `20260717000017_gastronomy_floor_and_kds.sql`
6. `20260717000018_gastronomy_reservations.sql`
7. `20260717000019_gastronomy_purchases.sql`
8. `20260717000020_gastronomy_cash_and_settlements.sql`
9. `20260718000021_secure_fiscal_queue.sql`
10. `20260718000022_gastronomy_reports.sql`

La segunda migracion crea los buckets `catalog-assets` y `private-assets`. Los objetos usan la estructura:

```text
{company_id}/{business_type}/{entity}/{uuid}.{extension}
```

## Permisos centrales

- `platform.users.view`
- `platform.users.manage`
- `platform.settings.view`
- `platform.settings.update`
- `platform.imports.view`
- `platform.imports.create`
- `platform.notifications.view`
- `platform.notifications.manage`
- `platform.support.view`
- `platform.support.create`
- `platform.diagnostics.view`
- `platform.ai.use`
- `platform.files.view`
- `platform.files.create`
- `billing.read`
- `billing.create`
- `billing.manage`

El rol de propietario recibe `*`. Los nuevos roles deben recibir solo los permisos necesarios.

## Desarrollo local

Fuera de produccion se pueden simular contextos con:

```text
x-company-id: UUID
x-user-id: UUID
x-business-type: gastronomy
x-branch-id: UUID opcional
x-permissions: permiso.a,permiso.b
```

Si `x-permissions` no se especifica, el entorno local usa `*`. El valor `none` permite probar un rechazo `403`.

## Pendiente de infraestructura

- Aplicar migraciones a una instancia Supabase local y ejecutar pruebas RLS reales.
- Configurar limites de almacenamiento y ciclo de vida por plan.
- Agregar antivirus para documentos privados antes de habilitar PDF.
- Crear pantalla de administracion de usuarios, roles y permisos.
- Migrar los formularios de imagen existentes al endpoint `/api/uploads/images`.
- Instalar el transporte SOAP real de ARCA, validarlo en homologacion y configurar secretos por referencia antes de habilitar autorizaciones.
