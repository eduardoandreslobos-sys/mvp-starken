# MVP Starken

Panel público de envíos 2026: **https://mvp-starken.vercel.app**

Muestra volumen, ingresos, cumplimiento de plazos, incidencias, canales y destinos de los
10.000 envíos cargados en Supabase. No muestra datos personales: la API pública solo puede
leer catálogos y las columnas de envíos que no identifican a nadie (ver
`supabase/migrations/20261118153315_lectura_publica_dashboard.sql`).

## Cómo está armado

| Pieza | Dónde |
|---|---|
| Base de datos | Supabase, proyecto `mvp-starken` (São Paulo). Migraciones en `supabase/migrations/` |
| Modelo y carga | `docs/modelo-datos.md` y `scripts/` |
| Dashboard | React 19 + Vite 8 + Tailwind 4 + TanStack Query + Recharts + Motion, en `src/` |
| Publicación | Vercel, conectado a este repositorio: cada push a `main` se publica solo |

## Desarrollo local

```bash
npm install
npm run dev
```

Los datos con información personal (`seed/`, el Excel) nunca se suben a este repositorio.
