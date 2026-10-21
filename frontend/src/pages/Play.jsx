import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Chess } from "chess.js";
import "./Play.css";

const SOCKET_URL = "http://localhost:5000";

function Play() {
  const navigate = useNavigate();

  const [gameId, setGameId] = useState(
    () => sessionStorage.getItem("chessarena_gameId") || "",
  );
  const [roomInput, setRoomInput] = useState("");
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Create a game or join a room.");
  const [error, setError] = useState("");
  const [moveFrom, setMoveFrom] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [ratingChanges, setRatingChanges] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("chessarena_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setError("");

      const savedGameId = sessionStorage.getItem("chessarena_gameId");

      if (savedGameId) {
        setStatus("Reconnecting to your game...");
        newSocket.emit("game:join", savedGameId);
      } else {
        setStatus("Connected. Create or join a game.");
      }
    });

    newSocket.on("connect_error", (err) => {
      setError(err.message || "Could not connect to the game server.");
    });

    newSocket.on("game:created", ({ game, role }) => {
      setGameId(game.id || game.gameId || "");
      sessionStorage.setItem("chessarena_gameId", game.gameId || game.id || "");
      setGame(game);
      setRole(role);
      setError("");
      setStatus("Game created. Share the room ID with another player.");
    });

    newSocket.on("game:joined", ({ game, role }) => {
      setGame(game);
      setRole(role);
      setGameId(game.id || game.gameId || roomInput);
      sessionStorage.setItem(
        "chessarena_gameId",
        game.gameId || game.id || roomInput,
      );
      setError("");
      setStatus("Joined the game.");
    });

    newSocket.on("game:state", ({ game }) => {
      setGame(game);
    });

    newSocket.on("game:move", ({ game }) => {
      setGame(game);
      setMoveFrom(null);
      setError("");
    });

    newSocket.on("game:ended", ({ result }) => {
      setGameResult(result);
      setRatingChanges(null);
      setStatus("Game over");
      setMoveFrom(null);
    });

    newSocket.on("game:history:saved", (saved) => {
      setRatingChanges(saved);
    });

    newSocket.on("game:error", ({ message }) => {
      setError(message || "Something went wrong.");
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();

      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!game?.fen) {
      setBoard([]);
      return;
    }

    try {
      const chess = new Chess(game.fen);
      setBoard(chess.board());
    } catch {
      setError("The server returned an invalid chess position.");
    }
  }, [game]);

  const createGame = () => {
    if (!socket?.connected) {
      setError("Not connected to the game server.");
      return;
    }

    const id = `CH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setError("");
    socket.emit("game:create", id);
  };

  const joinGame = () => {
    const id = roomInput.trim();

    if (!id) {
      setError("Enter a room ID.");
      return;
    }

    if (!socket?.connected) {
      setError("Not connected to the game server.");
      return;
    }

    setError("");
    socket.emit("game:join", id);
  };

  const selectSquare = (row, col) => {
    if (
      !game ||
      !role ||
      role === "spectator" ||
      game.status !== "active" ||
      gameResult
    ) {
      return;
    }

    const square = `${"abcdefgh"[col]}${8 - row}`;
    const piece = board[row]?.[col];

    if (moveFrom) {
      setError("");

      const from = `${"abcdefgh"[moveFrom.col]}${8 - moveFrom.row}`;

      if (from === square) {
        setMoveFrom(null);
        return;
      }

      socket.emit("game:move", {
        gameId,
        move: { from, to: square, promotion: "q" },
      });

      setMoveFrom(null);
      return;
    }

    if (!piece) return;

    const ownColor = role === "white" ? "w" : "b";

    if (piece.color !== ownColor) return;

    setMoveFrom({ row, col });
  };

  const pieceSymbol = (piece) => {
    if (!piece) return "";

    const symbols = {
      wk: "♔",
      wq: "♕",
      wr: "♖",
      wb: "♗",
      wn: "♘",
      wp: "♙",
      bk: "♚",
      bq: "♛",
      br: "♜",
      bb: "♝",
      bn: "♞",
      bp: "♟",
    };

    return symbols[`${piece.color}${piece.type}`];
  };

  const closeGamePopup = () => {
    setGameResult(null);
    setRatingChanges(null);
  };

  const leaveGame = () => {
    sessionStorage.removeItem("chessarena_gameId");
    setGame(null);
    setGameId("");
    setRole("");
    setMoveFrom(null);
    setStatus("Create a game or join a room.");
    setError("");
  };

  return (
    <main className="play-page">
      <header className="play-header">
        <button className="play-logo" onClick={() => navigate("/dashboard")}>
          ♞ ChessArena
        </button>
        <span className="play-connection">
          {socket?.connected ? "● Connected" : "○ Connecting..."}
        </span>
      </header>

      <section className="play-content">
        <div className="play-intro">
          <p className="play-eyebrow">ONLINE MULTIPLAYER</p>
          <h1>Make your move.</h1>
          <p>Challenge another player and put your strategy to the test.</p>
        </div>

        <div className="play-layout">
          <section className="play-panel">
            <h2>Find a game</h2>

            <button className="play-create" onClick={createGame}>
              + Create New Game
            </button>

            <div className="play-separator">OR JOIN A ROOM</div>

            <label htmlFor="roomId">Room ID</label>
            <input
              id="roomId"
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              placeholder="Enter your opponent's room ID"
            />

            <button className="play-join" onClick={joinGame}>
              Join Game
            </button>

            <p className="play-status">{status}</p>
            {error && <p className="play-error">{error}</p>}

            {gameId && (
              <div className="play-room">
                <span>ROOM ID</span>
                <strong>{gameId}</strong>
                <button
                  onClick={() => navigator.clipboard.writeText(gameId)}
                  className="play-copy"
                >
                  Copy room ID
                </button>
                <p>Your side: {role || "Waiting..."}</p>
              </div>
            )}

            {game && (
              <button className="play-join" onClick={leaveGame}>
                Leave Board View
              </button>
            )}
          </section>

          <section className="play-board-panel">
            {gameResult && (
              <div className="game-over-overlay">
                <div
                  className="game-over-popup"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="game-over-title"
                >
                  <div className="game-over-icon">♛</div>

                  <p className="game-over-eyebrow">MATCH COMPLETE</p>

                  <h2 id="game-over-title">Game Over</h2>

                  <h3>
                    {gameResult.winner
                      ? `${gameResult.winner === "white" ? "White" : "Black"} wins!`
                      : "It's a draw!"}
                  </h3>

                  <p className="game-over-reason">
                    {gameResult.type === "checkmate"
                      ? "Checkmate"
                      : gameResult.type === "resignation"
                        ? "Resignation"
                        : gameResult.reason === "agreement"
                          ? "Draw by agreement"
                          : gameResult.type === "stalemate"
                            ? "Stalemate"
                            : "Game finished"}
                  </p>

                  {ratingChanges ? (
                    <div className="game-over-ratings">
                      <div>
                        <span>White rating</span>
                        <strong>
                          {ratingChanges.whiteRating.before}{" "}
                          {ratingChanges.whiteRating.after}
                        </strong>
                      </div>

                      <div>
                        <span>Black rating</span>
                        <strong>
                          {ratingChanges.blackRating.before}{" "}
                          {ratingChanges.blackRating.after}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="game-over-waiting">Saving final ratings...</p>
                  )}

                  <button
                    className="game-over-home"
                    onClick={() => navigate("/dashboard")}
                  >
                    Return to Dashboard
                  </button>

                  <button className="game-over-close" onClick={closeGamePopup}>
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="play-board-heading">
              <div>
                <h2>Live board</h2>
                <p>{game ? `Room ${gameId}` : "Your next match awaits"}</p>
              </div>
              {role && <span className="play-role">{role}</span>}
            </div>

            {board.length > 0 ? (
              <div className="chess-board">
                {Array.from({ length: 8 }, (_, displayRow) => {
                  const row = role === "black" ? 7 - displayRow : displayRow;

                  return Array.from({ length: 8 }, (_, displayCol) => {
                    const col = role === "black" ? 7 - displayCol : displayCol;
                    const piece = board[row]?.[col];

                    const isLight = (row + col) % 2 === 0;
                    const selected =
                      moveFrom?.row === row && moveFrom?.col === col;

                    return (
                      <button
                        key={`${row}-${col}`}
                        disabled={game?.status !== "active" || !!gameResult}
                        className={`chess-square ${
                          isLight ? "light-square" : "dark-square"
                        } ${selected ? "selected-square" : ""}`}
                        onClick={() => selectSquare(row, col)}
                        aria-label={`${"abcdefgh"[col]}${8 - row}`}
                      >
                        {pieceSymbol(piece)}
                      </button>
                    );
                  });
                })}
              </div>
            ) : (
              <div className="play-board-placeholder">
                <span>♜</span>
                <span>♞</span>
                <span>♝</span>
                <p>Your chessboard will appear here when you join a game.</p>
              </div>
            )}

            <p className="play-board-note">
              {game
                ? "Select a piece, then select its destination square."
                : "Create a room or join an existing room to begin."}
            </p>

            <p className="play-board-note">
              {game
                ? "Select a piece, then select its destination square."
                : "Create a room or join an existing room to begin."}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Play;
