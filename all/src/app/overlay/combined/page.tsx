"use client";

import { useState, useEffect } from "react";

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

interface TimerState {
  mode: "countup" | "countdown";
  status: "stopped" | "running" | "paused";
  currentMs: number;
  startedAt: number | null;
  style: TimerStyle;
  title: string;
  showTitle: boolean;
  titleFontSize: number;
  titleColor: string;
  titleGap: number;
  layoutDirection: "column" | "column-reverse" | "row" | "row-reverse";
  layoutCenter: boolean;
  countdownAlert?: boolean;
  countdownAlertStyle?: "flash" | "blink" | "none";
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
interface GameState { players: Player[]; style: OverlayStyle; title: string; showTitle: boolean; manualOrder: boolean; }

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

export default function CombinedOverlayPage() {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [scores, setScores] = useState<GameState | null>(null);
  const [displayMs, setDisplayMs] = useState(0);

  useEffect(() => {
    const timerEs = new EventSource("/api/timer/stream");
    timerEs.onmessage = (e) => { const d = JSON.parse(e.data); setTimer(d); setDisplayMs(d.currentMs); };
    timerEs.onerror = () => { timerEs.close(); setTimeout(() => window.location.reload(), 2000); };

    const scoresEs = new EventSource("/api/scores/stream");
    scoresEs.onmessage = (e) => { try { setScores(JSON.parse(e.data)); } catch {} };
    scoresEs.onerror = () => { scoresEs.close(); setTimeout(() => window.location.reload(), 2000); };

    return () => { timerEs.close(); scoresEs.close(); };
  }, []);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const interval = setInterval(() => {
      if (!timer.startedAt) return;
      const elapsed = Date.now() - timer.startedAt;
      if (timer.mode === "countup") setDisplayMs(timer.currentMs + elapsed);
      else { const r = timer.currentMs - elapsed; setDisplayMs(r > 0 ? r : 0); }
    }, 33);
    return () => clearInterval(interval);
  }, [timer]);

  if (!timer && !scores) return <div className="overlay-root min-h-screen" />;

  const timerStyle = timer?.style;
  const timerFont = timerStyle?.customFont ? `'${timerStyle.customFont}', sans-serif` : timerStyle?.fontFamily || "'Orbitron', sans-serif";

  const isCountdownFinished = timer && timer.mode === "countdown" && displayMs <= 0 && timer.status === "stopped";
  const showAlert = isCountdownFinished && (timer?.countdownAlert !== false);
  const alertAnimStyle = showAlert && (timer?.countdownAlertStyle ?? "flash") !== "none" ? {
    animation: (timer?.countdownAlertStyle ?? "flash") === "flash" ? "countdownFlash 0.8s ease-in-out infinite" : "countdownBlink 1s step-end infinite",
  } : {};

  const sortedPlayers = scores ? (scores.manualOrder ? [...scores.players] : [...scores.players].sort((a, b) => b.score - a.score)) : [];
  const scoresStyle = scores?.style;
  const scoresFont = scoresStyle?.customFont ? `'${scoresStyle.customFont}', sans-serif` : scoresStyle?.fontFamily || "'Orbitron', sans-serif";

  return (
    <div className="overlay-root" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100vh", padding: "20px", gap: "24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Press+Start+2P&family=Roboto+Mono:wght@400;700&family=Bebas+Neue&family=Russo+One&family=Audiowide&family=Exo+2:wght@400;700&family=Rajdhani:wght@400;700&family=Chakra+Petch:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes glowPulse { 0%, 100% { text-shadow: 0 0 10px rgba(0,255,136,0.8), 0 0 20px #00ff88; } 50% { text-shadow: 0 0 20px rgba(0,255,136,0.8), 0 0 40px #00ff88, 0 0 60px #00ff88; } }
        @keyframes countdownFlash { 0%, 100% { opacity: 1; color: #ff2222; } 50% { opacity: 0.2; } }
        @keyframes countdownBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(0,255,136,0.3); } 50% { box-shadow: 0 0 20px rgba(0,255,136,0.6); } }
        html, body { background: transparent !important; overflow: hidden; }
        .overlay-root { background: transparent; }
      `}</style>

      {/* Timer Section */}
      {timer && timerStyle && (
        <div style={{
          backgroundColor: timerStyle.backgroundColor,
          borderRadius: `${timerStyle.borderRadius}px`,
          border: timerStyle.showBorder ? `${timerStyle.borderWidth}px solid ${timerStyle.borderColor}` : "none",
          padding: `${timerStyle.padding}px`,
          opacity: timerStyle.opacity / 100,
          display: "flex", flexDirection: timer.layoutDirection,
          alignItems: timer.layoutCenter ? "center" : "stretch",
          gap: `${timer.titleGap}px`,
        }}>
          {timer.showTitle && timer.title && (
            <div style={{ fontSize: `${timer.titleFontSize}px`, color: timer.titleColor, fontFamily: timerFont }}>{timer.title}</div>
          )}
          <div style={{
            fontFamily: timerFont, fontSize: `${timerStyle.fontSize}px`, color: timerStyle.textColor,
            fontWeight: timerStyle.fontWeight, letterSpacing: `${timerStyle.letterSpacing}px`,
            textShadow: timerStyle.glowEffect ? `0 0 ${timerStyle.textShadowBlur}px ${timerStyle.textShadowColor}, 0 0 ${timerStyle.glowIntensity}px ${timerStyle.glowColor}` : "none",
            animation: timerStyle.animation === "glow" ? "glowPulse 2s ease-in-out infinite" : undefined,
            ...alertAnimStyle,
          }}>
            {formatTime(displayMs, timerStyle.format, timerStyle.separatorChar)}
          </div>
        </div>
      )}

      {/* Scores Section */}
      {scores && scoresStyle && sortedPlayers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `${scoresStyle.gap}px`, opacity: scoresStyle.opacity / 100 }}>
          {scores.showTitle && <div style={{ color: scoresStyle.accentColor, fontFamily: scoresFont, fontSize: `${scoresStyle.fontSize * 1.3}px`, fontWeight: 900, textTransform: "uppercase", letterSpacing: "3px", textShadow: "0 0 20px currentColor" }}>{scores.title}</div>}
          <div style={{ display: "flex", flexDirection: scoresStyle.layout === "horizontal" ? "row" : "column", gap: `${scoresStyle.gap}px`, flexWrap: "wrap", justifyContent: "center" }}>
            {sortedPlayers.map((player, index) => (
              <div key={player.id} style={{
                backgroundColor: scoresStyle.cardBackground,
                borderRadius: `${scoresStyle.borderRadius}px`,
                border: scoresStyle.showBorder ? `2px solid ${scoresStyle.borderColor}` : "none",
                display: "flex", alignItems: "center", gap: "16px", padding: "12px 24px",
                animation: scoresStyle.animation === "glow" ? "glow 2s ease-in-out infinite" : scoresStyle.animation === "pulse" ? "pulse 2s ease-in-out infinite" : undefined,
                animationDelay: `${index * 0.1}s`,
              }}>
                {scoresStyle.showPosition && <div style={{ color: scoresStyle.accentColor, fontSize: `${scoresStyle.fontSize * 1.2}px`, fontWeight: 900, minWidth: "36px", textAlign: "center" }}>{index + 1}</div>}
                {player.image ? (
                  <img src={player.image} alt={player.name} style={{ width: `${scoresStyle.imageSize || 48}px`, height: `${scoresStyle.imageSize || 48}px`, borderRadius: `${scoresStyle.borderRadius / 2}px`, objectFit: "cover" }} />
                ) : (
                  <div style={{ color: player.color, fontSize: `${scoresStyle.fontSize * 1.2}px`, fontFamily: scoresFont, fontWeight: 700 }}>{player.name}</div>
                )}
                {scoresStyle.showScore && <div style={{ color: scoresStyle.textColor, fontSize: `${scoresStyle.fontSize * 1.6}px`, fontFamily: scoresFont, fontWeight: 900, minWidth: "60px", textAlign: "right" }}>{player.score}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
