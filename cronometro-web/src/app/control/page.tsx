"use client";

import { useState, useEffect, useCallback } from "react";

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
}

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
  const [state, setState] = useState<TimerState | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState(5);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        const totalSec = Math.floor(data.countdownFrom / 1000);
        setCountdownMinutes(Math.floor(totalSec / 60));
        setCountdownSeconds(totalSec % 60);
      });

    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      setState(JSON.parse(e.data));
    };
    return () => es.close();
  }, []);

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
      sendAction({ action: "updateStyle", style: newStyle });
    },
    [state, sendAction]
  );

  const updateState = useCallback(
    (partial: Partial<TimerState>) => {
      if (!state) return;
      const newState = { ...state, ...partial };
      sendAction(newState);
    },
    [state, sendAction]
  );

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const fonts = [
    { label: "Orbitron", value: "'Orbitron', sans-serif" },
    { label: "Roboto Mono", value: "'Roboto Mono', monospace" },
    { label: "Press Start 2P", value: "'Press Start 2P', monospace" },
    { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400">
          ⏱️ Control del Cronómetro
        </h1>

        {/* Preview */}
        <div className="mb-8 rounded-xl bg-gray-800 p-6 border border-gray-700">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
            Vista previa
          </h2>
          <div className="flex justify-center items-center min-h-[150px] bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[length:20px_20px] rounded-lg p-8">
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
              }}
            >
              {state.showTitle && (
                <div
                  style={{
                    fontSize: `${state.titleFontSize}px`,
                    color: state.titleColor,
                    textAlign: "center",
                    marginBottom: "8px",
                    fontFamily: state.style.fontFamily,
                  }}
                >
                  {state.title}
                </div>
              )}
              <div
                style={{
                  fontFamily: state.style.fontFamily === "custom" ? state.style.customFont : state.style.fontFamily,
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer Controls */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-emerald-400">
              Controles
            </h2>

            {/* Mode */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Modo</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateState({ mode: "countup" })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    state.mode === "countup"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Cuenta Arriba
                </button>
                <button
                  onClick={() => updateState({ mode: "countdown" })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    state.mode === "countdown"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Cuenta Atrás
                </button>
              </div>
            </div>

            {/* Countdown config */}
            {state.mode === "countdown" && (
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <label className="block text-sm text-gray-400 mb-2">
                  Tiempo inicial
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    value={countdownMinutes}
                    onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-center"
                  />
                  <span className="text-gray-400">min</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={countdownSeconds}
                    onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-center"
                  />
                  <span className="text-gray-400">seg</span>
                  <button
                    onClick={() => {
                      const ms = (countdownMinutes * 60 + countdownSeconds) * 1000;
                      updateState({ countdownFrom: ms });
                    }}
                    className="ml-auto bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mb-4">
              {state.status !== "running" ? (
                <button
                  onClick={() => sendAction({ action: "start" })}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 px-6 rounded-lg font-bold text-lg transition"
                >
                  ▶ Iniciar
                </button>
              ) : (
                <button
                  onClick={() => sendAction({ action: "pause" })}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 px-6 rounded-lg font-bold text-lg transition"
                >
                  ⏸ Pausar
                </button>
              )}
              <button
                onClick={() => sendAction({ action: "reset" })}
                className="flex-1 bg-red-600 hover:bg-red-500 py-3 px-6 rounded-lg font-bold text-lg transition"
              >
                ⏹ Reset
              </button>
            </div>

            {/* Current time display */}
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Tiempo actual</div>
              <div className="text-3xl font-mono text-emerald-400">
                {formatTime(state.currentMs, state.style.format, state.style.separatorChar)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Estado: {state.status === "running" ? "🟢 Corriendo" : state.status === "paused" ? "🟡 Pausado" : "⚫ Detenido"}
              </div>
            </div>

            {/* Title config */}
            <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400">Título</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.showTitle}
                    onChange={(e) => updateState({ showTitle: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-400">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={state.title}
                onChange={(e) => updateState({ title: e.target.value })}
                placeholder="Título del timer..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Tamaño</label>
                  <input
                    type="number"
                    value={state.titleFontSize}
                    onChange={(e) => updateState({ titleFontSize: Number(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Color</label>
                  <input
                    type="color"
                    value={state.titleColor}
                    onChange={(e) => updateState({ titleColor: e.target.value })}
                    className="w-12 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Style Controls */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">
              Apariencia
            </h2>

            {/* Font */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fuente</label>
              <select
                value={state.style.fontFamily === "custom" ? "custom" : state.style.fontFamily}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    updateStyle({ fontFamily: "custom" });
                  } else {
                    updateStyle({ fontFamily: e.target.value });
                  }
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {fonts.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              {state.style.fontFamily === "custom" && (
                <input
                  type="text"
                  value={state.style.customFont}
                  onChange={(e) => updateStyle({ customFont: e.target.value })}
                  placeholder="Nombre de fuente CSS..."
                  className="w-full mt-2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
              )}
            </div>

            {/* Font size */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Tamaño: {state.style.fontSize}px
              </label>
              <input
                type="range"
                min={16}
                max={200}
                value={state.style.fontSize}
                onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Font weight */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Peso</label>
              <select
                value={state.style.fontWeight}
                onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="400">Normal (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Formato</label>
              <select
                value={state.style.format}
                onChange={(e) => updateStyle({ format: e.target.value as TimerStyle["format"] })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
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
              <label className="block text-sm text-gray-400 mb-1">Separador</label>
              <input
                type="text"
                maxLength={2}
                value={state.style.separatorChar}
                onChange={(e) => updateStyle({ separatorChar: e.target.value })}
                className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-center"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Color texto</label>
                <input
                  type="color"
                  value={state.style.textColor}
                  onChange={(e) => updateStyle({ textColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fondo</label>
                <input
                  type="color"
                  value={state.style.backgroundColor.startsWith("rgba") ? "#000000" : state.style.backgroundColor}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Borde</label>
                <input
                  type="color"
                  value={state.style.borderColor}
                  onChange={(e) => updateStyle({ borderColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Glow</label>
                <input
                  type="color"
                  value={state.style.glowColor}
                  onChange={(e) => updateStyle({ glowColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Transparent background */}
            <div>
              <button
                onClick={() => updateStyle({ backgroundColor: "rgba(0, 0, 0, 0)" })}
                className="w-full bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg text-sm transition"
              >
                🔲 Fondo transparente (para OBS)
              </button>
            </div>

            {/* Letter spacing */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Espaciado: {state.style.letterSpacing}px
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={state.style.letterSpacing}
                onChange={(e) => updateStyle({ letterSpacing: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Border */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.style.showBorder}
                  onChange={(e) => updateStyle({ showBorder: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Borde</span>
              </label>
              {state.style.showBorder && (
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={state.style.borderWidth}
                  onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
                  className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                />
              )}
            </div>

            {/* Border radius */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Radio borde: {state.style.borderRadius}px
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={state.style.borderRadius}
                onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Padding */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Padding: {state.style.padding}px
              </label>
              <input
                type="range"
                min={0}
                max={60}
                value={state.style.padding}
                onChange={(e) => updateStyle({ padding: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Glow */}
            <div className="p-3 bg-gray-700/50 rounded-lg space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.style.glowEffect}
                  onChange={(e) => updateStyle({ glowEffect: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Efecto Glow</span>
              </label>
              {state.style.glowEffect && (
                <>
                  <div>
                    <label className="text-xs text-gray-500">
                      Intensidad: {state.style.glowIntensity}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      value={state.style.glowIntensity}
                      onChange={(e) => updateStyle({ glowIntensity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Text Shadow: {state.style.textShadowBlur}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={state.style.textShadowBlur}
                      onChange={(e) => updateStyle({ textShadowBlur: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Box shadow */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Sombra caja: {state.style.shadowBlur}
              </label>
              <input
                type="range"
                min={0}
                max={60}
                value={state.style.shadowBlur}
                onChange={(e) => updateStyle({ shadowBlur: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Animation */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Animación</label>
              <select
                value={state.style.animation}
                onChange={(e) => updateStyle({ animation: e.target.value as TimerStyle["animation"] })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="none">Ninguna</option>
                <option value="pulse">Pulso</option>
                <option value="glow">Glow pulsante</option>
                <option value="bounce">Rebote</option>
              </select>
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Opacidad: {state.style.opacity}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={state.style.opacity}
                onChange={(e) => updateStyle({ opacity: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Export/Import Config */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            💾 Exportar / Importar Configuración
          </h3>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => {
                const config = JSON.stringify({
                  style: state.style,
                  title: state.title,
                  showTitle: state.showTitle,
                  titleFontSize: state.titleFontSize,
                  titleColor: state.titleColor,
                  mode: state.mode,
                  countdownFrom: state.countdownFrom,
                });
                const code = btoa(config);
                navigator.clipboard.writeText(code);
                setExportCode(code);
                setCopyMsg("¡Copiado al portapapeles!");
                setTimeout(() => setCopyMsg(""), 2000);
              }}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              📋 Exportar (copiar código)
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              📥 Importar
            </button>
            {copyMsg && (
              <span className="text-emerald-400 text-sm self-center">{copyMsg}</span>
            )}
          </div>
          {exportCode && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Código exportado:</label>
              <textarea
                readOnly
                value={exportCode}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-emerald-400 font-mono h-16 resize-none"
              />
            </div>
          )}
          {showImport && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Pegar código de configuración:</label>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Pega aquí el código exportado..."
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white font-mono h-16 resize-none mb-2"
              />
              <button
                onClick={() => {
                  try {
                    const decoded = JSON.parse(atob(importCode.trim()));
                    if (decoded.style) {
                      const newState = { ...state, ...decoded };
                      sendAction(newState);
                      setImportCode("");
                      setShowImport(false);
                      setCopyMsg("¡Configuración importada!");
                      setTimeout(() => setCopyMsg(""), 2000);
                    } else {
                      setCopyMsg("Código inválido");
                      setTimeout(() => setCopyMsg(""), 2000);
                    }
                  } catch {
                    setCopyMsg("Error: código inválido");
                    setTimeout(() => setCopyMsg(""), 2000);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                ✅ Aplicar configuración
              </button>
            </div>
          )}
        </div>

        {/* OBS URL info */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            🎥 URL para OBS (Browser Source)
          </h3>
          <code className="block bg-gray-900 p-3 rounded-lg text-emerald-400 text-sm break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/overlay`
              : "http://localhost:3001/overlay"}
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Usa esta URL en OBS como Browser Source. El fondo es transparente por defecto.
          </p>
        </div>
      </div>
    </div>
  );
}
