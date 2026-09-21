import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findUserById } from "../models/userModel.js";

import {
  createGame,
  getGame,
  joinGame,
  leaveGame,
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

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Create a new game
    socket.on("game:create", (gameId) => {
      const existingGame = getGame(gameId);

      if (existingGame) {
        socket.emit("game:error", {
          message: "Game ID already exists",
        });
        return;
      }

      const game = createGame(gameId);

      socket.join(gameId);

      const result = joinGame(gameId, socket.id);

      socket.emit("game:created", {
        game: getPublicGameState(result.game),
        role: result.role,
      });

      console.log(`Game created: ${gameId}`);
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

      const result = joinGame(gameId, socket.id);

      socket.join(gameId);

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
    socket.on("game:move", ({ gameId, move }) => {
      const game = getGame(gameId);

      if (!game) {
        socket.emit("game:error", {
          message: "Game not found",
        });
        return;
      }

      let playerColor = null;

      if (game.whitePlayer === socket.id) {
        playerColor = "w";
      } else if (game.blackPlayer === socket.id) {
        playerColor = "b";
      } else {
        socket.emit("game:error", {
          message: "Spectators cannot make moves",
        });
        return;
      }

      if (game.chess.turn() !== playerColor) {
        socket.emit("game:error", {
          message: "It is not your turn",
        });
        return;
      }

      const result = makeChessMove(game, move);

      if (!result.success) {
        socket.emit("game:error", {
          message: result.message,
        });
        return;
      }

      io.to(gameId).emit("game:move", {
        move: result.move,
        game: result.game,
        result: result.result,
      });
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

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      // For now, game cleanup will be added
      // when we build proper connection tracking.
    });
  });

  return io;
};
