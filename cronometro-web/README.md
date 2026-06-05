# Cronómetro Web

Temporizador en tiempo real para overlays de streaming (OBS, Streamlabs). Permite controlar un timer remotamente desde un panel de control y mostrarlo como overlay con fondo transparente.

## Funcionalidades

- Timer en modo **countup** (cronómetro) o **countdown** (cuenta atrás)
- Controles: start, pause, reset
- Estilización completa: fuentes Google, colores, glow, sombras, animaciones, bordes, opacidad
- Título configurable con posición y dirección de layout
- Sistema de escenas (guardar/cargar configuraciones)
- Alerta visual cuando el countdown llega a 0
- Export/import de configuración (JSON)
- Protección por PIN opcional
- Undo/Redo (Ctrl+Z / Ctrl+Y)

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
| `/control` | Panel de control — start/pause/reset, estilos, modo, escenas |
| `/overlay` | Vista para OBS (fondo transparente) |
| `/viewer` | Vista espectador (fondo oscuro) |

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth` | GET | Devuelve si se requiere PIN |
| `/api/auth` | POST | Valida el PIN |
| `/api/state` | GET | Estado actual del timer |
| `/api/state` | PUT | Actualiza estado (start, pause, reset, updateStyle) |
| `/api/stream` | GET | SSE — estado inicial + updates en tiempo real |
| `/api/scenes` | GET | Lista escenas guardadas |
| `/api/scenes` | POST | Save/load/delete escenas |

## Arquitectura

```mermaid
flowchart LR
    A[/control] -->|PUT /api/state| B[In-Memory Store]
    B -->|SSE /api/stream| C[/overlay]
    B -->|SSE /api/stream| D[/viewer]
```

El store vive en `globalThis.__cronometroStore` (sobrevive hot-reload). El timer tickea server-side cada 50ms calculando el elapsed real. Los clientes (overlay/viewer) hacen interpolación local a ~30fps para renderizado fluido.

## Variables de entorno

```env
# PIN de 4 dígitos para proteger el panel de control (dejar vacío para acceso libre)
CONTROL_PIN=
```

## Instalación

```bash
cd cronometro-web
npm install
npm run dev      # http://localhost:3001
```

## Uso en OBS

1. Agregar fuente → **Navegador (Browser Source)**
2. URL: `http://localhost:3001/overlay`
3. Activar fondo transparente
