// In-memory store for game state (persists while server is running)
// Uses globalThis to ensure singleton across Turbopack module instances

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
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
}

export interface GameState {
  players: Player[];
  style: OverlayStyle;
  title: string;
  showTitle: boolean;
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
};

// SSE clients
type SSEClient = (data: GameState) => void;

interface GlobalStore {
  gameState: GameState;
  clients: Set<SSEClient>;
}

const globalForStore = globalThis as unknown as { __puntosStore?: GlobalStore };

if (!globalForStore.__puntosStore) {
  globalForStore.__puntosStore = {
    gameState: {
      players: [],
      style: defaultStyle,
      title: "SCOREBOARD",
      showTitle: true,
    },
    clients: new Set(),
  };
}

const store = globalForStore.__puntosStore;

export function getState(): GameState {
  return store.gameState;
}

export function setState(newState: GameState) {
  store.gameState = newState;
  notifyClients();
}

export function updatePlayers(players: Player[]) {
  store.gameState.players = players;
  notifyClients();
}

export function updateStyle(style: OverlayStyle) {
  store.gameState.style = style;
  notifyClients();
}

export function updateTitle(title: string, showTitle: boolean) {
  store.gameState.title = title;
  store.gameState.showTitle = showTitle;
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
