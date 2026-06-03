"use client";

import { useState, useEffect, useCallback } from "react";
import { GameState, Player, OverlayStyle } from "@/lib/store";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const FONT_OPTIONS = [
  "'Orbitron', sans-serif",
  "'Press Start 2P', cursive",
  "'Russo One', sans-serif",
  "'Bebas Neue', sans-serif",
  "'Rajdhani', sans-serif",
  "'Audiowide', cursive",
  "'Exo 2', sans-serif",
  "'Chakra Petch', sans-serif",
];

const PLAYER_COLORS = [
  "#00ff88",
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

export default function ControlPanel() {
  const [state, setState] = useState<GameState | null>(null);
  const [overlayUrl, setOverlayUrl] = useState("");
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [uniformColor, setUniformColor] = useState("#00ff88");

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}/overlay`);
    fetch("/api/state")
      .then((res) => res.json())
      .then(setState);
  }, []);

  const saveState = useCallback(
    async (newState: GameState) => {
      setState(newState);
      await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState),
      });
    },
    []
  );

  const addPlayer = () => {
    if (!state) return;
    const newPlayer: Player = {
      id: generateId(),
      name: `Jugador ${state.players.length + 1}`,
      score: 0,
      color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
    };
    saveState({ ...state, players: [...state.players, newPlayer] });
  };

  const removePlayer = (id: string) => {
    if (!state) return;
    saveState({ ...state, players: state.players.filter((p) => p.id !== id) });
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    if (!state) return;
    saveState({
      ...state,
      players: state.players.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const updateScore = (id: string, delta: number) => {
    if (!state) return;
    saveState({
      ...state,
      players: state.players.map((p) =>
        p.id === id ? { ...p, score: p.score + delta } : p
      ),
    });
  };

  const updateStyle = (updates: Partial<OverlayStyle>) => {
    if (!state) return;
    saveState({ ...state, style: { ...state.style, ...updates } });
  };

  const resetScores = () => {
    if (!state) return;
    saveState({
      ...state,
      players: state.players.map((p) => ({ ...p, score: 0 })),
    });
  };

  const setAllPlayersColor = (color: string) => {
    if (!state) return;
    saveState({
      ...state,
      players: state.players.map((p) => ({ ...p, color })),
    });
  };

  const handleExport = () => {
    if (!state) return;
    const code = btoa(JSON.stringify(state));
    setExportCode(code);
    navigator.clipboard.writeText(code);
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    try {
      const decoded = JSON.parse(atob(importCode.trim()));
      if (decoded && decoded.style && Array.isArray(decoded.players)) {
        saveState(decoded);
        setImportMsg("✓ Configuración importada correctamente");
        setImportCode("");
        setTimeout(() => setImportMsg(""), 3000);
      } else {
        setImportMsg("✗ Código inválido");
        setTimeout(() => setImportMsg(""), 3000);
      }
    } catch {
      setImportMsg("✗ Código inválido o corrupto");
      setTimeout(() => setImportMsg(""), 3000);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            🎮 Puntos WEB - Control
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg font-mono truncate max-w-[300px]">
              {overlayUrl}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(overlayUrl)}
              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Copiar URL Overlay
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Jugadores */}
        <div className="lg:col-span-2 space-y-6">
          {/* Título */}
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Título del Overlay</h2>
            <div className="flex gap-4 items-center">
              <input
                type="text"
                value={state.title}
                onChange={(e) => saveState({ ...state, title: e.target.value })}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={state.showTitle}
                  onChange={(e) =>
                    saveState({ ...state, showTitle: e.target.checked })
                  }
                  className="rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
                Mostrar
              </label>
            </div>
          </section>

          {/* Jugadores */}
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Jugadores ({state.players.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={resetScores}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Reset Puntos
                </button>
                <button
                  onClick={addPlayer}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Agregar Jugador
                </button>
              </div>
            </div>
            {/* Uniform color */}
            <div className="flex items-center gap-3 mb-4 bg-gray-800/50 rounded-lg p-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Mismo color a todos:</label>
              <input
                type="color"
                value={uniformColor}
                onChange={(e) => setUniformColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <button
                onClick={() => setAllPlayersColor(uniformColor)}
                className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Aplicar a todos
              </button>
            </div>

            <div className="space-y-3">
              {state.players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 group"
                >
                  <span className="text-gray-500 font-mono text-sm w-6">
                    #{index + 1}
                  </span>
                  <input
                    type="color"
                    value={player.color}
                    onChange={(e) =>
                      updatePlayer(player.id, { color: e.target.value })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) =>
                      updatePlayer(player.id, { name: e.target.value })
                    }
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateScore(player.id, -1)}
                      className="w-8 h-8 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg font-bold transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={player.score}
                      onChange={(e) =>
                        updatePlayer(player.id, {
                          score: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16 text-center bg-gray-700 border border-gray-600 rounded-lg py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => updateScore(player.id, 1)}
                      className="w-8 h-8 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
              {state.players.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No hay jugadores. Agrega uno para comenzar.
                </div>
              )}
            </div>
          </section>

          {/* Export / Import */}
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">
              Exportar / Importar Configuración
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  onClick={handleExport}
                  className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📋 Exportar (copiar código)
                </button>
                {exportCode && (
                  <div className="mt-2">
                    <textarea
                      readOnly
                      value={exportCode}
                      className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono resize-none focus:outline-none"
                    />
                    <p className="text-xs text-emerald-400 mt-1">✓ Código copiado al portapapeles</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Pegar código para importar:
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="Pega aquí el código exportado..."
                    className="flex-1 h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono resize-none focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleImport}
                    className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors self-end"
                  >
                    Importar
                  </button>
                </div>
                {importMsg && (
                  <p className={`text-xs mt-1 ${importMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                    {importMsg}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Panel Estilos */}
        <div className="space-y-6">
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">
              Estilo del Overlay
            </h2>
            <div className="space-y-4">
              {/* Font Preset */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fuente predefinida</label>
                <select
                  value={state.style.customFont ? "" : state.style.fontFamily}
                  onChange={(e) => {
                    updateStyle({ fontFamily: e.target.value, customFont: "" });
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>
                      {font.replace(/'/g, "").split(",")[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Google Font */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Google Font personalizada
                </label>
                <input
                  type="text"
                  value={state.style.customFont}
                  onChange={(e) => updateStyle({ customFont: e.target.value })}
                  placeholder="Ej: Roboto, Montserrat, Poppins..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Escribí el nombre exacto de{" "}
                  <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    fonts.google.com
                  </a>
                  . Deja vacío para usar la predefinida.
                </p>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Tamaño: {state.style.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={state.style.fontSize}
                  onChange={(e) =>
                    updateStyle({ fontSize: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Color texto
                  </label>
                  <input
                    type="color"
                    value={state.style.textColor}
                    onChange={(e) => updateStyle({ textColor: e.target.value })}
                    className="w-full h-9 rounded-lg cursor-pointer bg-gray-800 border border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Acento
                  </label>
                  <input
                    type="color"
                    value={state.style.accentColor}
                    onChange={(e) =>
                      updateStyle({ accentColor: e.target.value })
                    }
                    className="w-full h-9 rounded-lg cursor-pointer bg-gray-800 border border-gray-700"
                  />
                </div>
              </div>

              {/* Background general */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Fondo general (contenedor)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={state.style.backgroundColor.startsWith("#") ? state.style.backgroundColor : "#000000"}
                    onChange={(e) =>
                      updateStyle({ backgroundColor: e.target.value })
                    }
                    className="w-9 h-9 rounded-lg cursor-pointer border border-gray-700 bg-gray-800 shrink-0"
                  />
                  <input
                    type="text"
                    value={state.style.backgroundColor}
                    onChange={(e) =>
                      updateStyle({ backgroundColor: e.target.value })
                    }
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="rgba(0, 0, 0, 0.8) o #000000"
                  />
                </div>
              </div>

              {/* Card Background */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Fondo de rectángulos (tarjetas)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={state.style.cardBackground.startsWith("#") ? state.style.cardBackground : "#1e1e1e"}
                    onChange={(e) =>
                      updateStyle({ cardBackground: e.target.value })
                    }
                    className="w-9 h-9 rounded-lg cursor-pointer border border-gray-700 bg-gray-800 shrink-0"
                  />
                  <input
                    type="text"
                    value={state.style.cardBackground}
                    onChange={(e) =>
                      updateStyle({ cardBackground: e.target.value })
                    }
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="rgba(30, 30, 30, 0.9) o #1e1e1e"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Usa el picker o escribe rgba/hex a mano</p>
              </div>

              {/* Layout */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Disposición
                </label>
                <select
                  value={state.style.layout}
                  onChange={(e) =>
                    updateStyle({
                      layout: e.target.value as OverlayStyle["layout"],
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="grid">Grilla</option>
                </select>
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Radio bordes: {state.style.borderRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={state.style.borderRadius}
                  onChange={(e) =>
                    updateStyle({ borderRadius: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Border */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Mostrar borde</label>
                <input
                  type="checkbox"
                  checked={state.style.showBorder}
                  onChange={(e) =>
                    updateStyle({ showBorder: e.target.checked })
                  }
                  className="rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {state.style.showBorder && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Color borde
                  </label>
                  <input
                    type="color"
                    value={state.style.borderColor}
                    onChange={(e) =>
                      updateStyle({ borderColor: e.target.value })
                    }
                    className="w-full h-9 rounded-lg cursor-pointer bg-gray-800 border border-gray-700"
                  />
                </div>
              )}

              {/* Gap */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Separación: {state.style.gap}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={state.style.gap}
                  onChange={(e) =>
                    updateStyle({ gap: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Padding */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Padding: {state.style.padding}px
                </label>
                <input
                  type="range"
                  min="4"
                  max="48"
                  value={state.style.padding}
                  onChange={(e) =>
                    updateStyle({ padding: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Animation */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Animación
                </label>
                <select
                  value={state.style.animation}
                  onChange={(e) =>
                    updateStyle({
                      animation: e.target.value as OverlayStyle["animation"],
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="none">Sin animación</option>
                  <option value="pulse">Pulso</option>
                  <option value="slide">Deslizar</option>
                  <option value="glow">Brillo</option>
                </select>
              </div>

              {/* Show options */}
              <div className="space-y-2 pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">
                    Mostrar puntaje
                  </label>
                  <input
                    type="checkbox"
                    checked={state.style.showScore}
                    onChange={(e) =>
                      updateStyle({ showScore: e.target.checked })
                    }
                    className="rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">
                    Mostrar posición
                  </label>
                  <input
                    type="checkbox"
                    checked={state.style.showPosition}
                    onChange={(e) =>
                      updateStyle({ showPosition: e.target.checked })
                    }
                    className="rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
