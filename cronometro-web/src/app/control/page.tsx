"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TimerStyle {
  fontFamily: string;
  customFont: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  borderRadius: number;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  padding: number;
  shadowColor: string;
  shadowBlur: number;
  showMilliseconds: boolean;
  separatorChar: string;
  letterSpacing: number;
  fontWeight: string;
  textShadowColor: string;
  textShadowBlur: number;
  glowEffect: boolean;
  glowColor: string;
  glowIntensity: number;
  animation: "none" | "pulse" | "glow" | "bounce";
  format: "hh:mm:ss" | "mm:ss" | "ss" | "hh:mm:ss.ms" | "mm:ss.ms";
}

type TimerMode = "countup" | "countdown";
type TimerStatus = "stopped" | "running" | "paused";

interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  currentMs: number;
  countdownFrom: number;
  startedAt: number | null;
  style: TimerStyle;
  title: string;
  showTitle: boolean;
  titleFontSize: number;
  titleColor: string;
  titleGap: number;
  layoutDirection: "column" | "column-reverse" | "row" | "row-reverse";
  layoutCenter: boolean;
  countdownAlert: boolean;
  countdownAlertStyle: "flash" | "blink" | "none";
}

interface Scene {
  id: string;
  name: string;
  state: TimerState;
}

const FONT_OPTIONS = [
  "'Orbitron', sans-serif",
  "'Press Start 2P', cursive",
  "'Roboto Mono', monospace",
  "'Bebas Neue', sans-serif",
  "'Russo One', sans-serif",
  "'Audiowide', cursive",
  "'Exo 2', sans-serif",
  "'Chakra Petch', sans-serif",
];

function formatTime(ms: number, format: string, separator: string): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((Math.abs(ms) % 1000) / 10);

  const pad = (n: number) => n.toString().padStart(2, "0");

  switch (format) {
    case "hh:mm:ss":
      return `${pad(hours)}${separator}${pad(minutes)}${separator}${pad(seconds)}`;
    case "mm:ss":
      return `${pad(hours * 60 + minutes)}${separator}${pad(seconds)}`;
    case "ss":
      return `${totalSeconds}`;
    case "hh:mm:ss.ms":
      return `${pad(hours)}${separator}${pad(minutes)}${separator}${pad(seconds)}.${pad(millis)}`;
    case "mm:ss.ms":
      return `${pad(hours * 60 + minutes)}${separator}${pad(seconds)}.${pad(millis)}`;
    default:
      return `${pad(minutes)}${separator}${pad(seconds)}`;
  }
}

export default function ControlPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [state, setState] = useState<TimerState | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState(5);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneName, setSceneName] = useState("");

  // Undo/Redo
  const historyRef = useRef<TimerState[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback((s: TimerState) => {
    if (isUndoRedoRef.current) return;
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    // Remove future states if we branched
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
    setViewerUrl(`${window.location.origin}/viewer`);
    fetch("/api/state")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        pushHistory(data);
        const totalSec = Math.floor(data.countdownFrom / 1000);
        setCountdownMinutes(Math.floor(totalSec / 60));
        setCountdownSeconds(totalSec % 60);
      });
    fetch("/api/scenes").then((r) => r.json()).then(setScenes).catch(() => {});

    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      setState(JSON.parse(e.data));
    };
    return () => es.close();
  }, [authenticated, pushHistory]);

  const sendAction = useCallback(async (body: Record<string, unknown>) => {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }, []);

  const updateStyle = useCallback(
    (partial: Partial<TimerStyle>) => {
      if (!state) return;
      const newStyle = { ...state.style, ...partial };
      pushHistory({ ...state, style: newStyle });
      sendAction({ action: "updateStyle", style: newStyle });
    },
    [state, sendAction, pushHistory]
  );

  const updateState = useCallback(
    (partial: Partial<TimerState>) => {
      if (!state) return;
      const newState = { ...state, ...partial };
      pushHistory(newState);
      sendAction(newState);
    },
    [state, sendAction, pushHistory]
  );

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prevState = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setState(prevState);
    sendAction(prevState as unknown as Record<string, unknown>);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [sendAction]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const nextState = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setState(nextState);
    sendAction(nextState as unknown as Record<string, unknown>);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [sendAction]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

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

  const handleExport = () => {
    if (!state) return;
    const config = JSON.stringify({
      style: state.style,
      title: state.title,
      showTitle: state.showTitle,
      titleFontSize: state.titleFontSize,
      titleColor: state.titleColor,
      titleGap: state.titleGap,
      layoutDirection: state.layoutDirection,
      layoutCenter: state.layoutCenter,
      mode: state.mode,
      countdownFrom: state.countdownFrom,
    });
    const code = btoa(config);
    setExportCode(code);
    navigator.clipboard.writeText(code);
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    try {
      const decoded = JSON.parse(atob(importCode.trim()));
      if (decoded.style) {
        const newState = { ...state, ...decoded };
        sendAction(newState);
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

  const effectiveFont = state.style.customFont
    ? `'${state.style.customFont}', sans-serif`
    : state.style.fontFamily;

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Cronómetro WEB
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-md font-mono truncate max-w-[200px]">
              {overlayUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(overlayUrl)}
              className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-300"
            >
              Copiar
            </button>
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-md font-mono truncate max-w-[200px]">
              {viewerUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(viewerUrl)}
              className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-300"
            >
              Copiar
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
          <div className="flex justify-center items-center min-h-[140px] bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#111_0%_50%)] bg-[length:16px_16px] rounded-lg p-6">
            <div
              style={{
                backgroundColor: state.style.backgroundColor,
                borderRadius: `${state.style.borderRadius}px`,
                border: state.style.showBorder
                  ? `${state.style.borderWidth}px solid ${state.style.borderColor}`
                  : "none",
                padding: `${state.style.padding}px`,
                opacity: state.style.opacity / 100,
                boxShadow: state.style.shadowBlur > 0
                  ? `0 0 ${state.style.shadowBlur}px ${state.style.shadowColor}`
                  : "none",
                display: "flex",
                flexDirection: state.layoutDirection ?? "column",
                alignItems: (state.layoutCenter ?? true) ? "center" : "stretch",
                justifyContent: (state.layoutCenter ?? true) ? "center" : "flex-start",
                gap: `${state.titleGap ?? 8}px`,
              }}
            >
              {state.showTitle && (
                <div
                  style={{
                    fontSize: `${state.titleFontSize}px`,
                    color: state.titleColor,
                    textAlign: "center",
                    fontFamily: effectiveFont,
                  }}
                >
                  {state.title}
                </div>
              )}
              <div
                style={{
                  fontFamily: effectiveFont,
                  fontSize: `${state.style.fontSize}px`,
                  color: state.style.textColor,
                  fontWeight: state.style.fontWeight,
                  letterSpacing: `${state.style.letterSpacing}px`,
                  textShadow: state.style.glowEffect
                    ? `0 0 ${state.style.textShadowBlur}px ${state.style.textShadowColor}, 0 0 ${state.style.glowIntensity}px ${state.style.glowColor}`
                    : "none",
                  textAlign: "center",
                }}
              >
                {formatTime(state.currentMs, state.style.format, state.style.separatorChar)}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer Controls */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-4">Controles</h2>

              {/* Mode */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-2">Modo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateState({ mode: "countup" })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      state.mode === "countup"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Cuenta arriba
                  </button>
                  <button
                    onClick={() => updateState({ mode: "countdown" })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      state.mode === "countdown"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Cuenta atrás
                  </button>
                </div>
              </div>

              {/* Countdown config */}
              {state.mode === "countdown" && (
                <div className="mb-4 p-3 bg-white/[0.03] rounded-lg space-y-3">
                  <label className="text-xs text-gray-500 block mb-2">Tiempo inicial</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={countdownMinutes}
                      onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                      className="w-16 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-center text-white focus:outline-none focus:border-white/20"
                    />
                    <span className="text-xs text-gray-500">min</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={countdownSeconds}
                      onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                      className="w-16 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-center text-white focus:outline-none focus:border-white/20"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                    <button
                      onClick={() => {
                        const ms = (countdownMinutes * 60 + countdownSeconds) * 1000;
                        updateState({ countdownFrom: ms });
                      }}
                      className="ml-auto bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-400"
                    >
                      Aplicar
                    </button>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Presets</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 3, 5, 10, 15, 30].map((min) => (
                        <button
                          key={min}
                          onClick={() => {
                            const ms = min * 60 * 1000;
                            setCountdownMinutes(min);
                            setCountdownSeconds(0);
                            updateState({ countdownFrom: ms });
                          }}
                          className="bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-400 border border-white/10 hover:border-emerald-500/30"
                        >
                          {min} min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Countdown Alert */}
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500">Alerta al finalizar</label>
                      <input
                        type="checkbox"
                        checked={state.countdownAlert ?? true}
                        onChange={(e) => updateState({ countdownAlert: e.target.checked })}
                        className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                      />
                    </div>
                    {(state.countdownAlert ?? true) && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Estilo de alerta</label>
                        <select
                          value={state.countdownAlertStyle ?? "flash"}
                          onChange={(e) => updateState({ countdownAlertStyle: e.target.value as "flash" | "blink" | "none" })}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20"
                        >
                          <option value="flash">Flash rojo</option>
                          <option value="blink">Parpadeo</option>
                          <option value="none">Sin animación</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mb-4">
                {state.status !== "running" ? (
                  <button
                    onClick={() => sendAction({ action: "start" })}
                    className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-3 px-6 rounded-lg font-semibold text-sm transition-colors"
                  >
                    ▶ Iniciar
                  </button>
                ) : (
                  <button
                    onClick={() => sendAction({ action: "pause" })}
                    className="flex-1 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 py-3 px-6 rounded-lg font-semibold text-sm transition-colors"
                  >
                    ⏸ Pausar
                  </button>
                )}
                <button
                  onClick={() => sendAction({ action: "reset" })}
                  className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 py-3 px-6 rounded-lg font-semibold text-sm transition-colors"
                >
                  ⏹ Reset
                </button>
              </div>

              {/* Current time */}
              <div className="text-center p-4 bg-white/[0.03] rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Tiempo actual</div>
                <div className="text-2xl font-mono text-emerald-400">
                  {formatTime(state.currentMs, state.style.format, state.style.separatorChar)}
                </div>
                <div className="text-[10px] text-gray-600 mt-1">
                  {state.status === "running" ? "● Corriendo" : state.status === "paused" ? "● Pausado" : "● Detenido"}
                </div>
              </div>
            </section>

            {/* Title config */}
            <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Título</h2>
              <div className="flex gap-3 items-center mb-3">
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => updateState({ title: e.target.value })}
                  placeholder="Título del timer..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors"
                />
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.showTitle}
                    onChange={(e) => updateState({ showTitle: e.target.checked })}
                    className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  Mostrar
                </label>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Tamaño</label>
                  <input
                    type="number"
                    value={state.titleFontSize}
                    onChange={(e) => updateState({ titleFontSize: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Color</label>
                  <input
                    type="color"
                    value={state.titleColor}
                    onChange={(e) => updateState({ titleColor: e.target.value })}
                    className="w-10 h-8 rounded-md cursor-pointer bg-white/5 border border-white/10"
                  />
                </div>
              </div>

              {/* Layout options */}
              <div className="p-3 bg-white/[0.03] rounded-lg space-y-3 mt-3">
                <label className="text-xs text-gray-500 block">Disposición</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateState({ layoutDirection: "column" })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      (state.layoutDirection ?? "column") === "column"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Título arriba
                  </button>
                  <button
                    onClick={() => updateState({ layoutDirection: "column-reverse" })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      (state.layoutDirection ?? "column") === "column-reverse"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Título abajo
                  </button>
                  <button
                    onClick={() => updateState({ layoutDirection: "row" })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      (state.layoutDirection ?? "column") === "row"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Título izquierda
                  </button>
                  <button
                    onClick={() => updateState({ layoutDirection: "row-reverse" })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      (state.layoutDirection ?? "column") === "row-reverse"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Título derecha
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Separación <span className="text-gray-600">{state.titleGap ?? 8}px</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.titleGap ?? 8}
                    onChange={(e) => updateState({ titleGap: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">Centrar elementos</label>
                  <input
                    type="checkbox"
                    checked={state.layoutCenter ?? true}
                    onChange={(e) => updateState({ layoutCenter: e.target.checked })}
                    className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                  />
                </div>
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
                    Tamaño <span className="text-gray-600">{state.style.fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={16}
                    max={200}
                    value={state.style.fontSize}
                    onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Font Weight */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Peso</label>
                  <select
                    value={state.style.fontWeight}
                    onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="400">Normal</option>
                    <option value="500">Medium</option>
                    <option value="600">Semibold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra Bold</option>
                    <option value="900">Black</option>
                  </select>
                </div>

                {/* Format */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Formato</label>
                  <select
                    value={state.style.format}
                    onChange={(e) => updateStyle({ format: e.target.value as TimerStyle["format"] })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="hh:mm:ss">HH:MM:SS</option>
                    <option value="mm:ss">MM:SS</option>
                    <option value="ss">Segundos</option>
                    <option value="hh:mm:ss.ms">HH:MM:SS.ms</option>
                    <option value="mm:ss.ms">MM:SS.ms</option>
                  </select>
                </div>

                {/* Separator */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Separador</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state.style.separatorChar}
                    onChange={(e) => updateStyle({ separatorChar: e.target.value })}
                    className="w-16 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-center text-white focus:outline-none focus:border-white/20"
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
                    <label className="text-xs text-gray-500 block mb-1.5">Fondo</label>
                    <input
                      type="color"
                      value={state.style.backgroundColor.startsWith("rgba") ? "#000000" : state.style.backgroundColor}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Borde</label>
                    <input
                      type="color"
                      value={state.style.borderColor}
                      onChange={(e) => updateStyle({ borderColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Glow</label>
                    <input
                      type="color"
                      value={state.style.glowColor}
                      onChange={(e) => updateStyle({ glowColor: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10"
                    />
                  </div>
                </div>

                {/* Transparent bg */}
                <button
                  onClick={() => updateStyle({ backgroundColor: "rgba(0, 0, 0, 0)" })}
                  className="w-full bg-white/5 hover:bg-white/10 py-2 px-4 rounded-lg text-xs transition-colors text-gray-400"
                >
                  Fondo transparente (OBS)
                </button>

                {/* Letter Spacing */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Espaciado <span className="text-gray-600">{state.style.letterSpacing}px</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={state.style.letterSpacing}
                    onChange={(e) => updateStyle({ letterSpacing: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Border */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">Borde</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state.style.showBorder}
                      onChange={(e) => updateStyle({ showBorder: e.target.checked })}
                      className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                    />
                    {state.style.showBorder && (
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={state.style.borderWidth}
                        onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
                        className="w-14 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Border Radius */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Radio <span className="text-gray-600">{state.style.borderRadius}px</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={state.style.borderRadius}
                    onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })}
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
                    min={0}
                    max={60}
                    value={state.style.padding}
                    onChange={(e) => updateStyle({ padding: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Glow */}
                <div className="p-3 bg-white/[0.03] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Efecto Glow</label>
                    <input
                      type="checkbox"
                      checked={state.style.glowEffect}
                      onChange={(e) => updateStyle({ glowEffect: e.target.checked })}
                      className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0"
                    />
                  </div>
                  {state.style.glowEffect && (
                    <>
                      <div>
                        <label className="text-[10px] text-gray-600">
                          Intensidad: {state.style.glowIntensity}
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          value={state.style.glowIntensity}
                          onChange={(e) => updateStyle({ glowIntensity: Number(e.target.value) })}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600">
                          Text Shadow: {state.style.textShadowBlur}
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={40}
                          value={state.style.textShadowBlur}
                          onChange={(e) => updateStyle({ textShadowBlur: Number(e.target.value) })}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Box Shadow */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Sombra <span className="text-gray-600">{state.style.shadowBlur}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={state.style.shadowBlur}
                    onChange={(e) => updateStyle({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Animation */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Animación</label>
                  <select
                    value={state.style.animation}
                    onChange={(e) => updateStyle({ animation: e.target.value as TimerStyle["animation"] })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="none">Ninguna</option>
                    <option value="pulse">Pulso</option>
                    <option value="glow">Glow pulsante</option>
                    <option value="bounce">Rebote</option>
                  </select>
                </div>

                {/* Opacity */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Opacidad <span className="text-gray-600">{state.style.opacity}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.style.opacity}
                    onChange={(e) => updateStyle({ opacity: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
