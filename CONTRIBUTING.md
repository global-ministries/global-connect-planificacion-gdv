## Gu�a de Contribuci�n

Esta gu�a establece criterios claros de calidad, mantenimiento, seguridad, despliegue y colaboraci�n para asegurar que la evoluci�n del proyecto sea predecible y sostenible.

---
### 1. Principios de Calidad
- **Formato y Estilo:** Usa Prettier y ESLint. No commitees c�digo sin formatear. Sigue las reglas definidas en la configuraci�n del repositorio.
- **Simplicidad:** Evita complejidad innecesaria. C�digo legible > micro?optimizaciones tempranas.
- **DRY:** Reutiliza hooks, componentes y utilidades existentes antes de crear nuevos.
- **Separaci�n de L�gica:** Los componentes deben centrarse en la presentaci�n. La l�gica de negocio y acceso a datos vive en hooks (`/hooks`) o utilidades (`/lib`).
- **Nomenclatura Consistente:** Nombres claros, descriptivos y en espa�ol. Preferir verbos en infinitivo para funciones (e.g. `obtenerUsuario`).

### 2. Arquitectura de Frontend
- **Server Components por Defecto:** Usa Client Components �nicamente cuando sea imprescindible (estado local, efectos, eventos, APIs del navegador).
- **Formularios:** `react-hook-form` + `zod` para validaci�n y tipado consistente.
- **Componentes UI Reutilizables:** Residen en `/components/ui` y no contienen l�gica de negocio.
- **Estados As�ncronos:** Siempre manejar loading / error / empty / success.
- **Evitar Renderizados Innecesarios:** Memorizar cuando corresponda (`useMemo`, `React.memo`) y dividir componentes grandes.

### 3. Seguridad y Datos
- **Credenciales:** Nunca exponer secretos en el c�digo. Usar variables de entorno y `.env.local` no versionado.
- **Supabase:** Uso exclusivo del cliente oficial. Cualquier tabla nueva debe tener Row Level Security y pol�ticas definidas antes de exponerse.
- **Validaci�n:** Toda entrada del usuario validada con `zod` antes de persistencia o llamadas a RPC.
- **Cookies y Tokens:** Limpiar tokens expirados. No registrar valores sensibles en logs.
- **Prevenci�n:** Revisar posibles vectores CSRF / XSS (sanitizar input y validar origen en middleware).

### 4. Base de Datos y RPCs
- **Migraciones Versionadas:** Cada cambio estructural -> archivo numerado en `supabase/migrations` siguiendo `AAAAMMDDHHMM__descripcion.sql`.
- **Funciones RPC:** Documentar prop�sito y par�metros en comentarios SQL. Evitar sobrecargas ambiguas.
- **�ndices:** Justificar con queries reales. Evitar duplicados.
- **Refactors de Firma:** Crear nueva funci�n y deprecar la anterior tras actualizar el cliente.

### 5. Estilo Visual y UX
- **Patr�n Visual:** Glassmorphism (blur, transparencias suaves, bordes grandes, gradientes ligeros).
- **Accesibilidad:** Asegurar labels, roles sem�nticos, alt en im�genes y foco visible.
- **Consistencia:** Tipograf�a, espaciado y colores deben provenir del design system.

### 6. Flujo de Git
- **Ramas:** `feature/`, `fix/`, `docs/`, `chore/`, `perf/`.
- **Origen:** Siempre crear ramas desde `main` actualizado.
- **Commits At�micos:** Un �nico prop�sito por commit.
- **Rebase Limpio:** Antes de PR: `git fetch --all && git rebase origin/main`.
- **Evitar Merge Commits Locales:** Preferir rebase para mantener historial lineal.

### 7. Convenci�n de Commits
Formato recomendado (inspirado en Conventional Commits):
```
tipo(scope): mensaje en infinitivo
```
Tipos: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.
Ejemplos:
```
feat(usuarios): agregar filtro por grupo
fix(auth): limpiar cookies expiradas en middleware
docs(contributing): documentar flujo de migraciones
```

### 8. Pull Requests
Checklist previo al PR:
- [ ] Descripci�n clara (qu� + por qu�)
- [ ] Screenshots/GIF si hay cambios visuales
- [ ] Migraciones aplicadas y orden documentado
- [ ] Sin warnings de TypeScript / ESLint
- [ ] Sin `console.log` residuales
- [ ] Sin secretos expuestos
- [ ] Coverage manual b�sico validado
- [ ] Historial de commits limpio

### 9. Manejo de Errores
- **Feedback al Usuario:** Nunca dejar pantallas en blanco; mostrar mensajes claros.
- **Logs con Contexto:** Incluir identificadores relevantes; nunca datos sensibles.
- **Retentativas:** Para operaciones cr�ticas idempotentes.

### 10. Performance
- **B�squedas:** Usar debounce.
- **Memoizaci�n:** Solo si existe costo evidente.
- **Carga Diferida:** Cargar componentes pesados bajo demanda cuando aplicable.

### 11. Compatibilidad de Despliegue
- **Portabilidad:** El c�digo debe funcionar en Vercel (principal), Easypanel u otros proveedores sin cambios espec�ficos.
- **Evitar Vendor?Lock:** No usar APIs propietarias salvo que haya fallback (ejemplo: edge runtime opcional).
- **Variables de Entorno:** Definir en documentaci�n las requeridas y valores ejemplo seguros.
- **Build Determinista:** No introducir pasos manuales no reproducibles.
- **Assets Remotos:** URLs configurables v�a env (`NEXT_PUBLIC_...`) para flexibilidad entre entornos.

### 12. Documentaci�n
- **Actualizaci�n Continua:** Al introducir nuevas rutas, hooks o RPCs, documentarlos en la carpeta `docs/`.
- **Ejemplos de Uso:** Incluir snippets para hooks complejos.

### 13. Idioma
- Todo el c�digo, comentarios y textos de UI deben estar en espa�ol salvo especificaci�n contraria.

### 14. Checklist R�pida antes de Commit
```
pnpm lint
pnpm typecheck (si existe)
Buscar TODO/FIXME
Revisar diff final
```

---
Si algo no est� cubierto aqu�, propone un PR de documentaci�n antes de introducir cambios estructurales mayores.