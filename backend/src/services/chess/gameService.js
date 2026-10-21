import { Chess } from "chess.js";
const games = new Map();

export const createGame = (gameId) => {
  const game = {
    gameId,
    historySaved: false,
    whitePlayer: null,
    blackPlayer: null,
    spectators: new Set(),

    whiteUserId: null,
    blackUserId: null,

    disconnectedPlayers: new Map(),

    // Every game gets its own chess board
    chess: new Chess(),

    status: "waiting",
    drawOffer: null,
  };

  games.set(gameId, game);

  return game;
};

export const getGame = (gameId) => {
  return games.get(gameId);
};

export const getPublicGameState = (game) => {
  return {
    gameId: game.gameId,
    whitePlayer: game.whitePlayer,
    blackPlayer: game.blackPlayer,
    spectators: game.spectators.size,
    status: game.status,

    fen: game.chess.fen(),
    turn: game.chess.turn(),

    isGameOver: game.chess.isGameOver(),
    isCheck: game.chess.isCheck(),
    isCheckmate: game.chess.isCheckmate(),
    isDraw: game.chess.isDraw(),
  };
};

export const makeChessMove = (game, move) => {
  if (!game) {
    return {
      success: false,
      message: "Game not found",
    };
  }

  if (game.status !== "active") {
    return {
      success: false,
      message: "Game is not active",
    };
  }

  if (!move || !move.from || !move.to) {
    return {
      success: false,
      message: "Invalid move format",
    };
  }

  try {
    const result = game.chess.move(move);

    // A successful move cancels any pending draw offer.
    game.drawOffer = null;

    let gameResult = null;

    if (game.chess.isCheckmate()) {
      game.status = "finished";

      gameResult = {
        type: "checkmate",
        winner: game.chess.turn() === "w" ? "black" : "white",
      };
    } else if (game.chess.isStalemate()) {
      game.status = "finished";

      gameResult = {
        type: "stalemate",
        winner: null,
      };
    } else if (game.chess.isDraw()) {
      game.status = "finished";

      gameResult = {
        type: "draw",
        winner: null,
      };
    }

    return {
      success: true,
      move: result,
      game: getPublicGameState(game),
      result: gameResult,
    };
  } catch (error) {
    return {
      success: false,
      message: "Illegal move",
    };
  }
};

export const resignGame = (game, socketId) => {
  let winner = null;

  if (game.whitePlayer === socketId) {
    winner = "black";
  } else if (game.blackPlayer === socketId) {
    winner = "white";
  } else {
    return {
      success: false,
      message: "Only players can resign",
    };
  }

  if (game.status === "finished") {
    return {
      success: false,
      message: "Game is already finished",
    };
  }

  game.status = "finished";

  return {
    success: true,
    result: {
      type: "resignation",
      winner,
    },
    game: getPublicGameState(game),
  };
};

export const offerDraw = (game, socketId) => {
  if (game.status === "finished") {
    return {
      success: false,
      message: "Game is already finished",
    };
  }

  if (game.whitePlayer !== socketId && game.blackPlayer !== socketId) {
    return {
      success: false,
      message: "Only players can offer a draw",
    };
  }

  if (game.drawOffer) {
    return {
      success: false,
      message: "A draw offer is already pending",
    };
  }

  game.drawOffer = socketId;

  return {
    success: true,
  };
};

export const acceptDraw = (game, socketId) => {
  if (!game.drawOffer) {
    return {
      success: false,
      message: "No draw offer is pending",
    };
  }

  if (game.whitePlayer !== socketId && game.blackPlayer !== socketId) {
    return {
      success: false,
      message: "Only players can accept a draw",
    };
  }

  if (game.drawOffer === socketId) {
    return {
      success: false,
      message: "You cannot accept your own draw offer",
    };
  }

  game.status = "finished";
  game.drawOffer = null;

  return {
    success: true,
    result: {
      type: "draw",
      reason: "agreement",
      winner: null,
    },
    game: getPublicGameState(game),
  };
};

export const declineDraw = (game, socketId) => {
  if (!game.drawOffer) {
    return {
      success: false,
      message: "No draw offer is pending",
    };
  }

  if (game.whitePlayer !== socketId && game.blackPlayer !== socketId) {
    return {
      success: false,
      message: "Only players can decline a draw",
    };
  }

  if (game.drawOffer === socketId) {
    return {
      success: false,
      message: "You cannot decline your own draw offer",
    };
  }

  game.drawOffer = null;

  return {
    success: true,
  };
};

export const deleteGame = (gameId) => {
  games.delete(gameId);
};

export const joinGame = (gameId, socketId, userId, isSocketConnected) => {
  const game = games.get(gameId);

  if (!game) {
    return { success: false, message: "Game not found" };
  }

  if (game.status === "finished") {
    return {
      success: false,
      message: "This game has already finished",
    };
  }

  // Normalize IDs in case one is a string and the other is a number.
  const sameUser = (a, b) => a != null && b != null && String(a) === String(b);

  // Restore the original White player's seat.
  if (sameUser(game.whiteUserId, userId)) {
    if (
      game.whitePlayer &&
      game.whitePlayer !== socketId &&
      isSocketConnected(game.whitePlayer)
    ) {
      return {
        success: false,
        message: "White player is already connected",
      };
    }

    game.whitePlayer = socketId;
    game.disconnectedPlayers.delete(userId);

    if (game.blackPlayer) game.status = "active";

    return {
      success: true,
      role: "white",
      game,
      reconnected: true,
    };
  }

  // Restore the original Black player's seat.
  if (sameUser(game.blackUserId, userId)) {
    if (
      game.blackPlayer &&
      game.blackPlayer !== socketId &&
      isSocketConnected(game.blackPlayer)
    ) {
      return {
        success: false,
        message: "Black player is already connected",
      };
    }

    game.blackPlayer = socketId;
    game.disconnectedPlayers.delete(userId);

    if (game.whitePlayer) game.status = "active";

    return {
      success: true,
      role: "black",
      game,
      reconnected: true,
    };
  }

  // Prevent duplicate handling of the same socket.
  if (game.whitePlayer === socketId) {
    return { success: true, role: "white", game };
  }

  if (game.blackPlayer === socketId) {
    return { success: true, role: "black", game };
  }

  if (game.spectators.has(socketId)) {
    return { success: true, role: "spectator", game };
  }

  // Assign seats that have never been reserved.
  if (!game.whitePlayer && !game.whiteUserId) {
    game.whitePlayer = socketId;
    game.whiteUserId = userId ?? null;
    game.status = game.blackPlayer ? "active" : "waiting";

    return { success: true, role: "white", game };
  }

  if (!game.blackPlayer && !game.blackUserId) {
    game.blackPlayer = socketId;
    game.blackUserId = userId ?? null;
    game.status = "active";

    return { success: true, role: "black", game };
  }

  game.spectators.add(socketId);

  return { success: true, role: "spectator", game };
};

export const leaveGame = (gameId, socketId) => {
  const game = games.get(gameId);

  if (!game) {
    return;
  }

  if (game.whitePlayer === socketId) {
    game.whitePlayer = null;
  }

  if (game.blackPlayer === socketId) {
    game.blackPlayer = null;
  }

  game.spectators.delete(socketId);

  if (!game.whitePlayer && !game.blackPlayer) {
    games.delete(gameId);
  }
};
