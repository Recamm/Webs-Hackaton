# Overlays para Streaming

Dos apps Next.js que funcionan como overlays en tiempo real para OBS. Usan SSE para sincronizar el control con el overlay.

---

## Puntos Web (puerto 3000)

Marcador de puntuaciones en vivo.

| Ruta | Descripción |
|------|-------------|
| `/control` | Agregar/eliminar jugadores, modificar puntos, personalizar estilos |
| `/overlay` | Marcador en tiempo real (capturar en OBS como Browser Source) |

```bash
cd puntos-web
npm install
npm run dev
```

Control: `http://localhost:3000/control` · Overlay: `http://localhost:3000/overlay`

---

## Cronómetro Web (puerto 3001)

Temporizador con cuenta regresiva o progresiva.

| Ruta | Descripción |
|------|-------------|
| `/control` | Iniciar/pausar/reiniciar timer, configurar modo y estilos |
| `/overlay` | Cronómetro en tiempo real (capturar en OBS como Browser Source) |

```bash
cd cronometro-web
npm install
npm run dev
```

Control: `http://localhost:3001/control` · Overlay: `http://localhost:3001/overlay`

---

## Uso en OBS

1. Agregar fuente → **Navegador (Browser Source)**
2. URL: `http://localhost:<puerto>/overlay`
3. Activar fondo transparente
