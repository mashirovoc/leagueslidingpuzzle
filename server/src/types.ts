export type GameMode = "TIME_ATTACK" | "SCORE_ATTACK";

export interface Player {
  socketId: string;
  isHost: boolean;
  name?: string;
  progress: number;
  score: number;
  finished: boolean;
  finishTime?: number;
  isReady: boolean;
}

export interface GameSettings {
  gridSize: number;
  mode: GameMode;
  isVoidMode: boolean;
  filterType: "none" | "grayscale" | "invert" | "void" | "contrast" | "blur";
}

export interface Room {
  id: string;
  players: { [socketId: string]: Player };
  settings: GameSettings;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  championId: string;
  skinId: string;
  seed: number;
}
