import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findUserById } from "../models/userModel.js";
import { saveCompletedGame } from "../services/chess/gameHistoryService.js";

import {
  createGame,
  getGame,
  joinGame,
  leaveGame,
  deleteGame,
  getPublicGameState,
  makeChessMove,
  resignGame,
  offerDraw,
  acceptDraw,
  declineDraw,
} from "../services/chess/gameService.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await findUserById(decoded.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = {
        id: user.id,
        username: user.username,
      };

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  const saveGameHistoryOnce = async (game, socket, gameResult) => {
    if (!game || game.historySaved || game.historySaving) return;

    game.historySaving = true;

    const outcome =
      gameResult?.winner === "white"
        ? "white"
        : gameResult?.winner === "black"
          ? "black"
          : "draw";

    try {
      const saved = await saveCompletedGame(game, outcome);

      game.historySaved = true;

      io.to(game.gameId).emit("game:history:saved", saved);
      console.log("Game history saved:", saved.gameId);
    } catch (error) {
      console.error("Failed to save game history:", error.message);

      socket.emit("game:error", {
        message: "Game ended, but saving game history failed.",
      });
    } finally {
      game.historySaving = false;
    }
  };

  // Connection handler
  io.on("connection", (socket) => {
    console.log("SOCKET CONNECTED:", {
      username: socket.user.username,
      userId: socket.user.id,
      socketId: socket.id,
    });

    // Create a new game

    socket.on("game:create", (gameId) => {
      if (getGame(gameId)) {
        socket.emit("game:error", {
          message: "Game ID already exists",
        });
        return;
      }

      const game = createGame(gameId);
      const result = joinGame(gameId, socket.id, socket.user.id, (socketId) =>
        io.sockets.sockets.has(socketId),
      );

      if (!result.success || result.role !== "white") {
        deleteGame(gameId);
        socket.emit("game:error", {
          message: "Could not assign the creator to the White seat.",
        });
        return;
      }

      socket.join(gameId);
      socket.emit("game:created", {
        game: getPublicGameState(game),
        role: "white",
      });
    });

    // Join an existing game
    socket.on("game:join", (gameId) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      const userId = String(socket.user.id);

      // If this user already owns a seat, disconnect their previous socket
      // before assigning the seat to the new connection.
      const sameUser = (a, b) =>
        a != null && b != null && String(a) === String(b);

      let oldSocketId = null;

      if (sameUser(game.whiteUserId, userId)) {
        oldSocketId = game.whitePlayer;
      } else if (sameUser(game.blackUserId, userId)) {
        oldSocketId = game.blackPlayer;
      }

      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);

        if (oldSocket) {
          oldSocket.disconnect(true);
        } else {
          if (game.whitePlayer === oldSocketId) {
            game.whitePlayer = null;
          }

          if (game.blackPlayer === oldSocketId) {
            game.blackPlayer = null;
          }
        }
      }

      const result = joinGame(gameId, socket.id, socket.user.id, (socketId) =>
        io.sockets.sockets.has(socketId),
      );
      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      socket.join(gameId);
      if (result.reconnected) {
        socket.emit("game:state", {
          game: getPublicGameState(result.game),
        });

        io.to(gameId).emit("game:player-reconnected", {
          role: result.role,
          username: socket.user.username,
        });
      }

      socket.emit("game:joined", {
        game: getPublicGameState(result.game),
        role: result.role,
      });

      io.to(gameId).emit("game:state", {
        game: getPublicGameState(result.game),
      });

      console.log(`${socket.id} joined ${gameId} as ${result.role}`);
    });

    // Make chess move
    socket.on("game:move", ({ gameId, move } = {}) => {
      if (!gameId) {
        socket.emit("game:error", {
          message: "Game ID is required",
        });
        return;
      }

      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      // Only the two assigned players may move.
      let playerColor = null;

      if (game.whitePlayer === socket.id) {
        playerColor = "w";
      } else if (game.blackPlayer === socket.id) {
        playerColor = "b";
      } else {
        socket.emit("game:error", {
          message: "Only players can make moves",
        });
        return;
      }

      // Do not allow moves before the game starts or after it ends.
      if (game.status !== "active") {
        socket.emit("game:error", {
          message: "Game is not active",
        });
        return;
      }

      // Enforce turn order on the server.
      if (game.chess.turn() !== playerColor) {
        socket.emit("game:error", {
          message: "It is not your turn",
        });
        return;
      }

      // Validate the move through the game service.
      const result = makeChessMove(game, move);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      // Broadcast the accepted move and updated position.
      io.to(gameId).emit("game:move", {
        move: result.move,
        game: result.game,
        result: result.result,
      });

      // Notify both players if the game has ended.

      if (result.result) {
        void saveGameHistoryOnce(game, socket, result.result);

        io.to(gameId).emit("game:ended", {
          result: result.result,
          game: result.game,
        });
      }
    });

    // Resign from game

    socket.on("game:resign", ({ gameId }) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      const result = resignGame(game, socket.id);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      void saveGameHistoryOnce(game, socket, result.result);

      io.to(gameId).emit("game:ended", {
        result: result.result,
        game: result.game,
      });
    });

    // Offer draw
    socket.on("game:draw:offer", ({ gameId }) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      const result = offerDraw(game, socket.id);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      io.to(gameId).emit("game:draw:offered", {
        from: socket.id,
      });
    });

    // Accept draw
    socket.on("game:draw:accept", ({ gameId }) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      const result = acceptDraw(game, socket.id);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      void saveGameHistoryOnce(game, socket, result.result);

      io.to(gameId).emit("game:ended", {
        result: result.result,
        game: result.game,
      });
    });

    // Decline Draw

    socket.on("game:draw:decline", ({ gameId }) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      const result = declineDraw(game, socket.id);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      io.to(gameId).emit("game:draw:declined");
    });

    // Adding chat feature
    socket.on("game:chat", ({ gameId, message }) => {
      if (!gameId || !message) {
        return;
      }

      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        return;
      }

      if (trimmedMessage.length > 300) {
        return;
      }

      const game = getGame(gameId);

      if (!game) {
        return;
      }

      const isPlayer =
        game.whitePlayer === socket.id || game.blackPlayer === socket.id;

      const isSpectator = game.spectators.has(socket.id);

      if (!isPlayer && !isSpectator) {
        return;
      }

      io.to(gameId).emit("game:message", {
        username: socket.user.username,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnecting", () => {
      for (const gameId of socket.rooms) {
        const game = getGame(gameId);

        if (!game) continue;

        let userId = null;
        let role = null;

        if (game.whitePlayer === socket.id) {
          userId = game.whiteUserId;
          role = "white";
          game.whitePlayer = null;
        } else if (game.blackPlayer === socket.id) {
          userId = game.blackUserId;
          role = "black";
          game.blackPlayer = null;
        } else if (game.spectators.has(socket.id)) {
          game.spectators.delete(socket.id);
          continue;
        } else {
          continue;
        }

        if (userId != null) {
          game.disconnectedPlayers.set(userId, {
            role,
            disconnectedAt: Date.now(),
          });
        }

        io.to(gameId).emit("game:player-disconnected", {
          role,
          username: socket.user.username,
        });

        console.log(`${role} disconnected from game ${gameId}`);
      }
    });
  });

  return io;
};
