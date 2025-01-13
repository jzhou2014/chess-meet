import { MultiModalPlayer } from "./types";

export const players: MultiModalPlayer[] = [
  { provider: "OpenAI", model: "gpt-4o" },
  { provider: "OpenAI", model: "gpt-4o-mini" },
  { provider: "OpenAI", model: "gpt-4-turbo" },
  { provider: "OpenAI", model: "gpt-3.5-turbo-instruct" },
  { provider: "OpenAI", model: "gpt-3.5-turbo" },
  { provider: "Mixtral", model: "pixtral-12b-2409" },
  { provider: "Anthropic", model: "claude-3-5-sonnet-20240620" },
  { provider: "Google", model: "gemini-1.5-flash" },
  { provider: "Google", model: "gemini-1.5-pro" },
  { provider: "Stockfish", model: "Stockfish 16", config: { depth: 18 } },
  { provider: "Stockfish", model: "Stockfish 16 (Medium)", config: { depth: 8 } },
  { provider: "Stockfish", model: "Stockfish 16 (Easy)", config: { depth: 2 } },
];
