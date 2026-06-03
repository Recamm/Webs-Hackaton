"use client";

import { useEffect, useState } from "react";
import { GameState } from "@/lib/store";

export default function OverlayPage() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      try {
        const data: GameState = JSON.parse(event.data);
        setState(data);
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    return () => eventSource.close();
  }, []);

  if (!state) {
    return <div className="overlay-loading" />;
  }

  const { players, style, title, showTitle } = state;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const effectiveFont = style.customFont
    ? `'${style.customFont}', sans-serif`
    : style.fontFamily;

  const customFontUrl = style.customFont
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(style.customFont)}:wght@400;700;900&display=swap`
    : "";

  const containerStyle: React.CSSProperties = {
    fontFamily: effectiveFont,
    padding: `${style.padding}px`,
    gap: `${style.gap}px`,
    opacity: style.opacity / 100,
  };

  const layoutClass =
    style.layout === "horizontal"
      ? "overlay-horizontal"
      : style.layout === "grid"
      ? "overlay-grid"
      : "overlay-vertical";

  const animationClass = style.animation !== "none" ? `anim-${style.animation}` : "";

  return (
    <div className="overlay-root" style={containerStyle}>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Press+Start+2P&family=Russo+One&family=Bebas+Neue&family=Rajdhani:wght@400;700&family=Audiowide&family=Exo+2:wght@400;700&family=Chakra+Petch:wght@400;700&display=swap"
        rel="stylesheet"
      />
      {customFontUrl && (
        <link href={customFontUrl} rel="stylesheet" />
      )}

      {showTitle && (
        <div
          className="overlay-title"
          style={{
            color: style.accentColor,
            fontFamily: effectiveFont,
            fontSize: `${style.fontSize * 1.3}px`,
          }}
        >
          {title}
        </div>
      )}

      <div className={`overlay-players ${layoutClass}`} style={{ gap: `${style.gap}px` }}>
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`overlay-player-card ${animationClass}`}
            style={{
              backgroundColor: style.cardBackground,
              borderRadius: `${style.borderRadius}px`,
              border: style.showBorder
                ? `2px solid ${style.borderColor}`
                : "none",
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {style.showPosition && (
              <div
                className="overlay-position"
                style={{ color: style.accentColor }}
              >
                {index + 1}
              </div>
            )}
            <div
              className="overlay-player-name"
              style={{
                color: player.color,
                fontSize: `${style.fontSize}px`,
                fontFamily: effectiveFont,
              }}
            >
              {player.name}
            </div>
            {style.showScore && (
              <div
                className="overlay-score"
                style={{
                  color: style.textColor,
                  fontSize: `${style.fontSize * 1.2}px`,
                  fontFamily: effectiveFont,
                }}
              >
                {player.score}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          background: transparent !important;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }

        .overlay-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-height: 100vh;
        }

        .overlay-loading {
          background: transparent;
          width: 100%;
          height: 100vh;
        }

        .overlay-title {
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 12px;
          text-shadow: 0 0 20px currentColor;
        }

        .overlay-players {
          display: flex;
          width: 100%;
        }

        .overlay-vertical {
          flex-direction: column;
          align-items: center;
        }

        .overlay-horizontal {
          flex-direction: row;
          justify-content: center;
          flex-wrap: wrap;
        }

        .overlay-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        .overlay-player-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          transition: all 0.3s ease;
        }

        .overlay-position {
          font-size: 1.5em;
          font-weight: 900;
          min-width: 30px;
          text-align: center;
          opacity: 0.8;
        }

        .overlay-player-name {
          flex: 1;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .overlay-score {
          font-weight: 900;
          min-width: 50px;
          text-align: right;
        }

        /* Animations */
        .anim-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        .anim-slide {
          animation: slideIn 0.6s ease-out both;
        }

        .anim-glow {
          animation: glow 3s ease-in-out infinite alternate;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes glow {
          from {
            box-shadow: 0 0 5px rgba(255,255,255,0.1);
          }
          to {
            box-shadow: 0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(255,255,255,0.05);
          }
        }
      `}</style>
    </div>
  );
}
