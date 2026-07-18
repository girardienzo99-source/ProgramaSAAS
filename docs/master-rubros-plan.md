# Plan maestro de subprogramas por rubro

## 1. Objetivo

Construir una plataforma con 15 subprogramas operativos completos. Cada rubro debe tener interfaz, procesos, datos, roles, permisos, API, reportes y pruebas propios. La seleccion de un rubro nunca debe cargar componentes, catalogos, textos o registros de otro.

El mismo propietario puede administrar varios rubros, pero cada actividad operara como un espacio de empresa independiente con su propio `company_id` y `business_type`. La identidad de acceso puede ser compartida; los datos operativos no.

## 2. Reglas no negociables de aislamiento

1. Toda solicitud resuelve `companyId`, `businessType` y `userId` en el servidor.
2. Toda tabla operativa contiene `company_id`; las tablas exclusivas tambien validan el rubro de la empresa.
3. RLS filtra por `company_id` obtenido de `app_metadata`, nunca de parametros enviados por el navegador.
4. Las rutas de dominio usan `/rubros/{code}` y `/api/rubros/{code}`.
5. Cache, archivos y eventos usan claves con `companyId:businessType`.
6. Las imagenes se almacenan bajo `{companyId}/{businessType}/{entity}/{id}`.
7. No existe consola fallback: un modulo no habilitado devuelve bloqueo explicito.
8. Un dominio no importa componentes internos de otro dominio.
9. POS, catalogo e inventario se configuran por contrato; no contienen datos de demostracion de otras actividades.
10. Las pruebas crean al menos dos empresas de rubros distintos y demuestran que no pueden leer ni modificar datos cruzados.

## 3. Arquitectura objetivo

### Nucleo compartido

- Identidad, sesiones, empresas, sucursales y seleccion de espacio.
- RBAC, permisos, auditoria y aprobaciones.
- Clientes, proveedores y archivos, con extensiones de dominio.
- Catalogo base, precios, impuestos, stock y movimientos.
- Caja, pagos, ventas, cuentas corrientes y facturacion ARCA.
- Notificaciones, tareas, importaciones, exportaciones y webhooks.
- Observabilidad, idempotencia, rate limit, backups y recuperacion.

### Estructura de cada subprograma

```text
apps/web/src/domains/{rubro}/
  components/
  pages/
  forms/
  hooks/
  contracts/
  permissions/
  reports/
  tests/

apps/web/src/app/api/rubros/{rubro}/
  catalog/
  operations/
  inventory/
  reports/

packages/database/supabase/migrations/
  domain_{rubro}_*.sql
```

Cada dominio expone contratos publicos al nucleo. Los detalles internos permanecen dentro de su carpeta.

## 4. Plantilla funcional obligatoria

Todos los rubros deben resolver, cuando corresponda:

- Dashboard operativo con alertas y acciones reales.
- Catalogo de productos o servicios con imagenes, precios, impuestos y estado.
- Stock, insumos, ubicaciones, lotes, series o capacidad segun actividad.
- Clientes, proveedores y cuentas corrientes.
- Operacion principal del rubro con estados y trazabilidad.
- Compras, recepcion, costos y reposicion.
- Caja, cobros, devoluciones y facturacion ARCA.
- Agenda, tareas y notificaciones cuando exista trabajo programado.
- Reportes, exportacion y auditoria.
- Configuracion, roles y permisos especificos.

## 5. Subprogramas y alcance completo

### 1. Gastronomia

**Roles:** propietario, encargado, cajero, mozo, cocina, barra, delivery, compras y deposito.

**Modulos:** salon y mesas; reservas; carta digital; modificadores y combos; comandas; KDS cocina/barra; delivery y retiro; recetas; insumos; produccion; compras; lotes y vencimientos; desperdicios; caja; propinas; clientes; reportes.

**Entidades:** mesas, sectores, turnos, platos, recetas, ingredientes, comandas, estaciones, reservas, repartos y cierres.

**Flujos criticos:** abrir mesa, enviar comanda, producir, entregar, dividir cuenta, cobrar, facturar y descontar receta de forma atomica.

**Estado implementado:** catalogo con imagenes, precios y stock; inventario de insumos; recetas y costos por porcion; plano de mesas persistente; agenda de reservas con control de superposiciones; cola KDS con transiciones validadas; pedidos digitales conectados a stock y cocina; proveedores propios; ordenes de compra y recepciones parciales con costo promedio ponderado; caja por sucursal; division de cuenta con medios mixtos; propinas separadas; venta, movimientos y cierre de mesa atomicos e idempotentes; cola fiscal persistente vinculada a venta y cierre; borradores itemizados, estados ARCA, credenciales solo servidor e idempotencia fiscal; reportes gerenciales por periodo con ventas, IVA, propinas, medios de pago, productos, comparativo y CSV; APIs aisladas por rubro y permisos. Pendiente: transporte SOAP real homologado y conciliacion automatica de resultados inciertos.

### 2. Indumentaria

**Roles:** propietario, gerente de sucursal, vendedor, cajero, deposito, comprador, visual merchandising y e-commerce.

**Modulos:** catalogo; variantes talle/color; imagenes; colecciones; listas de precios; promociones; POS; reservas; probador; cambios y devoluciones; stock multisucursal; transferencias; compras; proveedores; e-commerce; fidelizacion; reportes de curva de talles.

**Entidades:** prendas, variantes, colecciones, temporadas, listas, transferencias, devoluciones, cupones y puntos.

**Flujos criticos:** compra y recepcion por variante, transferencia, venta, cambio conservando trazabilidad, nota de credito y reposicion.

### 3. Consultorio y salud

**Roles:** propietario, recepcion, profesional, asistente, facturacion, auditor clinico y administrador de privacidad.

**Modulos:** pacientes; agenda; historia clinica; evoluciones; diagnosticos; recetas; estudios; archivos; consentimientos; obras sociales; autorizaciones; planes de tratamiento; caja profesional; recordatorios; auditoria de acceso.

**Entidades:** pacientes, profesionales, turnos, episodios, evoluciones, recetas, estudios, consentimientos y autorizaciones.

**Flujos criticos:** reservar, admitir, atender, registrar evolucion firmada, emitir indicacion, cobrar y auditar cada acceso clinico. Los datos clinicos no se reutilizan como contactos comerciales.

### 4. Supermercado y almacen

**Roles:** propietario, gerente, cajero, supervisor, repositor, deposito, compras, precios y control de perdidas.

**Modulos:** POS por escaner; catalogo EAN; balanza; promociones; precios masivos; gondolas; stock; depositos; transferencias; compras; recepcion; lotes; vencimientos FEFO; mermas; conteos; fidelizacion; conciliacion de cajas.

**Entidades:** articulos, codigos EAN, promociones, lotes, ubicaciones, ordenes, recepciones, conteos, mermas y cajas.

**Flujos criticos:** escanear, validar promocion, cobrar, descontar lote, reponer gondola, recibir compra y conciliar caja sin permitir stock negativo no autorizado.

**Estado implementado:** catalogo e imagenes, precios y promociones, stock, compras, recepcion atomica, lotes FEFO, apertura y cierre de caja, ventas POS idempotentes, devoluciones auditadas, conteos ciclicos, mermas, transferencias entre sucursales y precios masivos. Los comprobantes internos permanecen pendientes de autorizacion ARCA y no inventan estado fiscal.

### 5. Ferreteria y materiales

**Roles:** propietario, vendedor tecnico, cajero, deposito, compras, reparto, cobranzas y responsable de alquileres.

**Modulos:** catalogo tecnico; unidades y conversiones; listas por cliente; cotizaciones; pedidos de obra; acopio; stock por ubicacion; transferencias; compras; proveedores; remitos; reparto; cuentas corrientes; alquiler de herramientas; mantenimiento y flota.

**Entidades:** materiales, unidades, presupuestos, acopios, remitos, rutas, herramientas, contratos de alquiler y cuentas.

**Flujos criticos:** cotizar, reservar o acopiar, preparar, despachar por remito, entregar, cobrar parcial y controlar devolucion de herramientas.

### 6. Taller mecanico y repuestos

**Roles:** propietario, recepcionista, jefe de taller, mecanico, repuestero, compras, caja y inspector.

**Modulos:** clientes y vehiculos; turnos; recepcion con fotos; ordenes de trabajo; diagnostico; presupuesto aprobable; tareas; tiempos; repuestos; compras; garantias; mantenimiento preventivo; firma; historial y caja.

**Entidades:** vehiculos, inspecciones, ordenes, tareas, presupuestos, aprobaciones, repuestos, garantias y servicios programados.

**Flujos criticos:** recibir vehiculo, registrar estado, diagnosticar, pedir aprobacion, consumir repuestos, cerrar tareas, entregar, facturar y programar proximo servicio.

### 7. Peluqueria y belleza

**Roles:** propietario, recepcion, estilista, colorista, especialista, cajero, deposito y administrador de comisiones.

**Modulos:** agenda; cabinas y sillas; servicios; duraciones; productos; insumos; formulas tecnicas; fichas; fotos autorizadas; consumo por servicio; paquetes; membresias; senas; comisiones; compras; caja y reservas online.

**Entidades:** turnos, recursos, servicios, formulas, fichas tecnicas, consumos, paquetes, sesiones y liquidaciones.

**Flujos criticos:** reservar recurso y profesional, cobrar sena, prestar servicio, consumir formula, vender producto, liquidar comision y programar seguimiento.

### 8. Gimnasio y deportes

**Roles:** propietario, recepcion, cobranzas, instructor, entrenador, coordinador de clases, control de acceso y mantenimiento.

**Modulos:** socios; planes; contratos; cobro recurrente; deuda; accesos; aptos medicos; evaluaciones; rutinas; clases; cupos; lista de espera; instructores; tienda; mantenimiento de equipos y comunicaciones.

**Entidades:** socios, membresias, cuotas, accesos, aptos, evaluaciones, rutinas, clases, reservas y equipos.

**Flujos criticos:** alta y consentimiento, activar plan, cobrar, validar acceso, bloquear por reglas, reservar clase, controlar apto y renovar membresia.

### 9. Tecnologia y electrodomesticos

**Roles:** propietario, vendedor, cajero, deposito, compras, tecnico, recepcion RMA y responsable de garantias.

**Modulos:** catalogo; series; IMEI; combos; stock serializado; compras; POS; garantias; reparaciones; diagnosticos; repuestos; prestamos; RMA proveedor; devoluciones y portal de seguimiento.

**Entidades:** productos, unidades seriales, garantias, equipos, diagnosticos, reparaciones, repuestos, prestamos y RMA.

**Flujos criticos:** recibir unidad serial, vender serie exacta, activar garantia, ingresar reparacion, diagnosticar, presupuestar, reparar o derivar a proveedor y entregar con firma.

### 10. Servicios profesionales

**Roles:** socio, director, comercial, profesional, asistente, administracion, facturacion y auditor.

**Modulos:** CRM; oportunidades; propuestas; contratos; proyectos o expedientes; tareas; horas; gastos; documentos; hitos; aprobaciones; anticipos; facturacion recurrente; cobranzas; rentabilidad y capacidad.

**Entidades:** oportunidades, propuestas, contratos, proyectos, casos, tareas, horas, gastos, hitos, facturas y documentos.

**Flujos criticos:** captar oportunidad, aprobar propuesta, abrir proyecto, imputar horas/gastos, cumplir hito, facturar, cobrar y medir margen.

### 11. Pet shop y veterinaria

**Roles:** propietario, vendedor, cajero, deposito, veterinario, asistente, peluquero, internacion y compras.

**Modulos:** tutores; mascotas; historia clinica; agenda; vacunas; recetas; estudios; internacion; peluqueria; catalogo; alimento; lotes; vencimientos; compras; planes preventivos; caja y recordatorios.

**Entidades:** tutores, mascotas, episodios, vacunas, turnos, internaciones, servicios, productos, lotes y planes.

**Flujos criticos:** registrar mascota, atender, vacunar, prescribir, vender producto asociado, internar, cobrar y recordar proxima dosis.

### 12. Inmobiliaria y propiedades

**Roles:** propietario, agente, captador, comercial, administrador de alquileres, cobranzas, mantenimiento y legal.

**Modulos:** propietarios; inmuebles; publicaciones; multimedia; portales; CRM; visitas; ofertas; reservas; contratos; garantias; alquileres; ajustes; cobranzas; expensas; mantenimiento; comisiones y documentos.

**Entidades:** propiedades, propietarios, interesados, publicaciones, visitas, ofertas, contratos, cuotas, garantias, reclamos y ordenes de mantenimiento.

**Flujos criticos:** captar, publicar, recibir interesado, visitar, ofertar, reservar, contratar, cobrar, ajustar canon y resolver mantenimiento con trazabilidad.

### 13. Hoteleria y hospedaje

**Roles:** propietario, gerente, recepcion, reservas, caja, housekeeping, mantenimiento, alimentos y administracion.

**Modulos:** tipos de habitacion; tarifas; disponibilidad; canales; reservas; senas; check-in; huespedes; consumos; minibar; housekeeping; mantenimiento; check-out; caja; facturacion; reputacion y reportes.

**Entidades:** habitaciones, tarifas, inventario diario, reservas, huespedes, estadias, consumos, tareas de limpieza y bloqueos.

**Flujos criticos:** cotizar disponibilidad, reservar sin sobreventa, cobrar sena, registrar huesped, asignar habitacion, consumir, limpiar, cerrar estadia y facturar.

### 14. Educacion y academias

**Roles:** propietario, direccion, secretaria, docente, preceptor, tesoreria, alumno, tutor y administrador academico.

**Modulos:** aspirantes; alumnos; tutores; cursos; planes; comisiones; matriculas; calendario; asistencia; evaluaciones; calificaciones; boletines; docentes; aulas; cuotas; becas; mora y comunicaciones.

**Entidades:** alumnos, tutores, cursos, comisiones, matriculas, clases, asistencias, evaluaciones, notas, cuotas y comunicaciones.

**Flujos criticos:** inscribir, matricular, generar cuotas, asignar curso, tomar asistencia, evaluar, publicar boletin, cobrar y comunicar al tutor.

### 15. Tintoreria y lavanderia

**Roles:** propietario, recepcion, clasificacion, lavado, planchado, control de calidad, reparto, caja y cuentas corporativas.

**Modulos:** tarifas; clientes; recepcion fotografica; prendas; manchas; riesgos; etiquetas; lotes de lavado; insumos; etapas; control de calidad; cobros; rutas; entregas; reclamos y cuentas corporativas.

**Entidades:** tickets, prendas, evidencias, etiquetas, lotes, ciclos, consumos, controles, rutas, entregas y reclamos.

**Flujos criticos:** recibir y fotografiar, etiquetar, clasificar, agrupar lote, procesar, controlar, cobrar, entregar con conformidad y resolver reclamo.

## 6. Roles y permisos

### Roles centrales

- Propietario: configuracion comercial, usuarios y vision total de su empresa.
- Administrador: configuracion operativa sin acceso a secretos de plataforma.
- Contador: facturacion, impuestos, cierres y exportaciones contables.
- Auditor: lectura de operaciones y auditoria, sin modificaciones.
- Soporte: diagnostico temporal, autorizado, auditado y sin datos sensibles por defecto.

### Modelo de permisos

Los permisos se definen como `{rubro}.{recurso}.{accion}`, por ejemplo `gastronomy.orders.close` o `healthcare.records.sign`. Cada accion sensible distingue `view`, `create`, `update`, `approve`, `cancel`, `export` y `admin`. Los permisos se asignan por empresa y sucursal; nunca globalmente al usuario.

## 7. Orden de implementacion uno por uno

### Fase 0. Base obligatoria

**Estado:** completada y certificada el 18 de julio de 2026. El registro estricto de 15 rubros, RBAC, RLS, storage aislado, idempotencia, auditoria, colas persistentes y validacion de contexto se encuentran implementados. La interfaz deriva menus y modulos del rubro activo sin fallback hacia Gastronomia.

1. Contexto de tenant y rubro en todos los repositorios.
2. RBAC granular y pruebas de permisos.
3. Repositorios compartidos de catalogo, stock, caja, contactos y archivos.
4. Storage de imagenes con validacion, compresion y limites.
5. Outbox, workers, auditoria, idempotencia y observabilidad.
6. Entorno Supabase local para pruebas de migraciones y RLS.

### Secuencia de subprogramas

1. Gastronomia: piloto del patron completo.
2. Supermercado: alto volumen, lotes y POS.
3. Indumentaria: variantes, transferencias y devoluciones.
4. Ferreteria: unidades, cotizaciones, acopio y reparto.
5. Taller mecanico: ordenes, evidencia y aprobaciones.
6. Belleza: agenda, recursos, formulas y comisiones.
7. Gimnasio: recurrencia, accesos y clases.
8. Tecnologia: serializacion, reparaciones y garantias.
9. Lavanderia: trazabilidad por prenda y produccion.
10. Pet shop: comercio mas historia veterinaria.
11. Servicios profesionales: proyectos, horas y rentabilidad.
12. Hoteleria: disponibilidad y prevencion de sobreventa.
13. Educacion: matriculas, cuotas y ciclo academico.
14. Inmobiliaria: contratos, cobranzas y mantenimiento.
15. Salud: liberacion final con controles reforzados de privacidad y auditoria.

Salud se diseña desde la Fase 0, pero se libera al final por su mayor exigencia de privacidad y trazabilidad.

## 8. Ciclo de trabajo para cada rubro

1. **Dominio:** contratos, estados, reglas, permisos y migracion SQL.
2. **Backend:** repositorios, APIs, transacciones, archivos y eventos.
3. **Operacion principal:** flujo vertical completo sin mocks.
4. **Comercial:** catalogo, compras, stock, caja y ARCA aplicables.
5. **Frontend:** menu propio, tablas, formularios, estados vacios, errores y responsive.
6. **Reportes:** indicadores reales, exportaciones y auditoria.
7. **QA:** unitarias, integracion, RLS, E2E, accesibilidad y carga.
8. **Cierre:** eliminar mocks, documentar, migrar datos y habilitar feature flag.

No se inicia el siguiente rubro hasta que el actual alcanza la definicion de terminado, salvo correcciones urgentes del nucleo compartido.

## 9. Definicion de terminado

Un rubro se marca `Completo` solamente cuando:

- No usa arrays o `Map` como almacenamiento operativo de produccion.
- Todos sus menus ejecutan una funcion real o muestran un estado explicitamente planificado.
- Altas, ediciones, bajas logicas, busquedas, filtros y paginacion persisten.
- Catalogos permiten imagen, nombre, precio, impuesto, costo, estado y atributos propios.
- Stock o capacidad se actualiza mediante movimientos auditables y transacciones.
- Roles impiden acciones no autorizadas desde UI y API.
- RLS y pruebas cruzadas demuestran aislamiento entre empresas y rubros.
- Operaciones monetarias son idempotentes y conciliables.
- Existen estados de carga, vacio, error, reintento y confirmacion.
- Funciona en escritorio y movil, por teclado y sin desbordamientos.
- Pruebas unitarias, integracion, E2E y build estan aprobadas.
- Dashboard y reportes usan datos reales.
- La documentacion operativa, migracion y recuperacion esta terminada.

## 10. Tablero de avance

| Orden | Rubro | Estado actual | Proxima entrega |
| --- | --- | --- | --- |
| 0 | Nucleo compartido | Completo: aislamiento, RBAC, RLS, storage, auditoria e idempotencia certificados | Pruebas de carga y observabilidad continua |
| 1 | Gastronomia | Subprograma persistente certificado: salon, reservas, KDS, inventario, compras, caja, cola fiscal y reportes | Homologar transporte ARCA real y conciliar respuestas inciertas |
| 2 | Supermercado | Catalogo, POS, inventario, compras, lotes, controles, gondolas, fidelizacion, rentabilidad, proveedores, conciliacion, pronostico y aprobaciones multinivel certificados | Portal de proveedores, confirmacion de entregas y EDI |
| 3 | Indumentaria | Demo integrada | Variantes, transferencias y devoluciones persistentes |
| 4 | Ferreteria | Demo avanzada | Presupuestos, acopio, remitos y cuentas persistentes |
| 5 | Taller mecanico | Demo avanzada | OT, fotos, aprobacion y repuestos persistentes |
| 6 | Belleza | Demo avanzada | Agenda, consumos y comisiones persistentes |
| 7 | Gimnasio | Demo funcional | Membresias, cobros, accesos y clases persistentes |
| 8 | Tecnologia | Demo funcional | Series, reparaciones, garantias y RMA persistentes |
| 9 | Lavanderia | Demo funcional | Tickets, etiquetas, lotes y entregas persistentes |
| 10 | Pet shop | Demo funcional | Pacientes, vacunas, catalogo y lotes persistentes |
| 11 | Servicios profesionales | Demo funcional | CRM, proyectos, horas y facturacion persistentes |
| 12 | Hoteleria | Demo funcional | Disponibilidad, reservas y housekeeping persistentes |
| 13 | Educacion | Demo funcional | Matriculas, cuotas, asistencia y notas persistentes |
| 14 | Inmobiliaria | Demo funcional | Publicaciones, contratos y cobranzas persistentes |
| 15 | Salud | Demo funcional | HCE, permisos clinicos y auditoria reforzada |

## 11. Control de calidad global

- Matriz automatica de rutas y modulos permitidos por rubro.
- Suite de aislamiento con dos empresas por escenario.
- Pruebas de concurrencia para stock, cupos, reservas y cajas.
- Pruebas de idempotencia para pagos, ventas, recepciones y facturas.
- Pruebas de carga por flujo representativo, no solo por endpoint.
- Auditoria visual en 390, 768, 1280 y 1920 px.
- Revision de accesibilidad WCAG AA en formularios y operaciones principales.
- Monitoreo de p95/p99, errores, conexiones, colas y trabajos fallidos.

## 12. Entregable de cada iteracion

Cada iteracion debe dejar migracion reversible, API documentada, interfaz conectada, pruebas, datos de ejemplo del mismo rubro y un registro de pendientes. No se aceptan botones decorativos, mensajes de exito sin persistencia ni funciones simuladas como trabajo terminado.
