# Overlays para Streaming

Dos apps Next.js que funcionan como overlays en tiempo real para OBS. Usan SSE (Server-Sent Events) para sincronizar el panel de control con el overlay en tiempo real.

## Proyectos

| Proyecto | Puerto | Descripción |
|----------|--------|-------------|
| [puntos-web](./puntos-web/) | 3000 | Marcador de puntuaciones en vivo |
| [cronometro-web](./cronometro-web/) | 3001 | Temporizador con cuenta regresiva o progresiva |

## Inicio rápido

```bash
# Puntos
cd puntos-web && npm install && npm run dev

# Cronómetro
cd cronometro-web && npm install && npm run dev
```

## Documentación

- [**puntos-web/README.md**](./puntos-web/README.md) — Marcador de puntuaciones
- [**cronometro-web/README.md**](./cronometro-web/README.md) — Cronómetro/Temporizador
