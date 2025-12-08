export type Champion = {
  id: string;
  name: string;
  title: string;
};

export interface DDragonChampionRaw {
  id: string;
  name: string;
  title: string;
  [key: string]: unknown;
}

export type Skin = {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
};

export type FilterType =
  | "none"
  | "grayscale"
  | "invert"
  | "void"
  | "contrast"
  | "blur";

export type GameMode = "TIME_ATTACK" | "SCORE_ATTACK";

export type AppState = "MENU" | "CONNECTING" | "SETUP" | "GAME";

export interface Player {
  socketId: string;
  isHost: boolean;
  name: string;
  isReady: boolean;
  progress: number;
  score: number;
  finished: boolean;
  finishTime?: number;
}

export interface RoomSettings {
  gridSize: number;
  mode: GameMode;
  isVoidMode: boolean;
  filterType: FilterType;
}

export interface Room {
  id: string;
  players: { [socketId: string]: Player };
  settings: RoomSettings;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  championId: string;
  skinId: string;
  seed: number;
}

export interface AlertState {
  open: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  showCancel?: boolean;
}
