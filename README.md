# Programa SAAS

Plataforma ERP multiempresa y multirubro. Cada negocio opera con modulos, datos y permisos aislados por tenant y rubro.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Un proyecto Supabase para persistencia en produccion

## Desarrollo local

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -w @programa-sass/web
```

La aplicacion queda disponible en `http://localhost:3000`. Sin credenciales administrativas, los repositorios conservan sus adaptadores locales de desarrollo.

## Configuracion

Completar `.env.local` con la URL y clave publica de Supabase. Las claves `SUPABASE_SERVICE_ROLE_KEY`, credenciales de base de datos y secretos ARCA deben configurarse exclusivamente en el gestor de secretos del entorno de despliegue.

Nunca versionar `.env.local`, contrasenas, certificados ni claves privadas.

## Verificacion

```powershell
npm test
npm run build
```

Las migraciones SQL se encuentran en `packages/database/supabase/migrations` y deben aplicarse en orden antes de habilitar persistencia productiva.

## Despliegue

El repositorio incluye `vercel.json` para desplegar el monorepo desde su raiz. En Vercel deben configurarse la URL y clave publica de Supabase para el navegador y las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` para el servidor. La clave de servicio solo debe existir en el gestor de secretos de Vercel.
