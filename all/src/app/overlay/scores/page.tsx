"use client";

import { useEffect, useState } from "react";

interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  image: string;
}

interface OverlayStyle {
  fontFamily: string;
  customFont: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  cardBackground: string;
  accentColor: string;
  borderRadius: number;
  showBorder: boolean;
  borderColor: string;
  layout: "horizontal" | "vertical" | "grid";
  opacity: number;
  gap: number;
  padding: number;
  showScore: boolean;
  showPosition: boolean;
  animation: "none" | "pulse" | "slide" | "glow";
  uniformCardSize: boolean;
  position: string;
  imageSize: number;
}

interface GameState {
  players: Player[];
  style: OverlayStyle;
  title: string;
  showTitle: boolean;
  manualOrder: boolean;
}

export default function ScoresOverlayPage() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/scores/stream");
    es.onmessage = (e) => {
      try { setState(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => { es.close(); setTimeout(() => window.location.reload(), 2000); };
    return () => es.close();
  }, []);

  if (!state) return <div className="overlay-root" />;

  const { players, style, title, showTitle } = state;
  const sortedPlayers = state.manualOrder ? [...players] : [...players].sort((a, b) => b.score - a.score);
  const effectiveFont = style.customFont ? `'${style.customFont}', sans-serif` : style.fontFamily;
  const customFontUrl = style.customFont ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(style.customFont)}:wght@400;700;900&display=swap` : "";

  const positionStyles: Record<string, React.CSSProperties> = {
    "top-left": { justifyContent: "flex-start", alignItems: "flex-start" },
    "top-center": { justifyContent: "flex-start", alignItems: "center" },
    "top-right": { justifyContent: "flex-start", alignItems: "flex-end" },
    "center-left": { justifyContent: "center", alignItems: "flex-start" },
    "center": { justifyContent: "center", alignItems: "center" },
    "center-right": { justifyContent: "center", alignItems: "flex-end" },
    "bottom-left": { justifyContent: "flex-end", alignItems: "flex-start" },
    "bottom-center": { justifyContent: "flex-end", alignItems: "center" },
    "bottom-right": { justifyContent: "flex-end", alignItems: "flex-end" },
  };

  const posStyle = positionStyles[style.position || "top-center"] || positionStyles["top-center"];
  const layoutClass = style.layout === "horizontal" ? "overlay-horizontal" : style.layout === "grid" ? "overlay-grid" : "overlay-vertical";
  const animationClass = style.animation !== "none" ? `anim-${style.animation}` : "";

  return (
    <div className="overlay-root" style={{ fontFamily: effectiveFont, padding: `${style.padding}px`, gap: `${style.gap}px`, opacity: style.opacity / 100, ...posStyle }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Press+Start+2P&family=Russo+One&family=Bebas+Neue&family=Rajdhani:wght@400;700&family=Audiowide&family=Exo+2:wght@400;700&family=Chakra+Petch:wght@400;700&display=swap" rel="stylesheet" />
      {customFontUrl && <link href={customFontUrl} rel="stylesheet" />}

      {showTitle && <div className="overlay-title" style={{ color: style.accentColor, fontFamily: effectiveFont, fontSize: `${style.fontSize * 1.3}px` }}>{title}</div>}

      <div className={`overlay-players ${layoutClass}`} style={{ gap: `${style.gap}px` }}>
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className={`overlay-player-card ${animationClass} ${style.uniformCardSize ? "overlay-uniform" : ""}`} style={{
            backgroundColor: style.cardBackground,
            borderRadius: `${style.borderRadius}px`,
            border: style.showBorder ? `2px solid ${style.borderColor}` : "none",
            animationDelay: `${index * 0.1}s`,
          }}>
            {style.showPosition && <div className="overlay-position" style={{ color: style.accentColor, fontSize: `${style.fontSize * 1.2}px` }}>{index + 1}</div>}
            {player.image ? (
              <img src={player.image} alt={player.name} className="overlay-player-image" style={{ width: `${style.imageSize || 48}px`, height: `${style.imageSize || 48}px`, borderRadius: `${style.borderRadius / 2}px` }} />
            ) : (
              <div className="overlay-player-name" style={{ color: player.color, fontSize: `${style.fontSize * 1.2}px`, fontFamily: effectiveFont }}>{player.name}</div>
            )}
            {style.showScore && <div className="overlay-score" style={{ color: style.textColor, fontSize: `${style.fontSize * 1.6}px`, fontFamily: effectiveFont }}>{player.score}</div>}
          </div>
        ))}
      </div>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: transparent !important; overflow: hidden; width: 100%; height: 100%; }
        .overlay-root { display: flex; flex-direction: column; width: 100%; min-height: 100vh; align-items: center; }
        .overlay-title { font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; text-shadow: 0 0 20px currentColor; }
        .overlay-players { display: flex; width: 100%; justify-content: center; }
        .overlay-vertical { flex-direction: column; align-items: center; }
        .overlay-horizontal { flex-direction: row; justify-content: center; flex-wrap: wrap; align-items: stretch; }
        .overlay-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .overlay-player-card { display: flex; align-items: center; gap: 16px; padding: 12px 24px; transition: all 0.3s ease; }
        .overlay-position { font-weight: 900; min-width: 36px; text-align: center; opacity: 0.8; }
        .overlay-player-name { flex: 1; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .overlay-score { font-weight: 900; min-width: 60px; text-align: right; }
        .overlay-uniform { width: 100%; justify-content: space-between; }
        .overlay-player-image { object-fit: cover; flex-shrink: 0; }
        .anim-pulse { animation: pulse 2s ease-in-out infinite; }
        .anim-slide { animation: slideIn 0.6s ease-out both; }
        .anim-glow { animation: glow 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(0,255,136,0.3); } 50% { box-shadow: 0 0 20px rgba(0,255,136,0.6); } }
      `}</style>
    </div>
  );
}
