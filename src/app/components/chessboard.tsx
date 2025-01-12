"use client";

import html2canvas from "html2canvas";
import { forwardRef, useState, useMemo, useEffect, useRef, JSX } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { describeMove } from "../utils/moves";
import { getNextMove } from "../controllers/llm";
import { IPlayer } from "../utils/types";
import { llms } from "../utils/models";
import Image from "next/image";

const LLM_THINK_DELAY = 0.5;
const LOOP_DELAY = 0.5;

function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

const CustomSquareRenderer = forwardRef<HTMLDivElement, CustomSquareProps>(
    (props, ref) => {
      const { children, square, style } = props;
      return (
          <div
              ref={ref}
              style={{
                ...style,
                position: "relative",
              }}
          >
            {children}
            <div
                className="pb-4 pt-1 px-2"
                style={{
                  zIndex: 100,
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 18,
                  width: 18,
                  backgroundColor: "#312e81",
                  color: "#fff",
                  fontSize: 14,
                  borderRadius: 4,
                }}
            >
              {square}
            </div>
          </div>
      );
    }
);
CustomSquareRenderer.displayName = "CustomSquareRenderer";

function ChessBoard() {
  const game = useMemo(() => new Chess(), []);
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [allMovesString, setAllMovesString] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false); // Play/Pause state
  const isPlayingRef = useRef(false);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(true); // Game over state
  const isGameOverRef = useRef(true);
  const endDivRef = useRef<HTMLDivElement>(null);

  const [thinkingMessage, setThinkingMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const isMoveInProgress = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const whiteModalRef = useRef<HTMLSelectElement | null>(null);
  const blackModalRef = useRef<HTMLSelectElement | null>(null);
  const whiteApiKeyRef = useRef<HTMLInputElement | null>(null);
  const blackApiKeyRef = useRef<HTMLInputElement | null>(null);

  const playersRef = useRef<Record<string, IPlayer | undefined>>({
    w: { color: "White", llm: llms[0], apiKey: "" },
    b: { color: "Black", llm: llms[0], apiKey: "" },
  });

  useEffect(() => {
    if (endDivRef.current) {
      endDivRef.current.scrollIntoView();
    }
  }, [allMovesString]);

  const handleSave = async () => {
    const whiteLlm = llms.find((llm) => llm.model === whiteModalRef.current?.value);
    const blackLlm = llms.find((llm) => llm.model === blackModalRef.current?.value);
    const whiteApiKey = whiteApiKeyRef.current?.value ?? "";
    const blackApiKey = blackApiKeyRef.current?.value ?? "";

    if (whiteLlm && blackLlm) {
      playersRef.current = {
        w: {
          color: "White",
          llm: whiteLlm,
          apiKey: whiteApiKey,
        },
        b: {
          color: "Black",
          llm: blackLlm,
          apiKey: blackApiKey,
        },
      };
      setSavedMessage("Settings saved successfully!");
      await delay(2);
      setSavedMessage("");
    } else {
      setErrorMessage("Error: LLM selection is invalid.");
      await delay(2);
      setErrorMessage("");
    }
  };

  const startGameLoop = async () => {
    console.log("Starting loop...");
    setHasGameStarted(true);
    isPlayingRef.current = true;
    isGameOverRef.current = false;
    setIsGameOver(false);
    setIsPlaying(true);
    while (true) {
      if (isGameOverRef.current) {
        console.log("Game over");
        break;
      }
      if (isPlayingRef.current) {
        await makeMove();
      }
      await delay(LOOP_DELAY);
    }
    console.log("Game loop ended");
  };

  const makeMove = async () => {
    isMoveInProgress.current = true;
    console.log("Making move...");
    const moves = game.moves();
    let currentTurn = "";
    let lastTurn = "";
    const turnKey = game.turn();
    if (game.turn() === "w") {
      currentTurn = "White";
      lastTurn = "Black";
    } else {
      currentTurn = "Black";
      lastTurn = "White";
    }
    let move = "";
    if (moves.length === 1) move = moves[0];
    else {
      const canvas = await html2canvas(document.getElementById("cb")!);
      const img = canvas.toDataURL("image/png");
      const movesToStrings = moves.map((move) => describeMove(move));
      for (let retry = 0; retry < 1; retry++) {
        try {
          console.log(`Trying to get next move (try: ${retry + 1})...`);
          const previousMoves = game.history();
          const lastMove = previousMoves[previousMoves.length - 1] ?? "";
          const lastMoveString = lastMove
              ? `${lastTurn}: ${describeMove(lastMove)}`
              : "No previous moves yet.";
          setThinkingMessage(`${currentTurn} is thinking...`);
          const provider = playersRef.current[turnKey]?.llm.provider;
          const model = playersRef.current[turnKey]?.llm.model;
          const apiKey = playersRef.current[turnKey]?.apiKey;
          if (!provider || !model || !apiKey) {
            throw new Error("Provider, model, or API key is undefined");
          }
          const nextMove = await getNextMove({
            currentStateImage: img,
            allMoves: movesToStrings,
            provider,
            model,
            color: game.turn() === "w" ? "White" : "Black",
            lastMove: lastMoveString,
            apiKey,
          });
          await delay(LLM_THINK_DELAY);
          setThinkingMessage("");
          if (nextMove < 0 || nextMove >= moves.length) {
            throw new Error(`Invalid move: ${nextMove}`);
          }
          move = moves[nextMove];
          break;
        } catch (e) {
          console.error(`Error: ${e}. Trying again...`);
        } finally {
          isMoveInProgress.current = false;
          setThinkingMessage("");
        }
      }
    }
    try {
      const moveString = `${currentTurn}: ${describeMove(move)}`;
      if (!isGameOverRef.current) {
        game.move(move);
      } else return;
      setAllMovesString((prev) => [...prev, moveString]);
      setGamePosition(game.fen());
      if (game.isGameOver()) {
        let reason = "";
        if (game.isCheckmate()) reason = "Checkmate";
        else if (game.isStalemate()) reason = "Stalemate";
        else if (game.isDraw()) reason = "Draw";
        const finalStringToDisplay = `Game Over: ${reason}.${
            !game.isDraw() ? ` Winner: ${currentTurn}.` : ""
        }`;
        setResultMessage(finalStringToDisplay);
        setAllMovesString((prev) => [...prev, finalStringToDisplay]);
        setIsGameOver(true);
        isGameOverRef.current = true;
      }
      isMoveInProgress.current = false;
    } catch (e) {
      console.error(e);
      isMoveInProgress.current = false;
      resetGame();
      setErrorMessage(
          "Error occured finding next move, make sure API key is correct."
      );
      await delay(3);
      setErrorMessage("");
    } finally {
      isMoveInProgress.current = false;
    }
  };

  const togglePlayPause = () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
    } else {
      isPlayingRef.current = true;
    }
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    isMoveInProgress.current = false;
    game.reset();
    setGamePosition(game.fen());
    setAllMovesString([]);
    setIsGameOver(true);
    isGameOverRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;
    setResultMessage("");
    setThinkingMessage("");
    setHasGameStarted(false);
    console.log("Game reset!");
  };

  const [activeSquare, setActiveSquare] = useState("");
  const threeDPieces = useMemo(() => {
    const pieces = [
      { piece: "wP", pieceHeight: 1 },
      { piece: "wN", pieceHeight: 1.2 },
      { piece: "wB", pieceHeight: 1.2 },
      { piece: "wR", pieceHeight: 1.2 },
      { piece: "wQ", pieceHeight: 1.5 },
      { piece: "wK", pieceHeight: 1.6 },
      { piece: "bP", pieceHeight: 1 },
      { piece: "bN", pieceHeight: 1.2 },
      { piece: "bB", pieceHeight: 1.2 },
      { piece: "bR", pieceHeight: 1.2 },
      { piece: "bQ", pieceHeight: 1.5 },
      { piece: "bK", pieceHeight: 1.6 },
    ];
    
    const pieceComponents: Record<string, (props: { squareWidth: number }) => JSX.Element> = {};
    pieces.forEach(({ piece, pieceHeight }) => {
      pieceComponents[piece] = ({ squareWidth }: { squareWidth: number }) => (
          <div
              style={{
                width: squareWidth,
                height: squareWidth,
                position: "relative",
                pointerEvents: "none",
              }}
          >
            <Image
                src={`/media/3d-pieces/${piece}.webp`}
                alt={`${piece} piece`}
                width={squareWidth}
                height={pieceHeight * squareWidth}
                style={{
                  position: "absolute",
                  bottom: `${0.2 * squareWidth}px`,
                  height: `${pieceHeight * squareWidth}px`,
                  objectFit: piece[1] === "K" ? "contain" : "cover",
                }}
            />
          </div>
      );
    });
    return pieceComponents;
  }, []);

  return (
      <div className="flex flex-row gap-10 items-start justify-start">
        <div className="flex flex-col gap-2 ml-10 sticky mt-5 top-20 bg-gray-100 pb-3 px-3 pt-2 rounded-lg">
          <h3 className="text-xl font-semibold text-center">Chess Board</h3>
          <div id={"cb"} className="h-[450px] w-[450px]">
            <Chessboard
                id="Styled3DBoard"
                position={gamePosition}
                arePiecesDraggable={false}
                showBoardNotation={false}
                customSquare={CustomSquareRenderer}
                autoPromoteToQueen={true}
                customBoardStyle={{
                  transform: "rotateX(27.5deg)",
                  transformOrigin: "center",
                  // border: "16px solid #b8836f",
                  // borderStyle: "outset",
                  // borderRightColor: " #b27c67",
                  borderRadius: "4px",
                  boxShadow: "rgba(0, 0, 0, 0.5) 2px 24px 24px 8px",
                  // borderRightWidth: "2px",
                  // borderLeftWidth: "2px",
                  // borderTopWidth: "0px",
                  // borderBottomWidth: "18px",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  // padding: "8px 8px 12px",
                  background: "#e0c094",
                  backgroundImage: 'url("/media/wood-pattern.png")',
                  backgroundSize: "cover",
                }}
                customPieces={threeDPieces}
                customLightSquareStyle={{
                  backgroundColor: "#e0c094",
                  backgroundImage: 'url("/media/wood-pattern.png")',
                  backgroundSize: "cover",
                }}
                customDarkSquareStyle={{
                  backgroundColor: "#865745",
                  backgroundImage: 'url("/media/wood-pattern.png")',
                  backgroundSize: "cover",
                }}
                animationDuration={500}
                customSquareStyles={{
                  [activeSquare]: {
                    boxShadow: "inset 0 0 1px 6px rgba(255,255,255,0.75)",
                  },
                }}
                onMouseOverSquare={(sq) => setActiveSquare(sq)}
                onMouseOutSquare={() => setActiveSquare("")}
            />
          </div>
          <div className="flex justify-between items-center action-box">
            {hasGameStarted ? (
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={togglePlayPause}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
            ) : (
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={startGameLoop}
                >
                  Start
                </button>
            )}
            {!isPlaying && hasGameStarted && <span>Game Paused</span>}
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={resetGame}
            >
              Reset
            </button>
          </div>
          {isGameOver && <div>{resultMessage}</div>}
          {errorMessage && <div className="text-red-500">{errorMessage}</div>}
        </div>
        <div className="flex flex-col flex-grow gap-2 justify-start mt-5 bg-gray-100 rounded-lg w-full pt-3 min-h-[90vh] h-full">
          <h3 className="text-xl font-semibold text-center">Moves</h3>
          {allMovesString.map((moveString, index) => (
              <div className="mx-3" key={index}>
                {moveString}
              </div>
          ))}
          <div ref={endDivRef} className="mb-10 mx-3">
            {thinkingMessage}
          </div>
        </div>
        <div className="flex flex-col items-start p-6 bg-gray-100 rounded-lg shadow-lg top-20 mt-5 sticky mr-10 w-full">
          <div className="w-full">
            <h2 className="text-2xl font-semibold mb-4 text-center">Settings</h2>
          </div>

          <div className="w-full mb-6">
            <h3 className="text-lg font-medium mb-2">White</h3>
            <div className="flex flex-col mb-4">
              <label htmlFor="white-llm" className="mb-1">
                Select Player:
              </label>
              <select
                  id="white-llm"
                  ref={whiteModalRef}
                  className="border border-gray-300 rounded p-2"
              >
                {llms.map((llm) => (
                    <option key={llm.model} value={llm.model}>
                      {llm.model}
                    </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="white-api-key" className="mb-1">
                API Key:
              </label>
              <input
                  type="password"
                  ref={whiteApiKeyRef}
                  id="white-api-key"
                  className="border border-gray-300 rounded p-2"
                  placeholder="Enter API Key"
              />
            </div>
          </div>

          <div className="w-full">
            <h3 className="text-lg font-medium mb-2">Black</h3>
            <div className="flex flex-col mb-4">
              <label htmlFor="black-llm" className="mb-1">
                Select Player:
              </label>
              <select
                  id="black-llm"
                  ref={blackModalRef}
                  className="border border-gray-300 rounded p-2"
              >
                {llms.map((llm) => (
                    <option key={llm.model} value={llm.model}>
                      {llm.model}
                    </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="black-api-key" className="mb-1">
                API Key:
              </label>
              <input
                  type="password"
                  ref={blackApiKeyRef}
                  id="black-api-key"
                  className="border border-gray-300 rounded p-2"
                  placeholder="Enter API Key"
              />
            </div>
          </div>
          <div>
            <button
                onClick={handleSave}
                className="mt-4 bg-blue-500 text-white rounded p-2 px-4 hover:bg-blue-600"
            >
              Save
            </button>
            {savedMessage && (
                <span className="text-green-500 text-sm ml-2">{savedMessage}</span>
            )}
          </div>
        </div>
      </div>
  );
}

export default ChessBoard;