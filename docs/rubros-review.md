# Revisión por Rubro

Este documento registra el avance de mejora rubro por rubro. El patrón para cada rubro es:

1. Revisar consola, página dedicada y navegación.
2. Quitar `any` innecesarios y crear contratos de dominio.
3. Corregir cálculos de negocio y validaciones.
4. Alinear textos, navegación y módulos con `apps/web/src/config/businessTypes.ts`.
5. Validar `npm.cmd run build` y `npm.cmd run test`.

## Aislamiento obligatorio

- Cada empresa tiene un único `business_type_id`; los datos operativos pertenecen a una `company_id`.
- Las políticas RLS filtran productos, stock, movimientos, clientes, cajas, ventas e invoices por la empresa del JWT.
- La navegación con rubro activo abre su workspace dedicado; POS y dashboard no reutilizan demos de otro rubro.
- Los módulos contextuales no tienen fallback: si el módulo no corresponde, se bloquea y no se monta otra consola.
- El estado de cada workspace usa una clave por rubro, por lo que se reinicia al cambiar de actividad.
- La API pública almacena y consulta productos usando la `companyId` de la API key.

## Estado de la primera pasada

`Mejorado` indica que el rubro recibió la primera corrección funcional y de tipos; no significa que esté terminado para producción.

| Rubro | Estado | Cambios principales |
| --- | --- | --- |
| Gastronomía | Mejorado | Tipos para mesas, comandas, KDS y pedidos IA; productos con contrato `Product`; totales e IVA por alícuota; página `/salon` alineada al catálogo común. |
| Tienda de Ropa / Indumentaria | Mejorado | Catálogo tipado; modales con `Product`; matriz de talles/colores estable; filtro de stock bajo activo; feedback interno para CSV/impresión; página `/products` alineada al catálogo común. |
| Consultorio / Salud | Mejorado | Consola clínica tipada; filtros y selects con validadores; auditoría con actualizaciones funcionales; feedback interno para altas/evolución/reportes/impresión; `/appointments` alineado a HCE y navegación común. |
| Supermercado / Minimarket | Mejorado | POS rápido tipado; carrito y medios de pago con contratos; filtrado memoizado; devoluciones/anulaciones con actualización funcional; feedback interno para EAN no reconocido, devoluciones, arqueo e impresión térmica. |
| Ferretería / Materiales | Mejorado | Despachos y estados tipados; cotizador con cálculos memoizados; conversiones de unidad con feedback interno; remitos/manuales con actualizaciones funcionales; selector de estado validado y limpieza de estado muerto. |
| Taller Mecánico / Repuestos | Mejorado | Órdenes, estados, presupuesto y stock de repuestos tipados; filtros memoizados; timeline validado; feedback interno para alta de OT, mano de obra e impresión; eliminación de casts y alertas. |
| Peluquería / Salón de Belleza | Mejorado | Turnos, sillas, estados y pagos tipados; filtros memoizados; feedback interno para agenda/cobro/ficha/recordatorios/impresión; selects validados y eliminación de casts/alertas. |
| Gimnasio / Actividad Física | Mejorado | Socios, planes y estados tipados; filtros validados y memoizados; reservas/lista de espera, pagos y aptos médicos con feedback interno; eliminación de alertas. |
| Tecnología / Electrodomésticos | Mejorado | Garantías, filtros y estados RMA tipados; validadores para selects; alta de ingreso RMA normalizada; timeline sin efectos secundarios en actualizadores; métricas memoizadas; feedback interno para diagnóstico e impresión; eliminación de casts y alertas. |
| Servicios Profesionales | Mejorado | Proyectos, responsables, estados y filtros tipados; validadores para selects; alta de proyecto con normalización y presupuesto calculado; carga de horas, hitos y facturación sin efectos secundarios en actualizadores; métricas memoizadas con tarifa promedio real; feedback interno para horas, facturas e impresión. |
| Pet Shop / Veterinaria | Mejorado | Fichas de mascota, especies, veterinarios y vacunas tipadas; filtros y alta con validadores; pesajes, diagnóstico, vacunación y peluquería sin efectos secundarios en actualizadores; eliminación de helper heredado `selectedDeviceCheck`; métricas memoizadas y feedback interno para historia clínica, turnos e impresión. |
| Inmobiliaria / Propiedades | Mejorado | Propiedades, operaciones, alquileres, contratos, ofertas y reclamos tipados; filtros y selects con validadores; alta de contrato normalizada; cobro, ofertas y reclamos sin efectos secundarios en actualizadores; métricas memoizadas para mora/comisiones/reclamos; feedback interno para cobros, estados e impresión. |
| Hotelería / Hospedaje | Mejorado | Rack hotelero tipado por categoría, estado de habitación, limpieza y mucama; filtros validados; check-in, consumos, check-out, limpieza y housekeeping sin efectos secundarios en actualizadores; métricas memoizadas de ocupación, libres, bloqueadas y minibar; feedback interno para operaciones e impresión. |
| Educación / Colegios / Academias | Mejorado | Cursos, cuotas y filtros tipados; catálogo único de curso/docente/aula; matrícula normalizada; cobro de cuota, calificaciones y observaciones sin efectos secundarios en actualizadores; métricas memoizadas de alumnos, mora y asistencia; feedback interno para matrícula, caja, boletín e impresión. |
| Tintorería / Lavandería | Mejorado | Prendas, manchas, ciclos, servicios y estados de taller tipados; filtros y formularios con validadores; ingreso de prendas normalizado; pago y cambio de etapa sin efectos secundarios en actualizadores; métricas memoizadas de tickets, proceso, entregas y recaudación; feedback interno para recepción, pago, estados e impresión. |

## Segunda revisión de completitud

| Rubro | Estado actual | Integrado en esta etapa | Pendiente principal |
| --- | --- | --- | --- |
| Gastronomía | Segunda mejora funcional | Espacio propio con salón conectado a carta editable, imágenes, precios, disponibilidad, stock de productos, inventario de insumos, proveedores, recetas, costos y márgenes. Las comandas descuentan producto e ingredientes. | Persistir carta, imágenes, recetas, mesas, comandas y KDS en backend; agregar compras y lotes/vencimientos. |
| Tienda de Ropa / Indumentaria | En progreso | Catálogo, probador, devoluciones, fidelización y colecciones conectados en un único espacio. | Persistir variantes, cupones y movimientos de devolución. |
| Consultorio / Salud | En progreso | Agenda y fichas abren la consola clínica contextual. | Persistencia clínica, permisos por profesional y trazabilidad reforzada. |
| Supermercado / Minimarket | Subprograma persistente avanzado | Caja POS transaccional, catálogo, promociones, stock, compras, lotes FEFO, controles, góndolas, etiquetas, fidelización, rentabilidad, proveedores, cuenta corriente, conciliación, pronóstico, aprobaciones multinivel, portal externo, ASN, remitos PDF privados, recepciones parciales y mensajes EDI DESADV/RECADV en outbox. | Conectar la outbox EDI con redes externas y automatizar reclamos a proveedores. |
| Ferretería / Materiales | Segunda mejora funcional | Espacio propio con cotizador y repartos conectados, catálogo técnico, imágenes, SKU/EAN, unidades, peso, precios, stock por depósito/mostrador/reparto, transferencias, compras y cuentas de proveedores. | Persistir catálogo, presupuestos, movimientos, compras, cuentas y remitos; agregar listas de precios y cobranzas de obra. |
| Taller Mecánico / Repuestos | Segunda mejora funcional | Espacio propio con órdenes conectadas al inventario, catálogo de repuestos con imágenes y compatibilidad, compras, inspecciones de ingreso con fotografías y mantenimiento preventivo. El uso en OT descuenta stock. | Persistir órdenes, catálogo, fotos, compras, firmas y presupuestos; agregar portal de aprobación, garantías y turnos recurrentes. |
| Peluquería / Salón de Belleza | Segunda mejora funcional | Espacio propio con agenda conectada, servicios editables, productos e insumos con imágenes y stock, fórmulas técnicas, consumo automático, comisiones, paquetes y membresías. | Persistir agenda, catálogo, fórmulas, consumos, liquidaciones y paquetes; agregar compras, cabinas y portal de reservas. |
| Gimnasio / Actividad Física | En progreso | Contactos e inventario contextual abren socios y accesos. | Persistir membresías, asistencias, aptos y cobranzas. |
| Tecnología / Electrodomésticos | En progreso | Catálogo e inventario contextual abren series, garantías y RMA. | Persistir diagnósticos, garantías y trazabilidad por serie. |
| Servicios Profesionales | En progreso | Agenda y contactos contextualizan proyectos, horas y expedientes. | Persistir horas, hitos, documentos y facturación. |
| Pet Shop / Veterinaria | En progreso | Agenda y fichas abren pacientes, vacunas y peluquería. | Persistir historias, vacunas, turnos y productos asociados. |
| Inmobiliaria / Propiedades | En progreso | Agenda y catálogo contextual abren contratos, ofertas y reclamos. | Persistir contratos, cobranzas, ajustes y mantenimiento. |
| Hotelería / Hospedaje | En progreso | Agenda y contactos contextualizan reservas y huéspedes. | Persistir reservas, consumos, housekeeping y disponibilidad. |
| Educación / Academias | En progreso | Agenda y contactos contextualizan cursos y alumnos. | Persistir matrículas, cuotas, asistencia y calificaciones. |
| Tintorería / Lavandería | En progreso | Inventario contextual abre recepción y seguimiento de prendas. | Persistir tickets, ciclos, pagos y trazabilidad por prenda. |

## Mapa de expansión funcional

Este mapa guía las siguientes iteraciones. Cada submódulo debe compartir catálogo, inventario, clientes y movimientos con el resto del rubro.

| Rubro | Submódulos adicionales priorizados |
| --- | --- |
| Gastronomía | Compras, proveedores, producción diaria, reservas, delivery, desperdicios, lotes y vencimientos. |
| Indumentaria | Compras, proveedores, transferencias, conteos, e-commerce, campañas, caja por sucursal y análisis de talles. |
| Salud | Obras sociales, autorizaciones, recetas, estudios, consentimientos, caja profesional y recordatorios. |
| Supermercado | Conector EDI externo, reintentos operativos y reclamos automáticos por diferencias. |
| Ferretería | Listas por cliente, pedidos de obra, acopio, cobranzas, alquiler de herramientas, mantenimiento y flota. |
| Taller mecánico | Catálogo de repuestos, compras, inspección con fotos, presupuestos aprobables, garantías y mantenimiento preventivo. |
| Belleza | Catálogo de productos, fórmulas, consumo por servicio, comisiones, paquetes, membresías y cabinas. |
| Gimnasio | Planes, cobros recurrentes, accesos, rutinas, evaluaciones, clases, instructores y mantenimiento de equipos. |
| Tecnología | Catálogo serializado, compras, garantías, reparaciones, repuestos, diagnósticos, préstamos y RMA proveedor. |
| Servicios profesionales | CRM, propuestas, contratos, horas, gastos, documentos, hitos, facturación recurrente y rentabilidad. |
| Pet shop | Catálogo, lotes, vencimientos, compras, historia veterinaria, internación, vacunas, turnos y peluquería. |
| Inmobiliaria | Publicaciones, CRM, visitas, ofertas, contratos, cobranzas, ajustes, garantías y mantenimiento. |
| Hotelería | Tarifas, disponibilidad, canales, reservas, consumos, housekeeping, mantenimiento, caja y reputación. |
| Educación | Cursos, matrículas, cuotas, asistencia, evaluaciones, boletines, docentes, aulas y comunicaciones. |
| Lavandería | Tarifas, recepción fotográfica, etiquetas, lotes de lavado, insumos, rutas, entregas y cuentas corporativas. |
