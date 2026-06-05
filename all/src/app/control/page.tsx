"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ===================== TYPES =====================

interface TimerStyle {
  fontFamily: string; customFont: string; fontSize: number; textColor: string;
  backgroundColor: string; borderRadius: number; showBorder: boolean; borderColor: string;
  borderWidth: number; opacity: number; padding: number; shadowColor: string; shadowBlur: number;
  showMilliseconds: boolean; separatorChar: string; letterSpacing: number; fontWeight: string;
  textShadowColor: string; textShadowBlur: number; glowEffect: boolean; glowColor: string;
  glowIntensity: number; animation: "none" | "pulse" | "glow" | "bounce";
  format: "hh:mm:ss" | "mm:ss" | "ss" | "hh:mm:ss.ms" | "mm:ss.ms";
}

interface TimerState {
  mode: "countup" | "countdown"; status: "stopped" | "running" | "paused";
  currentMs: number; countdownFrom: number; startedAt: number | null;
  style: TimerStyle; title: string; showTitle: boolean;
  titleFontSize: number; titleColor: string; titleGap: number;
  layoutDirection: "column" | "column-reverse" | "row" | "row-reverse";
  layoutCenter: boolean; countdownAlert: boolean; countdownAlertStyle: "flash" | "blink" | "none";
}

interface Player { id: string; name: string; score: number; color: string; image: string; }

interface OverlayStyle {
  fontFamily: string; customFont: string; fontSize: number; textColor: string;
  backgroundColor: string; cardBackground: string; accentColor: string;
  borderRadius: number; showBorder: boolean; borderColor: string;
  layout: "horizontal" | "vertical" | "grid"; opacity: number; gap: number; padding: number;
  showScore: boolean; showPosition: boolean; animation: "none" | "pulse" | "slide" | "glow";
  uniformCardSize: boolean; position: string; imageSize: number;
}

interface GameState {
  players: Player[]; style: OverlayStyle; title: string; showTitle: boolean; manualOrder: boolean;
}

interface Scene { id: string; name: string; }

// ===================== UTILS =====================

const TIMER_FONT_OPTIONS = [
  "'Orbitron', sans-serif", "'Press Start 2P', cursive", "'Roboto Mono', monospace",
  "'Bebas Neue', sans-serif", "'Russo One', sans-serif", "'Audiowide', cursive",
  "'Exo 2', sans-serif", "'Chakra Petch', sans-serif",
];

const PLAYER_COLORS = ["#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

function formatTime(ms: number, format: string, separator: string): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((Math.abs(ms) % 1000) / 10);
  const pad = (n: number) => n.toString().padStart(2, "0");
  switch (format) {
    case "hh:mm:ss": return `${pad(hours)}${separator}${pad(minutes)}${separator}${pad(seconds)}`;
    case "mm:ss": return `${pad(hours * 60 + minutes)}${separator}${pad(seconds)}`;
    case "ss": return `${totalSeconds}`;
    case "hh:mm:ss.ms": return `${pad(hours)}${separator}${pad(minutes)}${separator}${pad(seconds)}.${pad(millis)}`;
    case "mm:ss.ms": return `${pad(hours * 60 + minutes)}${separator}${pad(seconds)}.${pad(millis)}`;
    default: return `${pad(minutes)}${separator}${pad(seconds)}`;
  }
}

function generateId() { return Math.random().toString(36).substring(2, 9); }

// ===================== COMPONENT =====================

export default function ControlPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState<"timer" | "scores">("timer");

  // Timer state
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState(5);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [timerScenes, setTimerScenes] = useState<Scene[]>([]);
  const [timerSceneName, setTimerSceneName] = useState("");

  // Scores state
  const [scoresState, setScoresState] = useState<GameState | null>(null);
  const [scoresScenes, setScoresScenes] = useState<Scene[]>([]);
  const [scoresSceneName, setScoresSceneName] = useState("");
  const [uniformColor, setUniformColor] = useState("#00ff88");
  const [dragId, setDragId] = useState<string | null>(null);
  const [showHotkeys, setShowHotkeys] = useState(false);

  // Shared
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState("");

  // Undo/Redo (per tab)
  const timerHistoryRef = useRef<TimerState[]>([]);
  const timerHistoryIdx = useRef(-1);
  const scoresHistoryRef = useRef<GameState[]>([]);
  const scoresHistoryIdx = useRef(-1);
  const isUndoRedo = useRef(false);

  const pushTimerHistory = useCallback((s: TimerState) => {
    if (isUndoRedo.current) return;
    timerHistoryRef.current = timerHistoryRef.current.slice(0, timerHistoryIdx.current + 1);
    timerHistoryRef.current.push(JSON.parse(JSON.stringify(s)));
    if (timerHistoryRef.current.length > 50) timerHistoryRef.current.shift();
    timerHistoryIdx.current = timerHistoryRef.current.length - 1;
  }, []);

  const pushScoresHistory = useCallback((s: GameState) => {
    if (isUndoRedo.current) return;
    scoresHistoryRef.current = scoresHistoryRef.current.slice(0, scoresHistoryIdx.current + 1);
    scoresHistoryRef.current.push(JSON.parse(JSON.stringify(s)));
    if (scoresHistoryRef.current.length > 50) scoresHistoryRef.current.shift();
    scoresHistoryIdx.current = scoresHistoryRef.current.length - 1;
  }, []);

  // ===================== AUTH =====================

  useEffect(() => {
    const stored = sessionStorage.getItem("control_auth");
    if (stored === "true") { setAuthenticated(true); setPinRequired(false); return; }
    fetch("/api/auth").then(r => r.json()).then(d => {
      if (!d.required) { setAuthenticated(true); setPinRequired(false); } else { setPinRequired(true); }
    }).catch(() => { setAuthenticated(true); setPinRequired(false); });
  }, []);

  const handlePinSubmit = async () => {
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinInput }) });
    if (res.ok) { setAuthenticated(true); sessionStorage.setItem("control_auth", "true"); }
    else { setPinError("PIN incorrecto"); setTimeout(() => setPinError(""), 2000); }
  };

  // ===================== DATA LOADING =====================

  useEffect(() => {
    if (!authenticated) return;

    // Timer
    fetch("/api/timer/state").then(r => r.json()).then(d => { setTimerState(d); pushTimerHistory(d); const t = Math.floor(d.countdownFrom / 1000); setCountdownMinutes(Math.floor(t / 60)); setCountdownSeconds(t % 60); });
    fetch("/api/timer/scenes").then(r => r.json()).then(setTimerScenes).catch(() => {});
    const timerEs = new EventSource("/api/timer/stream");
    timerEs.onmessage = (e) => setTimerState(JSON.parse(e.data));

    // Scores
    fetch("/api/scores/state").then(r => r.json()).then(d => { setScoresState(d); pushScoresHistory(d); });
    fetch("/api/scores/scenes").then(r => r.json()).then(setScoresScenes).catch(() => {});

    return () => { timerEs.close(); };
  }, [authenticated, pushTimerHistory, pushScoresHistory]);

  // ===================== TIMER ACTIONS =====================

  const sendTimerAction = useCallback(async (body: Record<string, unknown>) => {
    await fetch("/api/timer/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }, []);

  const updateTimerStyle = useCallback((partial: Partial<TimerStyle>) => {
    if (!timerState) return;
    const newStyle = { ...timerState.style, ...partial };
    pushTimerHistory({ ...timerState, style: newStyle });
    sendTimerAction({ action: "updateStyle", style: newStyle });
  }, [timerState, sendTimerAction, pushTimerHistory]);

  const updateTimerState = useCallback((partial: Partial<TimerState>) => {
    if (!timerState) return;
    const newState = { ...timerState, ...partial };
    pushTimerHistory(newState);
    sendTimerAction(newState as unknown as Record<string, unknown>);
  }, [timerState, sendTimerAction, pushTimerHistory]);

  // ===================== SCORES ACTIONS =====================

  const saveScoresState = useCallback(async (newState: GameState) => {
    setScoresState(newState);
    pushScoresHistory(newState);
    await fetch("/api/scores/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newState) });
  }, [pushScoresHistory]);

  const addPlayer = () => {
    if (!scoresState) return;
    const p: Player = { id: generateId(), name: `Jugador ${scoresState.players.length + 1}`, score: 0, color: PLAYER_COLORS[scoresState.players.length % PLAYER_COLORS.length], image: "" };
    saveScoresState({ ...scoresState, players: [...scoresState.players, p] });
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    if (!scoresState) return;
    saveScoresState({ ...scoresState, players: scoresState.players.map(p => p.id === id ? { ...p, ...updates } : p) });
  };

  const updateScore = (id: string, delta: number) => {
    if (!scoresState) return;
    saveScoresState({ ...scoresState, players: scoresState.players.map(p => p.id === id ? { ...p, score: p.score + delta } : p) });
  };

  const updateScoresStyle = (updates: Partial<OverlayStyle>) => {
    if (!scoresState) return;
    saveScoresState({ ...scoresState, style: { ...scoresState.style, ...updates } });
  };

  // ===================== UNDO/REDO =====================

  const undo = useCallback(() => {
    isUndoRedo.current = true;
    if (tab === "timer") {
      if (timerHistoryIdx.current <= 0) return;
      timerHistoryIdx.current--;
      const s = timerHistoryRef.current[timerHistoryIdx.current];
      setTimerState(s);
      sendTimerAction(s as unknown as Record<string, unknown>);
    } else {
      if (scoresHistoryIdx.current <= 0) return;
      scoresHistoryIdx.current--;
      const s = scoresHistoryRef.current[scoresHistoryIdx.current];
      setScoresState(s);
      fetch("/api/scores/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    }
    setTimeout(() => { isUndoRedo.current = false; }, 100);
  }, [tab, sendTimerAction]);

  const redo = useCallback(() => {
    isUndoRedo.current = true;
    if (tab === "timer") {
      if (timerHistoryIdx.current >= timerHistoryRef.current.length - 1) return;
      timerHistoryIdx.current++;
      const s = timerHistoryRef.current[timerHistoryIdx.current];
      setTimerState(s);
      sendTimerAction(s as unknown as Record<string, unknown>);
    } else {
      if (scoresHistoryIdx.current >= scoresHistoryRef.current.length - 1) return;
      scoresHistoryIdx.current++;
      const s = scoresHistoryRef.current[scoresHistoryIdx.current];
      setScoresState(s);
      fetch("/api/scores/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    }
    setTimeout(() => { isUndoRedo.current = false; }, 100);
  }, [tab, sendTimerAction]);

  // ===================== KEYBOARD SHORTCUTS =====================

  useEffect(() => {
    if (!authenticated) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      // Score hotkeys (only on scores tab)
      if (tab === "scores" && scoresState) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const idx = num - 1;
          if (scoresState.players[idx]) {
            const delta = e.shiftKey ? -1 : 1;
            const newState = { ...scoresState, players: scoresState.players.map((p, i) => i === idx ? { ...p, score: p.score + delta } : p) };
            setScoresState(newState);
            pushScoresHistory(newState);
            fetch("/api/scores/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newState) });
          }
        }
        if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) {
          const newState = { ...scoresState, players: scoresState.players.map(p => ({ ...p, score: 0 })) };
          setScoresState(newState);
          pushScoresHistory(newState);
          fetch("/api/scores/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newState) });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authenticated, tab, scoresState, undo, redo, pushScoresHistory]);

  // ===================== SCENES =====================

  const saveTimerScene = async () => {
    if (!timerSceneName.trim()) return;
    const res = await fetch("/api/timer/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", name: timerSceneName.trim() }) });
    if (res.ok) { const d = await res.json(); setTimerScenes(prev => [...prev, d.scene]); setTimerSceneName(""); }
  };
  const loadTimerScene = async (id: string) => {
    await fetch("/api/timer/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", id }) });
    const r = await fetch("/api/timer/state"); const d = await r.json(); setTimerState(d); pushTimerHistory(d);
  };
  const deleteTimerScene = async (id: string) => {
    await fetch("/api/timer/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setTimerScenes(prev => prev.filter(s => s.id !== id));
  };

  const saveScoresScene = async () => {
    if (!scoresSceneName.trim()) return;
    const res = await fetch("/api/scores/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", name: scoresSceneName.trim() }) });
    if (res.ok) { const d = await res.json(); setScoresScenes(prev => [...prev, d.scene]); setScoresSceneName(""); }
  };
  const loadScoresScene = async (id: string) => {
    await fetch("/api/scores/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", id }) });
    const r = await fetch("/api/scores/state"); const d = await r.json(); setScoresState(d); pushScoresHistory(d);
  };
  const deleteScoresScene = async (id: string) => {
    await fetch("/api/scores/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setScoresScenes(prev => prev.filter(s => s.id !== id));
  };

  // ===================== DRAG & DROP =====================
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!scoresState || !dragId || dragId === targetId) return;
    const players = [...scoresState.players];
    const from = players.findIndex(p => p.id === dragId);
    const to = players.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = players.splice(from, 1);
    players.splice(to, 0, moved);
    saveScoresState({ ...scoresState, players, manualOrder: true });
    setDragId(null);
  };

  // ===================== RENDER =====================

  if (pinRequired === null) {
    return <div className="min-h-screen bg-bg text-white flex items-center justify-center"><div className="animate-pulse text-lg text-gray-400">Cargando...</div></div>;
  }

  if (pinRequired && !authenticated) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8 w-80 space-y-4">
          <h2 className="text-lg font-semibold text-center">Panel de Control</h2>
          <p className="text-xs text-gray-500 text-center">Ingresa el PIN para acceder</p>
          <input type="password" maxLength={8} value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500/50" placeholder="••••" />
          {pinError && <p className="text-xs text-red-400 text-center">{pinError}</p>}
          <button onClick={handlePinSubmit} className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-lg font-medium text-sm transition-colors">Acceder</button>
        </div>
      </div>
    );
  }

  const overlayTimerUrl = typeof window !== "undefined" ? `${window.location.origin}/overlay/timer` : "";
  const overlayScoresUrl = typeof window !== "undefined" ? `${window.location.origin}/overlay/scores` : "";
  const overlayCombinedUrl = typeof window !== "undefined" ? `${window.location.origin}/overlay/combined` : "";

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Stream Tools</h1>
            <div className="flex gap-1">
              <button onClick={undo} title="Deshacer (Ctrl+Z)" className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-xs text-gray-400 transition-colors">↶</button>
              <button onClick={redo} title="Rehacer (Ctrl+Y)" className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-xs text-gray-400 transition-colors">↷</button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => navigator.clipboard.writeText(overlayCombinedUrl)} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md font-medium transition-colors text-gray-300">Copiar URL Combinada</button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("timer")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "timer" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"}`}>
            Cronómetro
          </button>
          <button onClick={() => setTab("scores")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "scores" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"}`}>
            Puntos
          </button>
        </div>

        {/* URLs */}
        <div className="flex flex-wrap gap-2 mb-6 text-xs">
          <span className="text-gray-500 bg-white/5 px-3 py-1.5 rounded-md font-mono">{tab === "timer" ? overlayTimerUrl : overlayScoresUrl}</span>
          <button onClick={() => navigator.clipboard.writeText(tab === "timer" ? overlayTimerUrl : overlayScoresUrl)} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md font-medium text-gray-300 transition-colors">Copiar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-8">
        {/* =================== TIMER TAB =================== */}
        {tab === "timer" && timerState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Controls */}
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Controles</h2>
                <div className="mb-4">
                  <div className="flex gap-2">
                    <button onClick={() => updateTimerState({ mode: "countup" })} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${timerState.mode === "countup" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"}`}>Cuenta arriba</button>
                    <button onClick={() => updateTimerState({ mode: "countdown" })} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${timerState.mode === "countdown" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"}`}>Cuenta atrás</button>
                  </div>
                </div>

                {timerState.mode === "countdown" && (
                  <div className="mb-4 p-3 bg-white/[0.03] rounded-lg space-y-3">
                    <div className="flex gap-2 items-center">
                      <input type="number" min={0} value={countdownMinutes} onChange={e => setCountdownMinutes(Number(e.target.value))} className="w-16 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-center text-white focus:outline-none" />
                      <span className="text-xs text-gray-500">min</span>
                      <input type="number" min={0} max={59} value={countdownSeconds} onChange={e => setCountdownSeconds(Number(e.target.value))} className="w-16 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-center text-white focus:outline-none" />
                      <span className="text-xs text-gray-500">seg</span>
                      <button onClick={() => updateTimerState({ countdownFrom: (countdownMinutes * 60 + countdownSeconds) * 1000 })} className="ml-auto bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 transition-colors">Aplicar</button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 3, 5, 10, 15, 30].map(min => (
                        <button key={min} onClick={() => { setCountdownMinutes(min); setCountdownSeconds(0); updateTimerState({ countdownFrom: min * 60 * 1000 }); }}
                          className="bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 border border-white/10 hover:border-emerald-500/30 transition-colors">{min} min</button>
                      ))}
                    </div>
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500">Alerta al finalizar</label>
                        <input type="checkbox" checked={timerState.countdownAlert ?? true} onChange={e => updateTimerState({ countdownAlert: e.target.checked })} className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0" />
                      </div>
                      {(timerState.countdownAlert ?? true) && (
                        <select value={timerState.countdownAlertStyle ?? "flash"} onChange={e => updateTimerState({ countdownAlertStyle: e.target.value as "flash" | "blink" | "none" })} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none">
                          <option value="flash">Flash rojo</option><option value="blink">Parpadeo</option><option value="none">Sin animación</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mb-4">
                  {timerState.status !== "running" ? (
                    <button onClick={() => sendTimerAction({ action: "start" })} className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-3 rounded-lg font-semibold text-sm transition-colors">▶ Iniciar</button>
                  ) : (
                    <button onClick={() => sendTimerAction({ action: "pause" })} className="flex-1 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 py-3 rounded-lg font-semibold text-sm transition-colors">⏸ Pausar</button>
                  )}
                  <button onClick={() => sendTimerAction({ action: "reset" })} className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 py-3 rounded-lg font-semibold text-sm transition-colors">⏹ Reset</button>
                </div>

                <div className="text-center p-4 bg-white/[0.03] rounded-lg">
                  <div className="text-2xl font-mono text-emerald-400">{formatTime(timerState.currentMs, timerState.style.format, timerState.style.separatorChar)}</div>
                  <div className="text-[10px] text-gray-600 mt-1">{timerState.status === "running" ? "● Corriendo" : timerState.status === "paused" ? "● Pausado" : "● Detenido"}</div>
                </div>
              </section>

              {/* Timer Scenes */}
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <h2 className="text-sm font-medium text-gray-300 mb-3">Escenas Timer</h2>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={timerSceneName} onChange={e => setTimerSceneName(e.target.value)} placeholder="Nombre..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none" />
                  <button onClick={saveTimerScene} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-md text-xs font-medium transition-colors">Guardar</button>
                </div>
                {timerScenes.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2.5 mb-2">
                    <span className="flex-1 text-sm text-gray-300 truncate">{s.name}</span>
                    <button onClick={() => loadTimerScene(s.id)} className="bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 px-2.5 py-1 rounded text-xs text-gray-400 transition-colors">Cargar</button>
                    <button onClick={() => deleteTimerScene(s.id)} className="bg-white/5 hover:bg-red-500/15 hover:text-red-400 px-2 py-1 rounded text-xs text-gray-400 transition-colors">×</button>
                  </div>
                ))}
              </section>
            </div>

            {/* Timer Styles */}
            <div className="space-y-6">
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Estilo Timer</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Fuente</label>
                    <select value={timerState.style.customFont ? "" : timerState.style.fontFamily} onChange={e => updateTimerStyle({ fontFamily: e.target.value, customFont: "" })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      {TIMER_FONT_OPTIONS.map(f => <option key={f} value={f}>{f.replace(/'/g, "").split(",")[0]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Tamaño <span className="text-gray-600">{timerState.style.fontSize}px</span></label>
                    <input type="range" min={16} max={200} value={timerState.style.fontSize} onChange={e => updateTimerStyle({ fontSize: Number(e.target.value) })} className="w-full accent-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Formato</label>
                    <select value={timerState.style.format} onChange={e => updateTimerStyle({ format: e.target.value as TimerStyle["format"] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="hh:mm:ss">HH:MM:SS</option><option value="mm:ss">MM:SS</option><option value="ss">Segundos</option><option value="hh:mm:ss.ms">HH:MM:SS.ms</option><option value="mm:ss.ms">MM:SS.ms</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 block mb-1.5">Texto</label><input type="color" value={timerState.style.textColor} onChange={e => updateTimerStyle({ textColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10" /></div>
                    <div><label className="text-xs text-gray-500 block mb-1.5">Glow</label><input type="color" value={timerState.style.glowColor} onChange={e => updateTimerStyle({ glowColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10" /></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Efecto Glow</label>
                    <input type="checkbox" checked={timerState.style.glowEffect} onChange={e => updateTimerStyle({ glowEffect: e.target.checked })} className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Animación</label>
                    <select value={timerState.style.animation} onChange={e => updateTimerStyle({ animation: e.target.value as TimerStyle["animation"] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="none">Ninguna</option><option value="pulse">Pulso</option><option value="glow">Glow</option><option value="bounce">Rebote</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* =================== SCORES TAB =================== */}
        {tab === "scores" && scoresState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Players */}
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-300">Jugadores ({scoresState.players.length})</h2>
                  <div className="flex gap-2">
                    <button onClick={() => saveScoresState({ ...scoresState, players: scoresState.players.map(p => ({ ...p, score: 0 })) })} className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 transition-colors">Reset</button>
                    <button onClick={addPlayer} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors">+ Agregar</button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 bg-white/[0.03] rounded-lg p-3">
                  <div><label className="text-xs text-gray-500">Orden manual (drag & drop)</label></div>
                  <input type="checkbox" checked={scoresState.manualOrder ?? false} onChange={e => saveScoresState({ ...scoresState, manualOrder: e.target.checked })} className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0" />
                </div>

                <div className="flex items-center gap-3 mb-4 bg-white/[0.03] rounded-lg p-3">
                  <span className="text-xs text-gray-500">Color uniforme:</span>
                  <input type="color" value={uniformColor} onChange={e => setUniformColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                  <button onClick={() => saveScoresState({ ...scoresState, players: scoresState.players.map(p => ({ ...p, color: uniformColor })) })} className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md text-xs text-gray-400 transition-colors">Aplicar a todos</button>
                </div>

                <div className="space-y-2">
                  {scoresState.players.map((player, index) => (
                    <div key={player.id} draggable={scoresState.manualOrder} onDragStart={() => handleDragStart(player.id)} onDragOver={handleDragOver} onDrop={() => handleDrop(player.id)}
                      className={`bg-white/[0.03] rounded-lg p-3 group hover:bg-white/[0.05] transition-colors ${scoresState.manualOrder ? "cursor-grab active:cursor-grabbing" : ""}`}>
                      <div className="flex items-center gap-3">
                        {scoresState.manualOrder && <span className="text-gray-600 text-xs">⠿</span>}
                        <span className="text-gray-600 font-mono text-xs w-5">{index + 1}</span>
                        <input type="color" value={player.color} onChange={e => updatePlayer(player.id, { color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0" />
                        <input type="text" value={player.name} onChange={e => updatePlayer(player.id, { name: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none" />
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateScore(player.id, -1)} className="w-7 h-7 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-sm font-bold transition-colors">−</button>
                          <input type="number" value={player.score} onChange={e => updatePlayer(player.id, { score: parseInt(e.target.value) || 0 })} className="w-14 text-center bg-white/5 border border-white/10 rounded-md py-1.5 text-sm text-white font-medium focus:outline-none" />
                          <button onClick={() => updateScore(player.id, 1)} className="w-7 h-7 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md text-sm font-bold transition-colors">+</button>
                        </div>
                        <button onClick={() => saveScoresState({ ...scoresState, players: scoresState.players.filter(p => p.id !== player.id) })} className="opacity-0 group-hover:opacity-100 w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all text-sm">×</button>
                      </div>
                    </div>
                  ))}
                  {scoresState.players.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">No hay jugadores.</div>}
                </div>
              </section>

              {/* Hotkeys */}
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <button onClick={() => setShowHotkeys(!showHotkeys)} className="flex items-center justify-between w-full">
                  <h2 className="text-sm font-medium text-gray-300">Atajos de teclado</h2>
                  <span className="text-xs text-gray-500">{showHotkeys ? "▲" : "▼"}</span>
                </button>
                {showHotkeys && (
                  <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                    <div className="flex justify-between"><span>1-9</span><span className="text-gray-500">+1 al jugador N</span></div>
                    <div className="flex justify-between"><span>Shift + 1-9</span><span className="text-gray-500">-1 al jugador N</span></div>
                    <div className="flex justify-between"><span>R</span><span className="text-gray-500">Reset puntos</span></div>
                    <div className="flex justify-between"><span>Ctrl+Z / Ctrl+Y</span><span className="text-gray-500">Deshacer / Rehacer</span></div>
                  </div>
                )}
              </section>

              {/* Scores Scenes */}
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <h2 className="text-sm font-medium text-gray-300 mb-3">Escenas Puntos</h2>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={scoresSceneName} onChange={e => setScoresSceneName(e.target.value)} placeholder="Nombre..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none" />
                  <button onClick={saveScoresScene} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-md text-xs font-medium transition-colors">Guardar</button>
                </div>
                {scoresScenes.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2.5 mb-2">
                    <span className="flex-1 text-sm text-gray-300 truncate">{s.name}</span>
                    <button onClick={() => loadScoresScene(s.id)} className="bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 px-2.5 py-1 rounded text-xs text-gray-400 transition-colors">Cargar</button>
                    <button onClick={() => deleteScoresScene(s.id)} className="bg-white/5 hover:bg-red-500/15 hover:text-red-400 px-2 py-1 rounded text-xs text-gray-400 transition-colors">×</button>
                  </div>
                ))}
              </section>
            </div>

            {/* Scores Styles */}
            <div className="space-y-6">
              <section className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Estilo Puntos</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Fuente</label>
                    <select value={scoresState.style.customFont ? "" : scoresState.style.fontFamily} onChange={e => updateScoresStyle({ fontFamily: e.target.value, customFont: "" })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      {TIMER_FONT_OPTIONS.map(f => <option key={f} value={f}>{f.replace(/'/g, "").split(",")[0]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Tamaño <span className="text-gray-600">{scoresState.style.fontSize}px</span></label>
                    <input type="range" min={12} max={48} value={scoresState.style.fontSize} onChange={e => updateScoresStyle({ fontSize: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 block mb-1.5">Texto</label><input type="color" value={scoresState.style.textColor} onChange={e => updateScoresStyle({ textColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10" /></div>
                    <div><label className="text-xs text-gray-500 block mb-1.5">Acento</label><input type="color" value={scoresState.style.accentColor} onChange={e => updateScoresStyle({ accentColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10" /></div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Disposición</label>
                    <select value={scoresState.style.layout} onChange={e => updateScoresStyle({ layout: e.target.value as OverlayStyle["layout"] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="grid">Grilla</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Animación</label>
                    <select value={scoresState.style.animation} onChange={e => updateScoresStyle({ animation: e.target.value as OverlayStyle["animation"] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="none">Ninguna</option><option value="pulse">Pulso</option><option value="slide">Deslizar</option><option value="glow">Brillo</option>
                    </select>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between"><label className="text-xs text-gray-500">Mostrar puntaje</label><input type="checkbox" checked={scoresState.style.showScore} onChange={e => updateScoresStyle({ showScore: e.target.checked })} className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0" /></div>
                    <div className="flex items-center justify-between"><label className="text-xs text-gray-500">Mostrar posición</label><input type="checkbox" checked={scoresState.style.showPosition} onChange={e => updateScoresStyle({ showPosition: e.target.checked })} className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-0" /></div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
