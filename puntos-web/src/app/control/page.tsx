"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, Player, OverlayStyle } from "@/lib/store";

interface Scene {
  id: string;
  name: string;
  state: GameState;
}

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
  const [authenticated, setAuthenticated] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [overlayUrl, setOverlayUrl] = useState("");
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [uniformColor, setUniformColor] = useState("#00ff88");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneName, setSceneName] = useState("");
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  // Undo/Redo
  const historyRef = useRef<GameState[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback((s: GameState) => {
    if (isUndoRedoRef.current) return;
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    historyRef.current = history.slice(0, idx + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(s)));
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // Auth check
  useEffect(() => {
    const stored = sessionStorage.getItem("control_auth");
    if (stored === "true") {
      setAuthenticated(true);
      setPinRequired(false);
      return;
    }
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!data.required) {
          setAuthenticated(true);
          setPinRequired(false);
        } else {
          setPinRequired(true);
        }
      })
      .catch(() => {
        setAuthenticated(true);
        setPinRequired(false);
      });
  }, []);

  const handlePinSubmit = async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinInput }),
    });
    if (res.ok) {
      setAuthenticated(true);
      sessionStorage.setItem("control_auth", "true");
    } else {
      setPinError("PIN incorrecto");
      setTimeout(() => setPinError(""), 2000);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    setOverlayUrl(`${window.location.origin}/overlay`);
    fetch("/api/state")
      .then((res) => res.json())
      .then((data) => {
        setState(data);
        pushHistory(data);
      });
    fetch("/api/scenes").then((r) => r.json()).then(setScenes).catch(() => {});
  }, [authenticated, pushHistory]);

  const saveState = useCallback(async (newState: GameState) => {
    setState(newState);
    pushHistory(newState);
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newState),
    });
  }, [pushHistory]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prevState = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setState(prevState);
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prevState),
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const nextState = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setState(nextState);
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextState),
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, []);

  // Keyboard shortcuts (Hotkeys + Undo/Redo)
  useEffect(() => {
    if (!authenticated || !state) return;
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Hotkeys for scores (1-9 = +1, Shift+1-9 = -1)
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const playerIndex = num - 1;
        if (state.players[playerIndex]) {
          const delta = e.shiftKey ? -1 : 1;
          const newPlayers = state.players.map((p, i) =>
            i === playerIndex ? { ...p, score: p.score + delta } : p
          );
          const newState = { ...state, players: newPlayers };
          setState(newState);
          pushHistory(newState);
          fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newState),
          });
        }
      }

      // R = Reset scores (with confirmation via double press within 1s)
      if (e.key === "r" || e.key === "R") {
        if (!e.ctrlKey && !e.metaKey) {
          // We'll skip confirmation for hotkey simplicity - user can undo
          const newState = { ...state, players: state.players.map((p) => ({ ...p, score: 0 })) };
          setState(newState);
          pushHistory(newState);
          fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newState),
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authenticated, state, undo, redo, pushHistory]);

  // Scenes
  const saveSceneAction = async () => {
    if (!sceneName.trim()) return;
    const res = await fetch("/api/scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", name: sceneName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setScenes((prev) => [...prev, data.scene]);
      setSceneName("");
    }
  };

  const loadSceneAction = async (id: string) => {
    await fetch("/api/scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", id }),
    });
    const res = await fetch("/api/state");
    const data = await res.json();
    setState(data);
    pushHistory(data);
  };

  const deleteSceneAction = async (id: string) => {
    await fetch("/api/scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setScenes((prev) => prev.filter((s) => s.id !== id));
  };

  const addPlayer = () => {
    if (!state) return;
    const newPlayer: Player = {
      id: generateId(),
      name: `Jugador ${state.players.length + 1}`,
      score: 0,
      color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
      image: "",
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

  const handleImageUpload = (playerId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updatePlayer(playerId, { image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const removePlayerImage = (playerId: string) => {
    updatePlayer(playerId, { image: "" });
  };

  // Drag & Drop handlers
  const handleDragStart = (id: string) => {
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!state || !dragId || dragId === targetId) return;
    const players = [...state.players];
    const fromIndex = players.findIndex((p) => p.id === dragId);
    const toIndex = players.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = players.splice(fromIndex, 1);
    players.splice(toIndex, 0, moved);
    saveState({ ...state, players, manualOrder: true });
    setDragId(null);
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
        setImportMsg("✓ Configuración importada");
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

  if (pinRequired === null) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (pinRequired && !authenticated) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8 w-80 space-y-4">
          <h2 className="text-lg font-semibold text-center">Panel de Control</h2>
          <p className="text-xs text-gray-500 text-center">Ingresa el PIN para acceder</p>
          <input
            type="password"
            maxLength={8}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500/50"
            placeholder="••••"
          />
          {pinError && <p className="text-xs text-red-400 text-center">{pinError}</p>}
          <button
            onClick={handlePinSubmit}
            className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Acceder
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Puntos WEB
            </h1>
            <div className="flex gap-1">
              <button
                onClick={undo}
                title="Deshacer (Ctrl+Z)"
                className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-xs text-gray-400 transition-colors"
              >
                ↶
              </button>
              <button
                onClick={redo}
                title="Rehacer (Ctrl+Y)"
                className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-xs text-gray-400 transition-colors"
              >
                ↷
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-md font-mono truncate max-w-[250px]">
              {overlayUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(overlayUrl)}
              className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-300"
            >
              Copiar URL
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Preview */}
        <section className="rounded-xl bg-white/[0.02] border border-white/5 p-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-4">
            Vista previa
          </h2>
          <div className="relative w-full overflow-hidden rounded-lg bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#111_0%_50%)] bg-[length:16px_16px]" style={{ height: "220px" }}>
            <iframe
              src="/overlay"
              className="absolute top-0 left-0 border-0"
              style={{
                width: "1920px",
                height: "1080px",
                transform: "scale(0.35)",
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Players & Config */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Título</h2>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => saveState({ ...state, title: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors"
                />
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.showTitle}
                    onChange={(e) => saveState({ ...state, showTitle: e.target.checked })}
                    className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  Mostrar
                </label>
              </div>
            </section>

            {/* Players */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-300">
                  Jugadores <span className="text-gray-600">({state.players.length})</span>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={resetScores}
                    className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-400"
                  >
                    Reset puntos
                  </button>
                  <button
                    onClick={addPlayer}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Manual Order Toggle */}
              <div className="flex items-center justify-between mb-3 bg-white/[0.03] rounded-lg p-3">
                <div>
                  <label className="text-xs text-gray-500">Orden manual (drag & drop)</label>
                  <p className="text-[10px] text-gray-600">Si está activo, el overlay respeta el orden de aquí</p>
                </div>
                <input
                  type="checkbox"
                  checked={state.manualOrder ?? false}
                  onChange={(e) => saveState({ ...state, manualOrder: e.target.checked })}
                  className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                />
              </div>

              {/* Uniform color */}
              <div className="flex items-center gap-3 mb-4 bg-white/[0.03] rounded-lg p-3">
                <span className="text-xs text-gray-500">Color uniforme:</span>
                <input
                  type="color"
                  value={uniformColor}
                  onChange={(e) => setUniformColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
                <button
                  onClick={() => setAllPlayersColor(uniformColor)}
                  className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md text-xs text-gray-400 transition-colors"
                >
                  Aplicar a todos
                </button>
              </div>

              <div className="space-y-2">
                {state.players.map((player, index) => (
                  <div
                    key={player.id}
                    draggable={state.manualOrder}
                    onDragStart={() => handleDragStart(player.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(player.id)}
                    className={`bg-white/[0.03] rounded-lg p-3 group hover:bg-white/[0.05] transition-colors ${state.manualOrder ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {state.manualOrder && (
                        <span className="text-gray-600 text-xs cursor-grab">⠿</span>
                      )}
                      <span className="text-gray-600 font-mono text-xs w-5">
                        {index + 1}
                      </span>
                      <input
                        type="color"
                        value={player.color}
                        onChange={(e) => updatePlayer(player.id, { color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateScore(player.id, -1)}
                          className="w-7 h-7 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-sm font-bold transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={player.score}
                          onChange={(e) => updatePlayer(player.id, { score: parseInt(e.target.value) || 0 })}
                          className="w-14 text-center bg-white/5 border border-white/10 rounded-md py-1.5 text-sm text-white font-medium focus:outline-none focus:border-white/20"
                        />
                        <button
                          onClick={() => updateScore(player.id, 1)}
                          className="w-7 h-7 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md text-sm font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all text-sm"
                      >
                        ×
                      </button>
                    </div>
                    {/* Image upload */}
                    <div className="flex items-center gap-3 mt-2 ml-8">
                      {player.image ? (
                        <div className="flex items-center gap-2">
                          <img src={player.image} alt="" className="w-6 h-6 rounded object-cover" />
                          <button
                            onClick={() => removePlayerImage(player.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            Quitar imagen
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-xs text-gray-500 hover:text-gray-400 transition-colors">
                          + Subir imagen
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(player.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
                {state.players.length === 0 && (
                  <div className="text-center text-gray-600 py-8 text-sm">
                    No hay jugadores. Agrega uno para comenzar.
                  </div>
                )}
              </div>
            </section>

            {/* Export / Import */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Exportar / Importar</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-md text-xs font-medium transition-colors text-gray-400"
                  >
                    Exportar config
                  </button>
                </div>
                {exportCode && (
                  <div>
                    <textarea
                      readOnly
                      value={exportCode}
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono resize-none focus:outline-none"
                    />
                    <p className="text-xs text-emerald-400/80 mt-1">Copiado al portapapeles</p>
                  </div>
                )}
                <div>
                  <div className="flex gap-2">
                    <textarea
                      value={importCode}
                      onChange={(e) => setImportCode(e.target.value)}
                      placeholder="Pegar código para importar..."
                      className="flex-1 h-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono resize-none placeholder-gray-600 focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={handleImport}
                      className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-md text-xs font-medium transition-colors text-gray-400 self-end"
                    >
                      Importar
                    </button>
                  </div>
                  {importMsg && (
                    <p className={`text-xs mt-1 ${importMsg.startsWith("✓") ? "text-emerald-400/80" : "text-red-400/80"}`}>
                      {importMsg}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Hotkeys */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <button
                onClick={() => setShowHotkeys(!showHotkeys)}
                className="flex items-center justify-between w-full"
              >
                <h2 className="text-sm font-medium text-gray-300">Atajos de teclado</h2>
                <span className="text-xs text-gray-500">{showHotkeys ? "▲" : "▼"}</span>
              </button>
              {showHotkeys && (
                <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                  <div className="flex justify-between"><span>1-9</span><span className="text-gray-500">+1 punto al jugador N</span></div>
                  <div className="flex justify-between"><span>Shift + 1-9</span><span className="text-gray-500">-1 punto al jugador N</span></div>
                  <div className="flex justify-between"><span>R</span><span className="text-gray-500">Reset puntos (Ctrl+Z para deshacer)</span></div>
                  <div className="flex justify-between"><span>Ctrl+Z</span><span className="text-gray-500">Deshacer</span></div>
                  <div className="flex justify-between"><span>Ctrl+Y</span><span className="text-gray-500">Rehacer</span></div>
                </div>
              )}
            </section>

            {/* Scenes */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Escenas</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sceneName}
                    onChange={(e) => setSceneName(e.target.value)}
                    placeholder="Nombre de la escena..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
                  />
                  <button
                    onClick={saveSceneAction}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-md text-xs font-medium transition-colors"
                  >
                    Guardar
                  </button>
                </div>
                {scenes.length > 0 && (
                  <div className="space-y-2">
                    {scenes.map((scene) => (
                      <div key={scene.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2.5">
                        <span className="flex-1 text-sm text-gray-300 truncate">{scene.name}</span>
                        <button
                          onClick={() => loadSceneAction(scene.id)}
                          className="bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 px-2.5 py-1 rounded text-xs text-gray-400 transition-colors"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => deleteSceneAction(scene.id)}
                          className="bg-white/5 hover:bg-red-500/15 hover:text-red-400 px-2 py-1 rounded text-xs text-gray-400 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {scenes.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-2">No hay escenas guardadas</p>
                )}
              </div>
            </section>
          </div>

          {/* Right: Styles */}
          <div className="space-y-6">
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-4">Estilo</h2>
              <div className="space-y-4">
                {/* Font Preset */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Fuente</label>
                  <select
                    value={state.style.customFont ? "" : state.style.fontFamily}
                    onChange={(e) => updateStyle({ fontFamily: e.target.value, customFont: "" })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
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
                  <label className="text-xs text-gray-500 block mb-1.5">Google Font personalizada</label>
                  <input
                    type="text"
                    value={state.style.customFont}
                    onChange={(e) => updateStyle({ customFont: e.target.value })}
                    placeholder="Ej: Montserrat, Poppins..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">
                    Nombre exacto de{" "}
                    <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-400">
                      fonts.google.com
                    </a>
                  </p>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Tamaño texto <span className="text-gray-600">{state.style.fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={state.style.fontSize}
                    onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Image Size */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Tamaño imagen <span className="text-gray-600">{state.style.imageSize || 48}px</span>
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="200"
                    value={state.style.imageSize || 48}
                    onChange={(e) => updateStyle({ imageSize: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Texto</label>
                    <input
                      type="color"
                      value={state.style.textColor}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Acento</label>
                    <input
                      type="color"
                      value={state.style.accentColor}
                      onChange={(e) => updateStyle({ accentColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                </div>

                {/* Background */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Fondo contenedor</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={state.style.backgroundColor.startsWith("#") ? state.style.backgroundColor : "#000000"}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-white/5 shrink-0"
                    />
                    <input
                      type="text"
                      value={state.style.backgroundColor}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
                      placeholder="rgba(0,0,0,0.8)"
                    />
                  </div>
                </div>

                {/* Card Background */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Fondo tarjetas</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={state.style.cardBackground.startsWith("#") ? state.style.cardBackground : "#1e1e1e"}
                      onChange={(e) => updateStyle({ cardBackground: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-white/5 shrink-0"
                    />
                    <input
                      type="text"
                      value={state.style.cardBackground}
                      onChange={(e) => updateStyle({ cardBackground: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
                      placeholder="rgba(30,30,30,0.9)"
                    />
                  </div>
                </div>

                {/* Layout */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Disposición</label>
                  <select
                    value={state.style.layout}
                    onChange={(e) => updateStyle({ layout: e.target.value as OverlayStyle["layout"] })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="grid">Grilla</option>
                  </select>
                </div>

                {/* Border Radius */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Radio <span className="text-gray-600">{state.style.borderRadius}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={state.style.borderRadius}
                    onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Border */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">Borde</label>
                  <input
                    type="checkbox"
                    checked={state.style.showBorder}
                    onChange={(e) => updateStyle({ showBorder: e.target.checked })}
                    className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                  />
                </div>
                {state.style.showBorder && (
                  <div>
                    <input
                      type="color"
                      value={state.style.borderColor}
                      onChange={(e) => updateStyle({ borderColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                )}

                {/* Gap */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Separación <span className="text-gray-600">{state.style.gap}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={state.style.gap}
                    onChange={(e) => updateStyle({ gap: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Padding */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Padding <span className="text-gray-600">{state.style.padding}px</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    value={state.style.padding}
                    onChange={(e) => updateStyle({ padding: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Animation */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Animación</label>
                  <select
                    value={state.style.animation}
                    onChange={(e) => updateStyle({ animation: e.target.value as OverlayStyle["animation"] })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="none">Ninguna</option>
                    <option value="pulse">Pulso</option>
                    <option value="slide">Deslizar</option>
                    <option value="glow">Brillo</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Mostrar puntaje</label>
                    <input
                      type="checkbox"
                      checked={state.style.showScore}
                      onChange={(e) => updateStyle({ showScore: e.target.checked })}
                      className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Mostrar posición</label>
                    <input
                      type="checkbox"
                      checked={state.style.showPosition}
                      onChange={(e) => updateStyle({ showPosition: e.target.checked })}
                      className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Tamaño uniforme</label>
                    <input
                      type="checkbox"
                      checked={state.style.uniformCardSize}
                      onChange={(e) => updateStyle({ uniformCardSize: e.target.checked })}
                      className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                    />
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Posición</label>
                  <select
                    value={state.style.position || "top-center"}
                    onChange={(e) => updateStyle({ position: e.target.value as OverlayStyle["position"] })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="top-left">Arriba Izquierda</option>
                    <option value="top-center">Arriba Centro</option>
                    <option value="top-right">Arriba Derecha</option>
                    <option value="center-left">Centro Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="center-right">Centro Derecha</option>
                    <option value="bottom-left">Abajo Izquierda</option>
                    <option value="bottom-center">Abajo Centro</option>
                    <option value="bottom-right">Abajo Derecha</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
