import { Chess } from "chess.js";

export const createChessGame = () => {
  return new Chess();
};

export const getGameState = (chess) => {
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    isGameOver: chess.isGameOver(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
  };
};

export const makeMove = (chess, move) => {
  try {
    const result = chess.move(move);

    return {
      success: true,
      move: result,
      state: getGameState(chess),
    };
  } catch (error) {
    return {
      success: false,
      message: "Illegal move",
    };
  }
};
