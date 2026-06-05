# Puntos Web

Marcador de puntuación en tiempo real para overlays de streaming (OBS, Streamlabs). Permite gestionar jugadores y puntuaciones desde un panel web y mostrar un overlay transparente que se actualiza al instante vía SSE.

## Funcionalidades

- Agregar/eliminar/reordenar jugadores (drag & drop)
- Modificar puntuaciones (+/- con botones o hotkeys)
- Personalización visual total: fuentes Google, colores, layouts (horizontal/vertical/grid), posición, bordes, animaciones, opacidad, imágenes por jugador
- Sistema de escenas (guardar/cargar/eliminar configuraciones)
- Undo/Redo (Ctrl+Z / Ctrl+Y, historial de 50 estados)
- Hotkeys: 1-9 para +1 punto, Shift+1-9 para -1, R para reset
- Export/import de configuración (código base64)
- Protección por PIN opcional

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
- Estado in-memory (sin base de datos)

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Redirect a `/control` |
| `/control` | Panel de control — jugadores, puntos, estilos, escenas |
| `/overlay` | Overlay transparente para OBS (Browser Source) |

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth` | GET | Devuelve si se requiere PIN |
| `/api/auth` | POST | Valida el PIN |
| `/api/state` | GET | Estado actual del juego |
| `/api/state` | PUT | Actualiza estado completo y notifica overlays |
| `/api/stream` | GET | SSE — estado inicial + updates en tiempo real |
| `/api/scenes` | GET | Lista escenas guardadas |
| `/api/scenes` | POST | Save/load/delete escenas |

## Arquitectura

```mermaid
flowchart LR
    A[/control] -->|PUT /api/state| B[In-Memory Store]
    B -->|SSE /api/stream| C[/overlay]
```

El store vive en `globalThis.__puntosStore` (sobrevive hot-reload). Cuando el estado cambia, se notifica a todos los clientes SSE conectados con el nuevo estado completo.

## Variables de entorno

```env
# PIN de 4 dígitos para proteger el panel de control (dejar vacío para acceso libre)
CONTROL_PIN=
```

## Instalación

```bash
cd puntos-web
npm install
npm run dev      # http://localhost:3000
```

## Uso en OBS

1. Agregar fuente → **Navegador (Browser Source)**
2. URL: `http://localhost:3000/overlay`
3. Activar fondo transparente
