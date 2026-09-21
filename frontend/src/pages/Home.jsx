import { useState } from "react";
import "./Home.css";

const floatingPieces = [
  { piece: "♟", className: "piece-1" },
  { piece: "♞", className: "piece-2" },
  { piece: "♜", className: "piece-3" },
  { piece: "♝", className: "piece-4" },
  { piece: "♛", className: "piece-5" },
  { piece: "♟", className: "piece-6" },
  { piece: "♞", className: "piece-7" },
  { piece: "♜", className: "piece-8" },
  { piece: "♝", className: "piece-9" },
  { piece: "♟", className: "piece-10" },
  { piece: "♛", className: "piece-11" },
  { piece: "♞", className: "piece-12" },
];

const chessPosition = [
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
  ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

function Home() {
  const [board, setBoard] = useState(chessPosition.flat());

  const [draggedPiece, setDraggedPiece] = useState(null);

  const [roamingPieces, setRoamingPieces] = useState([]);

  const handlePiecePointerDown = (event, piece, index) => {
    event.preventDefault();

    // Remove the piece from its original board square
    setBoard((currentBoard) => {
      const updatedBoard = [...currentBoard];
      updatedBoard[index] = "";
      return updatedBoard;
    });

    // Store everything needed for the complete drag/roam/return cycle
    setDraggedPiece({
      piece,
      x: event.clientX,
      y: event.clientY,
      color: index < 16 ? "black" : "white",
      originalIndex: index,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePiecePointerMove = (event) => {
    if (!draggedPiece) return;

    setDraggedPiece((current) => ({
      ...current,
      x: event.clientX,
      y: event.clientY,
    }));
  };

  const handlePiecePointerUp = () => {
    if (!draggedPiece) return;

    const newPiece = {
      id: Date.now(),
      piece: draggedPiece.piece,
      color: draggedPiece.color,
      x: draggedPiece.x,
      y: draggedPiece.y,

      // IMPORTANT:
      // Use the stored originalIndex.
      originalIndex: draggedPiece.originalIndex,

      returning: false,
    };

    setRoamingPieces((current) => [...current, newPiece]);

    setDraggedPiece(null);

    // Start returning after 5 seconds
    setTimeout(() => {
      setRoamingPieces((current) =>
        current.map((item) =>
          item.id === newPiece.id
            ? {
                ...item,
                returning: true,
              }
            : item,
        ),
      );

      // Give the return animation time to finish
      setTimeout(() => {
        setRoamingPieces((current) =>
          current.filter((item) => item.id !== newPiece.id),
        );

        // Restore the piece to its original square
        setBoard((currentBoard) => {
          const updatedBoard = [...currentBoard];

          if (
            newPiece.originalIndex !== undefined &&
            updatedBoard[newPiece.originalIndex] === ""
          ) {
            updatedBoard[newPiece.originalIndex] = newPiece.piece;
          }

          return updatedBoard;
        });
      }, 1800);
    }, 8000);
  };

  const getSquarePosition = (index) => {
    const boardElement = document.querySelector(".mini-board");

    if (!boardElement) {
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    const rect = boardElement.getBoundingClientRect();

    const squareWidth = rect.width / 8;
    const squareHeight = rect.height / 8;

    const row = Math.floor(index / 8);
    const column = index % 8;

    return {
      x: rect.left + column * squareWidth + squareWidth / 2,
      y: rect.top + row * squareHeight + squareHeight / 2,
    };
  };

  return (
    <div
      className="home-page"
      onPointerMove={handlePiecePointerMove}
      onPointerUp={handlePiecePointerUp}
    >
      <div className="floating-pieces" aria-hidden="true">
        {floatingPieces.map((item, index) => (
          <span key={index} className={`floating-piece ${item.className}`}>
            {item.piece}
          </span>
        ))}
      </div>

      {/* Piece currently being dragged */}
      {draggedPiece && (
        <span
          className={`dragged-board-piece ${
            draggedPiece.color === "black"
              ? "home-black-piece"
              : "home-white-piece"
          }`}
          style={{
            left: `${draggedPiece.x}px`,
            top: `${draggedPiece.y}px`,
          }}
        >
          {draggedPiece.piece}
        </span>
      )}

      {/* Pieces released from the board */}
      {roamingPieces.map((item, index) => {
        const returnPosition = item.returning
          ? getSquarePosition(item.originalIndex)
          : null;

        return (
          <span
            key={item.id}
            className={`roaming-chess-piece ${
              item.color === "black" ? "home-black-piece" : "home-white-piece"
            } ${item.returning ? "returning-chess-piece" : ""}`}
            style={{
              left: `${returnPosition?.x ?? item.x}px`,
              top: `${returnPosition?.y ?? item.y}px`,
              "--duration": `${12 + (index % 5) * 2}s`,
              "--delay": `${index * -1.5}s`,
            }}
          >
            {item.piece}
          </span>
        );
      })}

      <nav className="navbar">
        <div className="logo">♞ ChessArena</div>

        <div className="nav-actions">
          <button className="nav-button">Login</button>

          <button className="nav-button primary">Sign Up</button>
        </div>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <p className="eyebrow">REAL-TIME • MULTIPLAYER • AI</p>

          <h1>
            Play chess.
            <br />
            <span>Think deeper.</span>
          </h1>

          <p className="hero-description">
            Challenge players in real-time, compete with powerful AI, and
            improve your game with intelligent analysis.
          </p>

          <div className="hero-actions">
            <button className="hero-button primary">Play Online</button>

            <button className="hero-button secondary">
              Play with Computer
            </button>
          </div>

          <div className="features">
            <div className="feature">
              <span>♟</span>
              <div>
                <strong>Real-time Games</strong>
                <p>Play against players online.</p>
              </div>
            </div>

            <div className="feature">
              <span>♜</span>
              <div>
                <strong>AI Opponent</strong>
                <p>Challenge Stockfish.</p>
              </div>
            </div>

            <div className="feature">
              <span>♞</span>
              <div>
                <strong>Game Analysis</strong>
                <p>Understand every move.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-board">
          <div className="board-glow"></div>

          <div className="mini-board">
            {board.map((piece, index) => (
              <div
                key={index}
                className={`chess-square ${
                  (Math.floor(index / 8) + index) % 2 === 0
                    ? "light-square"
                    : "dark-square"
                }`}
              >
                {piece && (
                  <span
                    className={`chess-piece ${
                      index < 16 ? "black-piece" : "white-piece"
                    }`}
                    onPointerDown={(event) =>
                      handlePiecePointerDown(event, piece, index)
                    }
                  >
                    {piece}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
