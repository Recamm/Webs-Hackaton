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

function getAnimationCSS(animation: string): string {
  switch (animation) {
    case "pulse":
      return "animate-pulse";
    case "bounce":
      return "animate-bounce";
    default:
      return "";
  }
}

export default function OverlayPage() {
  const [state, setState] = useState<TimerState | null>(null);
  const [displayMs, setDisplayMs] = useState(0);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      const data: TimerState = JSON.parse(e.data);
      setState(data);
      setDisplayMs(data.currentMs);
    };
    return () => es.close();
  }, []);

  // Local interpolation for smooth display when running
  useEffect(() => {
    if (!state || state.status !== "running") return;

    const interval = setInterval(() => {
      if (!state.startedAt) return;
      const elapsed = Date.now() - state.startedAt;
      if (state.mode === "countup") {
        setDisplayMs(state.currentMs + elapsed);
      } else {
        const remaining = state.currentMs - elapsed;
        setDisplayMs(remaining > 0 ? remaining : 0);
      }
    }, 33); // ~30fps

    return () => clearInterval(interval);
  }, [state]);

  if (!state) {
    return <div className="min-h-screen" />;
  }

  const style = state.style;
  const animClass = getAnimationCSS(style.animation);

  const glowKeyframes = style.animation === "glow" ? (
    <style>{`
      @keyframes glowPulse {
        0%, 100% { text-shadow: 0 0 ${style.textShadowBlur}px ${style.textShadowColor}, 0 0 ${style.glowIntensity}px ${style.glowColor}; }
        50% { text-shadow: 0 0 ${style.textShadowBlur * 2}px ${style.textShadowColor}, 0 0 ${style.glowIntensity * 2}px ${style.glowColor}, 0 0 ${style.glowIntensity * 3}px ${style.glowColor}; }
      }
    `}</style>
  ) : null;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
      {glowKeyframes}
      <div
        className={animClass}
        style={{
          backgroundColor: style.backgroundColor,
          borderRadius: `${style.borderRadius}px`,
          border: style.showBorder
            ? `${style.borderWidth}px solid ${style.borderColor}`
            : "none",
          padding: `${style.padding}px`,
          opacity: style.opacity / 100,
          boxShadow: style.shadowBlur > 0
            ? `0 0 ${style.shadowBlur}px ${style.shadowColor}`
            : "none",
        }}
      >
        {state.showTitle && state.title && (
          <div
            style={{
              fontSize: `${state.titleFontSize}px`,
              color: state.titleColor,
              textAlign: "center",
              marginBottom: "8px",
              fontFamily: style.fontFamily === "custom" ? style.customFont : style.fontFamily,
            }}
          >
            {state.title}
          </div>
        )}
        <div
          style={{
            fontFamily: style.fontFamily === "custom" ? style.customFont : style.fontFamily,
            fontSize: `${style.fontSize}px`,
            color: style.textColor,
            fontWeight: style.fontWeight,
            letterSpacing: `${style.letterSpacing}px`,
            textShadow: style.glowEffect
              ? `0 0 ${style.textShadowBlur}px ${style.textShadowColor}, 0 0 ${style.glowIntensity}px ${style.glowColor}`
              : "none",
            textAlign: "center",
            animation: style.animation === "glow" ? "glowPulse 2s ease-in-out infinite" : undefined,
          }}
        >
          {formatTime(displayMs, style.format, style.separatorChar)}
        </div>
      </div>
    </div>
  );
}
