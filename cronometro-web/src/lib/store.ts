// In-memory store for timer state (persists while server is running)
// Uses globalThis to ensure singleton across Turbopack module instances

export interface TimerStyle {
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

export type TimerMode = "countup" | "countdown";
export type TimerStatus = "stopped" | "running" | "paused";

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  // elapsed ms for countup, remaining ms for countdown
  currentMs: number;
  // countdown target in ms
  countdownFrom: number;
  // timestamp when timer was last started/resumed
  startedAt: number | null;
  style: TimerStyle;
  title: string;
  showTitle: boolean;
  titleFontSize: number;
  titleColor: string;
}

const defaultStyle: TimerStyle = {
  fontFamily: "'Orbitron', sans-serif",
  customFont: "",
  fontSize: 72,
  textColor: "#00ff88",
  backgroundColor: "rgba(0, 0, 0, 0)",
  borderRadius: 12,
  showBorder: false,
  borderColor: "#00ff88",
  borderWidth: 2,
  opacity: 100,
  padding: 20,
  shadowColor: "rgba(0, 255, 136, 0.3)",
  shadowBlur: 20,
  showMilliseconds: false,
  separatorChar: ":",
  letterSpacing: 4,
  fontWeight: "700",
  textShadowColor: "rgba(0, 255, 136, 0.8)",
  textShadowBlur: 10,
  glowEffect: true,
  glowColor: "#00ff88",
  glowIntensity: 20,
  animation: "none",
  format: "mm:ss",
};

// SSE clients
type SSEClient = (data: TimerState) => void;

interface GlobalStore {
  timerState: TimerState;
  clients: Set<SSEClient>;
  interval: ReturnType<typeof setInterval> | null;
}

const globalForStore = globalThis as unknown as { __cronometroStore?: GlobalStore };

if (!globalForStore.__cronometroStore) {
  globalForStore.__cronometroStore = {
    timerState: {
      mode: "countup",
      status: "stopped",
      currentMs: 0,
      countdownFrom: 300000, // 5 min default
      startedAt: null,
      style: defaultStyle,
      title: "",
      showTitle: false,
      titleFontSize: 24,
      titleColor: "#ffffff",
    },
    clients: new Set(),
    interval: null,
  };
}

const store = globalForStore.__cronometroStore;

function startTicking() {
  if (store.interval) return;
  store.interval = setInterval(() => {
    if (store.timerState.status !== "running" || !store.timerState.startedAt) return;

    const now = Date.now();
    const elapsed = now - store.timerState.startedAt;

    if (store.timerState.mode === "countup") {
      store.timerState.currentMs += elapsed;
    } else {
      store.timerState.currentMs -= elapsed;
      if (store.timerState.currentMs <= 0) {
        store.timerState.currentMs = 0;
        store.timerState.status = "stopped";
        store.timerState.startedAt = null;
      }
    }

    store.timerState.startedAt = now;
    notifyClients();
  }, 50);
}

export function getState(): TimerState {
  return store.timerState;
}

export function setState(newState: TimerState) {
  store.timerState = newState;
  if (newState.status === "running") {
    startTicking();
  }
  notifyClients();
}

export function startTimer() {
  if (store.timerState.status === "running") return;
  if (store.timerState.mode === "countdown" && store.timerState.status === "stopped") {
    store.timerState.currentMs = store.timerState.countdownFrom;
  }
  store.timerState.status = "running";
  store.timerState.startedAt = Date.now();
  startTicking();
  notifyClients();
}

export function pauseTimer() {
  if (store.timerState.status !== "running") return;
  // Compute final elapsed before pausing
  if (store.timerState.startedAt) {
    const elapsed = Date.now() - store.timerState.startedAt;
    if (store.timerState.mode === "countup") {
      store.timerState.currentMs += elapsed;
    } else {
      store.timerState.currentMs -= elapsed;
      if (store.timerState.currentMs < 0) store.timerState.currentMs = 0;
    }
  }
  store.timerState.status = "paused";
  store.timerState.startedAt = null;
  notifyClients();
}

export function resetTimer() {
  store.timerState.status = "stopped";
  store.timerState.startedAt = null;
  store.timerState.currentMs = store.timerState.mode === "countdown" ? store.timerState.countdownFrom : 0;
  notifyClients();
}

export function updateStyle(style: TimerStyle) {
  store.timerState.style = style;
  notifyClients();
}

export function addClient(client: SSEClient) {
  store.clients.add(client);
}

export function removeClient(client: SSEClient) {
  store.clients.delete(client);
}

function notifyClients() {
  store.clients.forEach((client) => client(store.timerState));
}
