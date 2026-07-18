# Escalabilidad y preparacion para alta demanda

## Alcance de la meta

"Millones de usuarios" no es una propiedad que pueda garantizarse solo con codigo. La capacidad debe validarse contra una carga definida, infraestructura dimensionada, datos representativos y objetivos de servicio. La referencia inicial de la plataforma sera:

- 1.000.000 de cuentas registradas.
- 100.000 empresas activas.
- 20.000 usuarios concurrentes en hora pico.
- 5.000 solicitudes por segundo de lectura y 1.000 de escritura como prueba objetivo inicial.
- API p95 menor a 300 ms para lecturas y menor a 700 ms para escrituras, excluyendo servicios externos.
- Disponibilidad mensual objetivo de 99,9% en la primera etapa productiva.

Estos valores deben ajustarse con datos reales antes de contratar capacidad.

## Estado implementado

1. Las rutas publicas son stateless cuando Supabase esta configurado; la memoria local solo se usa fuera de produccion.
2. Las claves de API se almacenan por hash y se validan desde base de datos.
3. El rate limit es atomico y compartido entre instancias mediante PostgreSQL.
4. Productos se listan con paginacion keyset, sin `OFFSET` creciente.
5. El SKU es unico por empresa y las consultas criticas tienen indices compuestos por tenant.
6. Las ventas externas usan una cola durable con clave de idempotencia.
7. El tenant proviene de `app_metadata`, administrada por el servidor.
8. Se cerraron politicas RLS globales de escritura y funciones administrativas publicas.

## Arquitectura objetivo

### Aplicacion

- Mantener Next.js sin estado local en produccion y ejecutar multiples replicas detras de balanceo.
- Separar workers para ventas, webhooks, importaciones, facturacion ARCA y trabajos pesados.
- Usar CDN y almacenamiento de objetos para imagenes de catalogo; nunca guardar binarios en la base transaccional.
- Aplicar cache por tenant solo a catalogos de lectura, con invalidacion por eventos.

### Datos

- Usar pool de conexiones y limites por servicio para proteger PostgreSQL.
- Particionar por fecha las tablas de ventas, auditoria, eventos y movimientos cuando su volumen lo justifique.
- Crear replicas de lectura para reportes y analitica; las operaciones de caja y stock deben seguir en el primario.
- Archivar auditoria historica y payloads de integracion en almacenamiento de menor costo.
- Mantener `company_id` en toda tabla operativa y probar RLS automaticamente.

### Trafico y resiliencia

- Mover rate limit a Redis o al edge cuando el trafico supere la capacidad razonable del primario SQL.
- Procesar webhooks con reintentos exponenciales, firma HMAC y dead-letter queue.
- Exigir idempotencia en ventas, pagos, stock, facturas y altas provenientes de integraciones.
- Definir timeouts, circuit breakers y presupuestos de reintento para ARCA, correo y pagos.

### Observabilidad

- Medir tasa de solicitudes, errores, latencia p50/p95/p99, saturacion de pool y profundidad de colas.
- Propagar un `request_id` por API, evento y worker.
- Alertar por errores de aislamiento, duplicados, stock negativo, demora de cola y fallos de facturacion.
- Evitar payloads personales, credenciales o historias clinicas en logs.

## Plan de validacion

1. Crear pruebas de integracion contra una base Supabase local con migraciones reales.
2. Agregar pruebas E2E para autenticacion, permisos y aislamiento entre dos empresas de rubros distintos.
3. Construir escenarios k6 para login, catalogo, caja, stock y ventas idempotentes.
4. Ejecutar escalones de 100, 1.000, 5.000 y 20.000 usuarios concurrentes.
5. Registrar el primer cuello de botella en cada escalon y repetir luego de corregirlo.
6. Ejecutar pruebas de recuperacion: caida de worker, timeout de base, webhook fallido y reintento de venta.

## Evolucion por rubro

Cada rubro se migrara por separado del estado de demostracion a repositorios persistentes. El orden recomendado es: catalogo e imagenes, stock e insumos, operaciones principales, compras/proveedores, caja/facturacion y reportes. Ningun repositorio puede consultar sin `company_id` y `business_type`; los flujos de un rubro no deben montar consolas ni datos de otro.

## Riesgos pendientes

- Las consolas de los 15 rubros todavia contienen datos de demostracion en el cliente y deben conectarse por etapas al backend.
- Falta autorizacion granular por permiso para operaciones administrativas.
- Falta desplegar y verificar la migracion `20260717000013_scalability_foundations.sql` en Supabase.
- Falta una infraestructura de workers para consumir `public_api_events`.
- La version estable actual de Next incluye PostCSS 8.4.31, afectado por una vulnerabilidad XSS moderada sin actualizacion estable disponible en el proveedor al momento de esta revision.
