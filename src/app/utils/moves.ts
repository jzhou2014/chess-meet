export function describeMove(move: string) {
  const pieceNames = {
    K: "King",
    Q: "Queen",
    R: "Rook",
    B: "Bishop",
    N: "Knight",
    P: "Pawn",
  };

  if (move === "O-O") {
    return "King castles kingside";
  } else if (move === "O-O-O") {
    return "King castles queenside";
  }

  // Capture move
  if (move.includes("x")) {
    const [from, to] = move.split("x");
    const piece = from[0] in pieceNames ? pieceNames[from[0] as keyof typeof pieceNames] : "Pawn";

    return `${piece} captures on ${to}`;
  }

  // Check move
  if (move.includes("+")) {
    const piece = move[0] in pieceNames ? pieceNames[move[0] as keyof typeof pieceNames] : "Pawn";
    return `${piece} moves to ${move.slice(1, -1)} with check`;
  }

  // Checkmate move
  if (move.includes("#")) {
    const piece = move[0] in pieceNames ? pieceNames[move[0] as keyof typeof pieceNames] : "Pawn";
    return `${piece} moves to ${move.slice(1, -1)} and delivers checkmate`;
  }

  // Pawn promotion
  if (move.length === 5 && move[0] === "P" && move[4].toLowerCase() === "=") {
    const promotionPiece = pieceNames?.[move[4]?.toUpperCase() as keyof typeof pieceNames] ?? "Queen";
    return `Pawn promotes to ${promotionPiece}`;
  }

  // Normal move
  const isPawn = !(move[0] in pieceNames);
  return `${pieceNames?.[move[0] as keyof typeof pieceNames] ?? "Pawn"} moves to ${
    isPawn ? move : move.slice(1)
}`;

}
