# Revision transversal de la plataforma

## Estado

| Area | Estado | Alcance completado |
| --- | --- | --- |
| Rubros y frontend funcional | Mejorado | Primera pasada completa de los 15 rubros, navegacion centralizada y contratos de dominio tipados. |
| Backend y APIs | Mejorado | Validacion JSON compartida, errores uniformes, limites numericos y enums validados. |
| API publica | Segunda mejora | Claves por hash, comparacion segura, rate limit distribuido, repositorio persistente, paginacion keyset e idempotencia. |
| Facturacion ARCA | Mejorado | Validacion de ambiente, comprobante, documento, importes y consistencia del total; errores internos no expuestos. |
| Importaciones | Mejorado | CSV con comillas y saltos de linea, limite de 5 MB, errores por fila y rollback coherente. |
| Pruebas del backend | En progreso | Pruebas deterministas para validadores, aislamiento, rubros, persistencia, idempotencia y seguridad multitenant. Falta integracion con PostgreSQL real. |
| Interfaz y experiencia | Mejorado | Shell unificado, navegacion responsive, selector de rubros, controles accesibles y compatibilidad visual para todas las consolas. |
| Persistencia y multiempresa | En progreso | API publica persistente, RLS por empresa, identidad confiable y catalogo SQL alineado con los 15 rubros. Falta migrar todas las consolas cliente. |
| Autenticacion y permisos | En progreso | Sesion Supabase en produccion, tenant desde `app_metadata` y politicas globales cerradas. Falta autorizacion granular por permiso. |
| Accesibilidad y QA visual | En progreso | Se mantiene validacion responsive basica; falta auditoria sistematica de teclado, contraste y flujos completos. |

## Fase de escalabilidad 2026-07-17

- La API publica ya no depende de memoria en produccion: usa repositorios Supabase y falla de forma cerrada si la persistencia no esta configurada.
- Se agregaron paginacion por cursor, SKU unico por empresa, cola de eventos idempotente e indices para catalogo, stock y ventas.
- La validacion de claves y el rate limit pueden operar de forma distribuida entre multiples replicas.
- La identidad de empresa ahora se toma de `app_metadata`; se cerraron politicas globales de escritura y funciones administrativas expuestas.
- La capacidad para millones de cuentas queda condicionada a las pruebas de carga y a la infraestructura descritas en `docs/scalability-review.md`.

## Configuracion

En desarrollo, la API publica acepta `ps_live_local_development_key` para la empresa local. En produccion, las claves deben existir por hash en `company_api_keys` o definirse temporalmente como entradas `company_uuid:ps_live_clave` separadas por coma en `PROGRAMA_SASS_API_KEYS`; no hay clave de respaldo.

Las rutas internas obtienen la empresa desde `app_metadata.company_id` de la sesion Supabase. Los encabezados `x-company-id` y `x-user-id` solo se aceptan fuera de produccion para probar aislamiento local. Las operaciones publicas persistentes requieren `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en el servidor.
