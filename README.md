# Global Connect — Planificación GDV

> Planificador inteligente de Grupos de Vida (GDV) para la plataforma GlobalConnect.

Este repositorio contiene el módulo de **planificación y gestión de Grupos de Vida** de la organización. Es un sub-sistema del proyecto principal [`global-ministries/global-connect`](https://github.com/global-ministries/global-connect): comparte la misma base de datos Supabase y el mismo modelo de autenticación, pero se entrega como un proyecto Next.js independiente con su propio ciclo de release.

---

## ¿Qué es un Grupo de Vida?

Un Grupo de Vida (GDV) es la unidad pastoral básica: una reunión semanal pequeña (8–15 personas) en una casa anfitriona, con un líder y, opcionalmente, un co-líder. El sistema gestiona su ciclo completo: creación, aprobación, asignación de casa, asistencia, seguimiento pastoral y baja.

## Funcionalidades

- **Planificación de grupos** — creación, aprobación y segmentación por tipo (matrimonios, jóvenes, mixtos, etc.) y temporada.
- **Casas anfitrionas** — registro, aprobación, geolocalización y mapa de ubicaciones con RPCs de visibilidad por rol.
- **Asistencia avanzada** — registro por reunión con tipo de presencia, motivo, tardanza y visitantes.
- **Solicitudes** — flujo de aprobación para ingresos, egresos, traslados y activaciones de grupo.
- **Dashboards de riesgo** — métricas y ranking de miembros en riesgo pastoral.
- **Multi-campus** — segmentación y configuración por campus, con scopes por director.
- **Pastoral y notas de líder** — seguimiento privado y notas pastorales por evento.
- **Importación masiva** — altas de miembros desde CSV con validación y rollback.
- **Verificación de certificados** — endpoint público para validar asistencia/certificados.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilos:** TailwindCSS 4, Radix UI, lucide-react, sistema de diseño propio con glassmorphism
- **UI móvil:** patrón mobile-first tipo "app nativa" (header fijo, menú inferior, listas duales)
- **Backend:** Supabase (Postgres, Auth, Storage) — base de datos compartida con `global-connect`
- **Validación:** react-hook-form + zod
- **Mapas:** @vis.gl/react-google-maps
- **Gráficos:** recharts, d3
- **Emails transaccionales:** resend + @react-email/components
- **Background jobs:** inngest
- **Observabilidad:** Sentry (server, edge, browser)
- **IA:** @google/genai para asistente pastoral
- **Calidad:** Jest, ESLint, commitlint, Conventional Commits

## Estructura

```
app/                    # App Router: páginas, layouts, server actions, API routes
  (auth)/               # Rutas autenticadas (grupos, dashboard, etc.)
  api/                  # Endpoints REST internos
  auth/                 # Login, signup, reset, verify, update-password
  verificar-certificado/ # Endpoint público de verificación
components/             # Sistema de diseño, dashboard, modales, mapas
hooks/                  # Hooks de negocio (paginación, permisos, KPIs, toasts)
lib/                    # Lógica servidor/cliente, server actions, clientes Supabase
database/               # Migraciones, seeds, elementos de Storage
docs/                   # Documentación viva (módulos, operaciones, runbooks)
emails/                 # Plantillas React Email
__tests__/              # Tests Jest
```

## Relación con global-connect

Este proyecto es **un módulo de [`global-connect`](https://github.com/global-ministries/global-connect)**, separado en su propio repositorio para tener:

- **Ciclo de release independiente** — los cambios en planificación GDV no fuerzan releases del core de la plataforma.
- **Esquema de base de datos compartido** — tablas como `usuarios`, `grupos`, `grupo_miembros`, `segmentos`, `temporadas`, `casas_anfitrionas`, `direcciones` viven en la misma instancia Supabase. Las migraciones de este repo deben coordinarse con las del repo principal.
- **SSO y perfiles unificados** — un usuario creado en `global-connect` puede autenticarse acá sin re-registrarse; las sesiones se validan contra la misma tabla `auth.users` de Supabase.

Si vas a tocar tablas compartidas (`grupos`, `casas_anfitrionas`, `segmentos`, `usuarios`), coordiná primero con el equipo de `global-connect` para evitar migraciones que rompan el otro proyecto.

## Quick start

Requisitos: Node 20+ y [Bun](https://bun.sh) (o `pnpm` / `npm`).

```bash
# 1. Instalar dependencias
bun install

# 2. Variables de entorno
cp .env.example .env.local
# Editar .env.local con:
#   NEXT_PUBLIC_SUPABASE_URL=<URL del proyecto Supabase compartido>
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
#   SUPABASE_SERVICE_ROLE_KEY=<service role key — solo server>
#   NEXT_PUBLIC_LOGO_URL=<opcional>

# 3. Arrancar en dev
bun run dev          # http://localhost:3000
```

El servidor lee la misma base de datos que `global-connect`. Si querés un entorno aislado, apuntá `.env.local` a un proyecto Supabase de staging propio y corré las migraciones desde `database/`.

## Scripts

| Script | Descripción |
|--------|-------------|
| `bun run dev` | Servidor de desarrollo en puerto 3000 |
| `bun run build` | Build de producción (con `--no-lint` para velocidad) |
| `bun run start` | Servidor de producción |
| `bun run lint` | ESLint |

## Documentación

La documentación funcional, técnica y operativa vive en [`docs/`](./docs). Empezá por:

- [`docs/REPORTE_SISTEMA_COMPLETO.md`](./docs/REPORTE_SISTEMA_COMPLETO.md) — arquitectura, stack y estado actual.
- [`docs/grupos-vida.md`](./docs/grupos-vida.md) — módulo Grupos de Vida (tablas, RPCs, server actions).
- [`docs/sistema-permisos-usuarios-final.md`](./docs/sistema-permisos-usuarios-final.md) — modelo de roles y permisos.
- [`docs/sistema-diseno.md`](./docs/sistema-diseno.md) — sistema de diseño y componentes.
- [`docs/casas-anfitrionas-map-operations.md`](./docs/casas-anfitrionas-map-operations.md) — runbook de producción para el rollout del mapa de casas.
- [`docs/dashboard/`](./docs/dashboard/) — dashboards por rol.

## Convenciones

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — ver `commitlint.config.mjs`. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.
- **PRs:** descripción + screenshots si hay cambios visuales. Tests obligatorios para server actions nuevas.
- **Seguridad:** RLS activo en todas las tablas. Server actions validan rol antes de mutar. Variables `service_role` solo en server.
- **Secretos:** gitleaks se ejecuta en CI. Nunca commitear `.env.local`, claves de Supabase ni JWTs.

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el detalle completo.

## Licencia

Privado y propiedad de Global Ministries. No distribuir sin autorización.
