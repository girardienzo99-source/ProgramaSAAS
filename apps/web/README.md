# Programa SASS Web

Aplicación Next.js para la plataforma SaaS multirubro. La interfaz principal permite seleccionar un rubro, cargar su consola operativa y exponer rutas API para onboarding, navegación, facturación ARCA, integraciones públicas y gobierno empresarial.

## Estructura

- `src/app`: rutas App Router, páginas y endpoints API.
- `src/components`: consolas funcionales por módulo y rubro.
- `src/config/businessTypes.ts`: catálogo único de rubros, módulos activados y navegación por rubro.
- `src/lib`: clientes compartidos de infraestructura, como Supabase.
- `reliability_tests.js`: pruebas smoke de onboarding, ARCA, API pública y criptografía.

## Comandos

```bash
npm run dev -w @programa-sass/web
npm run build -w @programa-sass/web
npm run test -w @programa-sass/web
```

Desde la raíz del monorepo:

```bash
npm run build
npm run test
```

En Windows, si PowerShell bloquea `npm.ps1`, usar `npm.cmd`.

## Configuración

La app funciona en modo local con mocks si no existen variables de Supabase. Para conectar una instancia real:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

El catálogo de rubros debe mantenerse en `src/config/businessTypes.ts`; las APIs y la home consumen esa misma fuente para evitar divergencias entre frontend y backend.
