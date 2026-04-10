export type LLMProvider = "OpenAI" | "Google" | "Anthropic" | "Mixtral" | "Human" | "Stockfish" | "Ollama";

export interface MultiModalLLM {
  provider: LLMProvider;
  model: string;
}

export interface NextMoveInput {
  currentStateImage: string;
  allMoves: string[];
  provider: LLMProvider;
  model: string;
  color: "White" | "Black";
  lastMove: string;
  apiKey: string;
  fen: string;
}

export interface IPlayer {
  color: "White" | "Black";
  llm: MultiModalLLM;
  apiKey: string;
}
