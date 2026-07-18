# Reglas de Desarrollo del Proyecto: SaaS ERP Multirubro

A partir de este momento, se establece el siguiente proceso de desarrollo permanente para cualquier cambio, módulo o integración en la plataforma:

---

## 1. Proceso de Desarrollo Obligatorio

Para cada tarea o requerimiento de desarrollo:
1. **Analizar el Estado Actual:** Investigar el código base existente antes de escribir nuevas líneas.
2. **Reutilización Primero:** Detectar si ya existe algún componente, hook, función de utilidad, API o módulo reutilizable en el monorepo.
3. **Diseño y Justificación:** Diseñar la solución propuesta y justificar la arquitectura adoptada, las tecnologías elegidas y los patrones de diseño aplicados.
4. **Evaluación de Impacto:** Detallar el impacto de los cambios propuestos en las siguientes áreas:
   * **Seguridad:** Aislamiento multi-tenant (RLS), protección de secretos y tokens, sanitización de datos.
   * **Rendimiento:** Latencia de consultas, tamaño del bundle de cliente, uso eficiente de CPU y memoria RAM.
   * **Escalabilidad:** Compatibilidad con miles de empresas y sucursales en simultáneo.
   * **Experiencia de Usuario (UX):** Accesibilidad (etiquetas ARIA, lectura de pantalla), animaciones fluidas y manejo de estados de carga/error.
5. **Obtener Aprobación:** Detenerse y esperar la validación explícita del usuario/desarrollador antes de codificar.
6. **Implementación y QA:** Escribir código limpio, realizar pruebas unitarias y de integración locales y verificar compatibilidad con la compilación monorepo.
7. **Documentación:** Actualizar la documentación, manuales de arquitectura, la lista de tareas (`task.md`) y el reporte de entrega (`walkthrough.md`).

---

## 2. Reglas Permanentes de Priorización

* **Simplicidad sobre Complejidad:** Preferir soluciones minimalistas, limpias y legibles por encima de arquitecturas sobre-diseñadas.
* **Reutilización sobre Duplicación:** Evitar a toda costa la duplicación de código en los workspaces. Si se detecta lógica compartida, extraerla a un módulo de utilidad común en `@programa-sass/shared-types` u hooks reutilizables.
* **Seguridad y Mantenibilidad Primero:** Priorizar la protección de datos e inquilinos, cobertura de testing, la inmutabilidad y la legibilidad del código por encima de agregar nuevas funcionalidades secundarias.
* **Presentar Opciones:** Si existen alternativas de implementación, exponer pros y contras técnicos (tiempo de cómputo, mantenibilidad, velocidad de desarrollo) antes de avanzar.
