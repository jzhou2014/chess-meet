export type PlayerType = 'Human' | 'LLM' | 'Stockfish';
export type PlayerProvider = "OpenAI" | "Google" | "Anthropic" | "Mixtral" | "Stockfish";

// Add a new interface for Stockfish configuration
export interface StockfishConfig {
  // skillLevel?: number; // 0-20
  depth?: number;      // search depth
}

export interface MultiModalPlayer {
  provider: PlayerProvider;
  model: string;
  config?: StockfishConfig; // Optional Stockfish configuration
}

export interface NextMoveInput {
  currentStateImage: string;
  allMoves: string[];
  provider: PlayerProvider;
  model: string;
  color: "White" | "Black";
  lastMove: string;
  apiKey?: string;
  config?: StockfishConfig;
}

export interface IPlayer {
  color: 'White' | 'Black';
  player?: MultiModalPlayer; // Make this optional
  apiKey?: string; // Make this optional
}