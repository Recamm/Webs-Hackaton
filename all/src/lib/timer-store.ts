// Timer store - In-memory state for the timer (persists while server is running)

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
export type LayoutDirection = "column" | "column-reverse" | "row" | "row-reverse";

export interface TimerState {
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
  layoutDirection: LayoutDirection;
  layoutCenter: boolean;
  countdownAlert: boolean;
  countdownAlertStyle: "flash" | "blink" | "none";
}

export interface TimerScene {
  id: string;
  name: string;
  state: TimerState;
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

type SSEClient = (data: TimerState) => void;

interface GlobalStore {
  timerState: TimerState;
  clients: Set<SSEClient>;
  interval: ReturnType<typeof setInterval> | null;
  scenes: TimerScene[];
}

const globalForStore = globalThis as unknown as { __allTimerStore?: GlobalStore };

if (!globalForStore.__allTimerStore) {
  globalForStore.__allTimerStore = {
    timerState: {
      mode: "countup",
      status: "stopped",
      currentMs: 0,
      countdownFrom: 300000,
      startedAt: null,
      style: defaultStyle,
      title: "",
      showTitle: false,
      titleFontSize: 24,
      titleColor: "#ffffff",
      titleGap: 8,
      layoutDirection: "column",
      layoutCenter: true,
      countdownAlert: true,
      countdownAlertStyle: "flash",
    },
    clients: new Set(),
    interval: null,
    scenes: [],
  };
}

const store = globalForStore.__allTimerStore;

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
  if (newState.status === "running") startTicking();
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

// Scenes
export function getScenes(): TimerScene[] {
  return store.scenes;
}

export function saveScene(name: string): TimerScene {
  const scene: TimerScene = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    state: JSON.parse(JSON.stringify(store.timerState)),
  };
  store.scenes.push(scene);
  return scene;
}

export function loadScene(id: string): boolean {
  const scene = store.scenes.find((s) => s.id === id);
  if (!scene) return false;
  store.timerState = JSON.parse(JSON.stringify(scene.state));
  store.timerState.status = "stopped";
  store.timerState.startedAt = null;
  notifyClients();
  return true;
}

export function deleteScene(id: string): boolean {
  const index = store.scenes.findIndex((s) => s.id === id);
  if (index === -1) return false;
  store.scenes.splice(index, 1);
  return true;
}
