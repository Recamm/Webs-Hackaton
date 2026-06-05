// Scores store - In-memory state for the scoreboard (persists while server is running)

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  image: string;
}

export interface OverlayStyle {
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
  position: "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
  imageSize: number;
}

export interface GameState {
  players: Player[];
  style: OverlayStyle;
  title: string;
  showTitle: boolean;
  manualOrder: boolean;
}

export interface ScoresScene {
  id: string;
  name: string;
  state: GameState;
}

const defaultStyle: OverlayStyle = {
  fontFamily: "'Orbitron', sans-serif",
  customFont: "",
  fontSize: 24,
  textColor: "#ffffff",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  cardBackground: "rgba(30, 30, 30, 0.9)",
  accentColor: "#00ff88",
  borderRadius: 12,
  showBorder: true,
  borderColor: "#00ff88",
  layout: "vertical",
  opacity: 100,
  gap: 8,
  padding: 16,
  showScore: true,
  showPosition: true,
  animation: "glow",
  uniformCardSize: false,
  position: "top-center",
  imageSize: 48,
};

type SSEClient = (data: GameState) => void;

interface GlobalStore {
  gameState: GameState;
  clients: Set<SSEClient>;
  scenes: ScoresScene[];
}

const globalForStore = globalThis as unknown as { __allScoresStore?: GlobalStore };

if (!globalForStore.__allScoresStore) {
  globalForStore.__allScoresStore = {
    gameState: {
      players: [],
      style: defaultStyle,
      title: "SCOREBOARD",
      showTitle: true,
      manualOrder: false,
    },
    clients: new Set(),
    scenes: [],
  };
}

const store = globalForStore.__allScoresStore;

export function getState(): GameState {
  return store.gameState;
}

export function setState(newState: GameState) {
  store.gameState = newState;
  notifyClients();
}

export function addClient(client: SSEClient) {
  store.clients.add(client);
}

export function removeClient(client: SSEClient) {
  store.clients.delete(client);
}

function notifyClients() {
  store.clients.forEach((client) => client(store.gameState));
}

// Scenes
export function getScenes(): ScoresScene[] {
  return store.scenes;
}

export function saveScene(name: string): ScoresScene {
  const scene: ScoresScene = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    state: JSON.parse(JSON.stringify(store.gameState)),
  };
  store.scenes.push(scene);
  return scene;
}

export function loadScene(id: string): boolean {
  const scene = store.scenes.find((s) => s.id === id);
  if (!scene) return false;
  store.gameState = JSON.parse(JSON.stringify(scene.state));
  notifyClients();
  return true;
}

export function deleteScene(id: string): boolean {
  const index = store.scenes.findIndex((s) => s.id === id);
  if (index === -1) return false;
  store.scenes.splice(index, 1);
  return true;
}
