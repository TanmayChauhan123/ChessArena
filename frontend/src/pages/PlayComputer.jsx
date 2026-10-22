import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import "./PlayComputer.css";

const PIECES = {
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

const DIFFICULTIES = {
  Easy: { skill: 2, depth: 5 },
  Medium: { skill: 8, depth: 10 },
  Hard: { skill: 15, depth: 14 },
};

function PlayComputer() {
  const navigate = useNavigate();
  const gameRef = useRef(new Chess());
  const workerRef = useRef(null);
  const thinkingRef = useRef(false);
  const requestRef = useRef(false);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [thinking, setThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [status, setStatus] = useState("Your move. You play White.");
  const [error, setError] = useState("");

  const game = gameRef.current;

  const syncGame = () => {
    setFen(game.fen());
    setMoves(game.history());
    setSelected(null);

    if (game.isCheckmate()) {
      setStatus(
        game.turn() === "w"
          ? "Checkmate. Computer wins!"
          : "Checkmate. You win!",
      );
    } else if (game.isStalemate()) {
      setStatus("Draw by stalemate.");
    } else if (game.isThreefoldRepetition()) {
      setStatus("Draw by threefold repetition.");
    } else if (game.isInsufficientMaterial()) {
      setStatus("Draw by insufficient material.");
    } else if (game.isDraw()) {
      setStatus("Game drawn.");
    } else if (game.isCheck()) {
      setStatus(
        game.turn() === "w"
          ? "Your king is in check!"
          : "Computer is in check.",
      );
    } else {
      setStatus(
        game.turn() === "w"
          ? "Your move. You play White."
          : "Computer is thinking...",
      );
    }
  };

  useEffect(() => {
    let active = true;
    let worker;

    try {
      worker = new Worker("/stockfish/stockfish-19-lite-single.js");
      workerRef.current = worker;

      worker.onmessage = (event) => {
        if (!active) return;

        const message = String(event.data || "");

        if (message === "uciok") {
          worker.postMessage("isready");
        }

        if (message === "readyok") {
          setEngineReady(true);
          setError("");
        }

        if (message.startsWith("bestmove")) {
          thinkingRef.current = false;
          requestRef.current = false;
          setThinking(false);

          const bestMove = message.split(/\s+/)[1];

          if (!bestMove || bestMove === "(none)") {
            syncGame();
            return;
          }

          try {
            const result = game.move({
              from: bestMove.slice(0, 2),
              to: bestMove.slice(2, 4),
              promotion: bestMove.length > 4 ? bestMove[4] : "q",
            });

            if (result) syncGame();
          } catch {
            setError("The computer returned an invalid move. Please restart.");
          }
        }
      };

      worker.onerror = () => {
        if (active) {
          setError(
            "Could not load Stockfish. Check the engine files in public/stockfish.",
          );
          setEngineReady(false);
          setThinking(false);
          thinkingRef.current = false;
          requestRef.current = false;
        }
      };

      worker.postMessage("uci");
    } catch {
      setError("Could not start the chess engine in this browser.");
    }

    return () => {
      active = false;
      if (worker) {
        worker.postMessage("stop");
        worker.terminate();
      }
      if (workerRef.current === worker) workerRef.current = null;
      thinkingRef.current = false;
      requestRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!engineReady || game.turn() !== "b" || game.isGameOver()) return;
    if (thinkingRef.current || requestRef.current) return;

    const engine = workerRef.current;
    if (!engine) return;

    thinkingRef.current = true;
    requestRef.current = true;
    setThinking(true);
    setStatus("Computer is thinking...");

    const { skill, depth } = DIFFICULTIES[difficulty];

    engine.postMessage(`setoption name Skill Level value ${skill}`);
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${depth}`);

    return () => {
      if (thinkingRef.current) {
        engine.postMessage("stop");
      }
    };
  }, [fen, engineReady, difficulty]);

  const selectSquare = (row, col) => {
    if (thinking || game.turn() !== "w" || game.isGameOver()) return;

    const square = `${"abcdefgh"[col]}${8 - row}`;
    const piece = game.get(square);

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }

      try {
        const move = game.move({
          from: selected,
          to: square,
          promotion: "q",
        });

        if (move) {
          setError("");
          syncGame();
          return;
        }
      } catch {
        // An illegal move leaves the player able to select another piece.
      }

      if (piece?.color === "w") {
        setSelected(square);
      } else {
        setSelected(null);
      }
      return;
    }

    if (piece?.color === "w") setSelected(square);
  };

  const restartGame = () => {
    const engine = workerRef.current;
    if (engine) engine.postMessage("stop");

    thinkingRef.current = false;
    requestRef.current = false;
    setThinking(false);
    setError("");
    game.reset();
    setFen(game.fen());
    setMoves([]);
    setSelected(null);
    setStatus("Your move. You play White.");
  };

  const undoMove = () => {
    if (thinking || moves.length < 2) return;

    game.undo();
    game.undo();
    setError("");
    syncGame();
  };

  const pieceSymbol = (piece) =>
    piece ? PIECES[`${piece.color}${piece.type}`] : "";

  const board = game.board();

  return (
    <main className="computer-page">
      <header className="computer-header">
        <button className="computer-logo" onClick={() => navigate("/")}>
          ♞ ChessArena
        </button>
        <span className="computer-badge">COMPUTER CHESS</span>
        <button
          className="computer-back"
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
      </header>

      <section className="computer-content">
        <div className="computer-intro">
          <p className="computer-eyebrow">SOLO PRACTICE</p>
          <h1>Sharpen your strategy.</h1>
          <p>
            Play against Stockfish, learn from every move, and improve your
            game.
          </p>
        </div>

        <div className="computer-layout">
          <section className="computer-board-panel">
            <div className="computer-player">
              <span className="computer-avatar">♟</span>
              <div>
                <strong>Stockfish</strong>
                <small>Computer opponent</small>
              </div>
              <span className="computer-level">{difficulty}</span>
            </div>

            <div className="computer-board">
              {board.map((rank, row) =>
                rank.map((piece, col) => {
                  const square = `${"abcdefgh"[col]}${8 - row}`;
                  const light = (row + col) % 2 === 0;
                  const isSelected = selected === square;
                  const isLegalTarget =
                    selected &&
                    game
                      .moves({ square: selected, verbose: true })
                      .some((move) => move.to === square);

                  return (
                    <button
                      key={square}
                      className={`computer-square ${light ? "computer-light" : "computer-dark"} ${isSelected ? "computer-selected" : ""} ${isLegalTarget ? "computer-legal" : ""}`}
                      onClick={() => selectSquare(row, col)}
                      aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
                      disabled={
                        thinking || game.turn() !== "w" || game.isGameOver()
                      }
                    >
                      {piece && (
                        <span
                          className={`computer-piece ${piece.color === "w" ? "white-piece" : "black-piece"}`}
                        >
                          {pieceSymbol(piece)}
                        </span>
                      )}
                      {col === 0 && (
                        <span className="computer-rank">{8 - row}</span>
                      )}
                      {row === 7 && (
                        <span className="computer-file">{"abcdefgh"[col]}</span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            <div className="computer-player computer-player-bottom">
              <span className="computer-avatar">♙</span>
              <div>
                <strong>You (White)</strong>
                <small>
                  {thinking ? "Waiting for computer..." : "Play your move"}
                </small>
              </div>
              <span className="computer-turn">
                {game.turn() === "w" ? "YOUR TURN" : "THINKING"}
              </span>
            </div>
          </section>

          <aside className="computer-sidebar">
            <section className="computer-card">
              <p className="computer-card-label">GAME STATUS</p>
              <h2>
                {game.isGameOver()
                  ? "Game finished"
                  : thinking
                    ? "Computer thinking"
                    : "Ready to play"}
              </h2>
              <p className="computer-status">{status}</p>
              {!engineReady && (
                <p className="computer-loading">Loading chess engine...</p>
              )}
              {error && <p className="computer-error">{error}</p>}
            </section>

            <section className="computer-card">
              <label
                className="computer-card-label"
                htmlFor="computer-difficulty"
              >
                DIFFICULTY
              </label>
              <select
                id="computer-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                disabled={thinking}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <p className="computer-hint">
                Higher levels make the engine search deeper.
              </p>
            </section>

            <section className="computer-card">
              <div className="computer-moves-heading">
                <p className="computer-card-label">MOVE HISTORY</p>
                <span>{moves.length} plies</span>
              </div>
              <div className="computer-move-list">
                {moves.length === 0 ? (
                  <p className="computer-empty">Your moves will appear here.</p>
                ) : (
                  Array.from(
                    { length: Math.ceil(moves.length / 2) },
                    (_, index) => (
                      <div className="computer-move-row" key={index}>
                        <span>{index + 1}.</span>
                        <span>{moves[index * 2]}</span>
                        <span>{moves[index * 2 + 1] || "..."}</span>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>

            <div className="computer-actions">
              <button className="computer-primary-action" onClick={restartGame}>
                New Game
              </button>
              <button
                className="computer-secondary-action"
                onClick={undoMove}
                disabled={thinking || moves.length < 2}
              >
                Undo Turn
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default PlayComputer;
