import { useState } from "react";
import "./Home.css";
import { Link } from "react-router-dom";

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

    // Start returning after 8 seconds
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
        <div className="nav-links">
          <a href="#play">Play</a>
          <a href="#analysis">Analyze</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#how">How It Works</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="nav-button">
            Login
          </Link>

          <Link to="/register" className="nav-button primary">
            Sign Up
          </Link>
        </div>
      </nav>

      <main>
        <section className="hero">
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

            <div className="hero-highlights">
              <div className="hero-highlight">
                <span className="highlight-dot"></span>
                <div>
                  <strong>Real-time</strong>
                  <small>Multiplayer</small>
                </div>
              </div>

              <div className="hero-highlight">
                <span className="highlight-dot"></span>
                <div>
                  <strong>Stockfish</strong>
                  <small>AI Engine</small>
                </div>
              </div>

              <div className="hero-highlight">
                <span className="highlight-dot"></span>
                <div>
                  <strong>1200+</strong>
                  <small>Starting Rating</small>
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
        </section>
      </main>

      <section className="landing-section why-section">
        <p className="section-eyebrow">BUILT FOR CHESS PLAYERS</p>

        <h2>
          Everything you need to
          <span> play better.</span>
        </h2>

        <p className="section-description">
          ChessArena combines competitive multiplayer, powerful AI, and
          intelligent analysis into one complete chess experience.
        </p>

        <div className="feature-grid">
          <div className="large-feature-card">
            <div className="feature-icon">♟</div>

            <h3>Real-time Multiplayer</h3>

            <p>
              Challenge players online and experience live chess with
              synchronized moves, clocks and game state.
            </p>
          </div>

          <div className="large-feature-card">
            <div className="feature-icon">♜</div>

            <h3>Powerful AI</h3>

            <p>
              Play against Stockfish and challenge yourself against different
              levels of computer opponents.
            </p>
          </div>

          <div className="large-feature-card">
            <div className="feature-icon">♞</div>

            <h3>Intelligent Analysis</h3>

            <p>
              Review your games, understand your mistakes and discover better
              moves.
            </p>
          </div>
        </div>

        <div className="landing-stats">
          <div className="landing-stat">
            <strong>1200</strong>
            <span>Starting Rating</span>
          </div>

          <div className="landing-stat-divider"></div>

          <div className="landing-stat">
            <strong>24/7</strong>
            <span>Online Chess</span>
          </div>

          <div className="landing-stat-divider"></div>

          <div className="landing-stat">
            <strong>AI</strong>
            <span>Powered Analysis</span>
          </div>

          <div className="landing-stat-divider"></div>

          <div className="landing-stat">
            <strong>Live</strong>
            <span>Real-time Games</span>
          </div>
        </div>
      </section>

      <section className="landing-section modes-section">
        <p className="section-eyebrow">CHOOSE YOUR MODE</p>

        <h2>
          Play chess
          <span> your way.</span>
        </h2>

        <p className="section-description">
          Whether you want to compete, practice, or simply watch, ChessArena
          gives you different ways to experience the game.
        </p>

        <div className="mode-grid">
          <div className="mode-card mode-online">
            <div className="mode-card-top">
              <span className="mode-number">01</span>
              <span className="mode-status">LIVE</span>
            </div>

            <div className="mode-visual">
              <span className="mode-piece">♟</span>
              <span className="mode-piece-secondary">♞</span>
            </div>

            <div className="mode-content">
              <h3>Play Online</h3>

              <p>
                Compete against real players in real-time multiplayer chess and
                put your skills to the test.
              </p>

              <Link to="/play" className="mode-link">
                Find an opponent
              </Link>
            </div>
          </div>

          <div className="mode-card mode-ai">
            <div className="mode-card-top">
              <span className="mode-number">02</span>
              <span className="mode-status">AI</span>
            </div>

            <div className="mode-visual">
              <span className="mode-piece">♛</span>
              <span className="mode-piece-secondary">♟</span>
            </div>

            <div className="mode-content">
              <h3>Play with Computer</h3>

              <p>
                Challenge Stockfish and practice against a powerful computer
                opponent.
              </p>

              <Link to="/computer" className="mode-link">
                Challenge AI
              </Link>
            </div>
          </div>

          <div className="mode-card mode-spectate">
            <div className="mode-card-top">
              <span className="mode-number">03</span>
              <span className="mode-status">WATCH</span>
            </div>

            <div className="mode-visual">
              <span className="mode-piece">♜</span>
              <span className="mode-piece-secondary">♝</span>
            </div>

            <div className="mode-content">
              <h3>Watch & Spectate</h3>

              <p>
                Follow live games and watch other players compete without
                joining the game.
              </p>

              <Link to="/spectate" className="mode-link">
                Watch games
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section how-section">
        <p className="section-eyebrow">HOW IT WORKS</p>

        <h2>
          From first move to
          <span> better chess.</span>
        </h2>

        <p className="section-description">
          ChessArena brings everything together in a simple flow — from finding
          an opponent to understanding your game.
        </p>

        <div className="how-flow">
          <div className="how-step">
            <div className="how-step-number">01</div>

            <div className="how-step-visual">
              <span>♟</span>
            </div>

            <div className="how-step-content">
              <h3>Create your account</h3>
              <p>
                Sign up and build your chess profile with your own rating and
                game history.
              </p>
            </div>
          </div>

          <div className="how-connector">
            <span>➜</span>
          </div>

          <div className="how-step">
            <div className="how-step-number">02</div>

            <div className="how-step-visual">
              <span>⚔</span>
            </div>

            <div className="how-step-content">
              <h3>Find a game</h3>
              <p>
                Create a game or join another player and enter a real-time chess
                match.
              </p>
            </div>
          </div>

          <div className="how-connector">
            <span>➜</span>
          </div>

          <div className="how-step">
            <div className="how-step-number">03</div>

            <div className="how-step-visual">
              <span>♜</span>
            </div>

            <div className="how-step-content">
              <h3>Play your moves</h3>
              <p>
                Make your moves in real time while ChessArena keeps the game
                state synchronized.
              </p>
            </div>
          </div>

          <div className="how-connector">
            <span>➜</span>
          </div>

          <div className="how-step">
            <div className="how-step-number">04</div>

            <div className="how-step-visual">
              <span>♞</span>
            </div>

            <div className="how-step-content">
              <h3>Analyze & improve</h3>
              <p>
                Review your game, discover mistakes and use AI-powered analysis
                to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section analysis-section">
        <div className="analysis-heading">
          <p className="section-eyebrow">AI GAME ANALYSIS</p>

          <h2>
            Understand every move.
            <span> Improve every game.</span>
          </h2>

          <p className="section-description">
            Go beyond simply knowing the result. ChessArena helps you understand
            your decisions, discover mistakes, and find stronger moves with
            AI-powered analysis.
          </p>
        </div>

        <div className="analysis-dashboard">
          {/* LEFT — CHESS BOARD */}

          <div className="analysis-board-panel">
            <div className="analysis-board-header">
              <span>GAME ANALYSIS</span>
              <span className="analysis-live">ANALYZED</span>
            </div>

            <div className="analysis-board">
              {[
                ["♜", "♞", "♝", "", "♚", "♝", "", "♜"],
                ["♟", "♟", "♟", "", "", "♟", "♟", "♟"],
                ["", "", "", "♟", "", "", "", ""],
                ["", "", "", "", "♙", "", "", ""],
                ["", "", "♘", "", "", "", "", ""],
                ["", "", "", "", "", "♘", "", ""],
                ["♙", "♙", "♙", "♙", "", "♙", "♙", "♙"],
                ["♖", "", "♗", "♕", "♔", "♗", "", "♖"],
              ]
                .flat()
                .map((piece, index) => (
                  <div
                    key={index}
                    className={`analysis-square ${
                      (Math.floor(index / 8) + index) % 2 === 0
                        ? "analysis-light"
                        : "analysis-dark"
                    }`}
                  >
                    {piece && (
                      <span
                        className={
                          index < 32
                            ? "analysis-black-piece"
                            : "analysis-white-piece"
                        }
                      >
                        {piece}
                      </span>
                    )}
                  </div>
                ))}
            </div>

            <div className="analysis-board-footer">
              <span>White to move</span>
              <span>Move 18</span>
            </div>
          </div>

          {/* RIGHT — ANALYSIS */}

          <div className="analysis-info">
            <div className="analysis-info-header">
              <div>
                <span className="analysis-label">POSITION</span>

                <h3>Promising position</h3>
              </div>

              <div className="evaluation">
                <span>+</span>0.8
              </div>
            </div>

            <div className="analysis-metrics">
              <div className="analysis-metric">
                <span>BEST MOVE</span>
                <strong>Nf3!</strong>
              </div>

              <div className="analysis-metric">
                <span>ACCURACY</span>
                <strong>94%</strong>
              </div>

              <div className="analysis-metric">
                <span>DEPTH</span>
                <strong>18</strong>
              </div>
            </div>

            <div className="analysis-insight">
              <div className="insight-icon">✦</div>

              <div>
                <span>AI INSIGHT</span>

                <p>
                  A strong developing move that improves your piece activity
                  while maintaining control of the center.
                </p>
              </div>
            </div>

            <div className="analysis-moves">
              <div className="analysis-moves-header">
                <span>MOVE HISTORY</span>
                <span>18 moves</span>
              </div>

              <div className="move-list">
                <span>1. e4 e5</span>
                <span>2. Nf3 Nc6</span>
                <span>3. Bb5 a6</span>
                <span className="active-move">4. Ba4 Nf6</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section progress-section">
        <div className="progress-heading">
          <p className="section-eyebrow">YOUR PROGRESS</p>

          <h2>
            Every game is a chance to
            <span> improve.</span>
          </h2>

          <p className="section-description">
            Track your rating, review your games, and see how your chess
            improves over time.
          </p>
        </div>

        <div className="progress-dashboard">
          {/* PROFILE */}

          <div className="progress-profile">
            <div className="profile-avatar">♞</div>

            <div>
              <span className="profile-label">PLAYER PROFILE</span>
              <h3>ChessPlayer</h3>
              <span className="profile-rank">Rated Player</span>
            </div>

            <div className="profile-rating">
              <span>RATING</span>
              <strong>1200</strong>
              <small>+18 this week</small>
            </div>
          </div>

          {/* STATS */}

          <div className="progress-stats">
            <div className="progress-stat">
              <span>GAMES</span>
              <strong>24</strong>
            </div>

            <div className="progress-stat">
              <span>WINS</span>
              <strong>16</strong>
            </div>

            <div className="progress-stat">
              <span>WIN RATE</span>
              <strong>67%</strong>
            </div>

            <div className="progress-stat">
              <span>BEST RATING</span>
              <strong>1248</strong>
            </div>
          </div>

          {/* RATING GRAPH */}

          <div className="rating-history">
            <div className="rating-history-header">
              <div>
                <span>RATING HISTORY</span>
                <h3>
                  1200 <small>current rating</small>
                </h3>
              </div>

              <div className="rating-period">30 DAYS</div>
            </div>

            <div className="rating-chart">
              <div className="chart-line">
                <span className="chart-point point-1"></span>
                <span className="chart-point point-2"></span>
                <span className="chart-point point-3"></span>
                <span className="chart-point point-4"></span>
                <span className="chart-point point-5"></span>
                <span className="chart-point point-6"></span>
              </div>

              <div className="chart-grid-line line-1"></div>
              <div className="chart-grid-line line-2"></div>
              <div className="chart-grid-line line-3"></div>
            </div>

            <div className="chart-labels">
              <span>SEP 01</span>
              <span>SEP 07</span>
              <span>SEP 14</span>
              <span>SEP 21</span>
            </div>
          </div>

          {/* RECENT GAMES */}

          <div className="recent-games">
            <div className="recent-games-header">
              <span>RECENT GAMES</span>
              <Link to="/history" className="view-all-link">
                VIEW ALL
              </Link>
            </div>

            <div className="game-row">
              <div className="game-result win">W</div>

              <div className="game-opponent">
                <strong>Player_024</strong>
                <span>Rated • 1184</span>
              </div>

              <span className="game-rating positive">+18</span>
            </div>

            <div className="game-row">
              <div className="game-result loss">L</div>

              <div className="game-opponent">
                <strong>Player_091</strong>
                <span>Rated • 1261</span>
              </div>

              <span className="game-rating negative">-12</span>
            </div>

            <div className="game-row">
              <div className="game-result win">W</div>

              <div className="game-opponent">
                <strong>Player_037</strong>
                <span>Rated • 1210</span>
              </div>

              <span className="game-rating positive">+21</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section final-cta-section">
        <div className="cta-piece cta-piece-left">♞</div>
        <div className="cta-piece cta-piece-right">♜</div>

        <p className="section-eyebrow">YOUR NEXT MOVE</p>

        <h2>
          Ready to
          <span> play?</span>
        </h2>

        <p className="cta-description">
          Challenge players, sharpen your skills, and discover a smarter way to
          play chess.
        </p>

        <div className="cta-actions">
          <Link to="/play" className="cta-button primary">
            Play Online
          </Link>

          <Link to="/computer" className="cta-button secondary">
            Play with Computer
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-brand">
          <div className="footer-logo">♞ ChessArena</div>

          <p>Play smarter. Think deeper.</p>
        </div>

        <div className="footer-links">
          <div>
            <span>PLAY</span>
            <a href="#play">Play Online</a>
            <a href="#computer">Computer</a>
            <a href="#spectate">Spectate</a>
          </div>

          <div>
            <span>PLATFORM</span>
            <a href="#analysis">AI Analysis</a>
            <a href="#progress">Your Progress</a>
            <a href="#leaderboard">Leaderboard</a>
          </div>

          <div>
            <span>CHESSARENA</span>
            <a href="#about">About</a>
            <a href="#how">How It Works</a>
            <a href="#contact">Contact</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 ChessArena</span>

          <span>Built for players who want to improve.</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
