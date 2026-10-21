import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GameHistory.css";

const API_URL = "http://localhost:5000";

function GameHistory() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("chessarena_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/games`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load game history.");
        }

        setGames(data.games || []);
      } catch (err) {
        setError(err.message || "Could not load game history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  const getOutcome = (game) => {
    if (game.result === "draw") return "draw";

    const won =
      (game.player_color === "white" && game.result === "white") ||
      (game.player_color === "black" && game.result === "black");

    return won ? "win" : "loss";
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const wins = games.filter((game) => getOutcome(game) === "win").length;
  const losses = games.filter((game) => getOutcome(game) === "loss").length;
  const draws = games.filter((game) => getOutcome(game) === "draw").length;

  return (
    <main className="history-page">
      <header className="history-header">
        <button className="history-logo" onClick={() => navigate("/dashboard")}>
          ♞ ChessArena
        </button>

        <button className="history-back" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
      </header>

      <section className="history-content">
        <p className="history-eyebrow">YOUR CHESS JOURNEY</p>
        <h1>
          Game History<span>.</span>
        </h1>
        <p className="history-description">
          Every match tells a story. Review your results and track your
          progress.
        </p>

        <div className="history-stats">
          <article>
            <span>♟</span>
            <p>Games played</p>
            <strong>{games.length}</strong>
          </article>
          <article>
            <span>♛</span>
            <p>Wins</p>
            <strong>{wins}</strong>
          </article>
          <article>
            <span>♜</span>
            <p>Losses</p>
            <strong>{losses}</strong>
          </article>
          <article>
            <span>½</span>
            <p>Draws</p>
            <strong>{draws}</strong>
          </article>
        </div>

        <section className="history-list">
          <div className="history-list-heading">
            <h2>Recent matches</h2>
            <span>{games.length} matches</span>
          </div>

          {loading && (
            <p className="history-message">Loading your matches...</p>
          )}

          {!loading && error && <p className="history-error">{error}</p>}

          {!loading && !error && games.length === 0 && (
            <div className="history-empty">
              <span>♞</span>
              <h3>No completed games yet</h3>
              <p>Your finished matches will appear here.</p>
              <button onClick={() => navigate("/play")}>
                Play your first game
              </button>
            </div>
          )}

          {!loading && !error && games.length > 0 && (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Side</th>
                    <th>Result</th>
                    <th>Rating change</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => {
                    const outcome = getOutcome(game);
                    const change =
                      Number(game.player_rating_after) -
                      Number(game.player_rating_before);

                    return (
                      <tr key={game.id}>
                        <td className="history-opponent">
                          <span className="history-avatar">♟</span>
                          {game.opponent_username || "Unknown player"}
                        </td>
                        <td>{game.player_color}</td>
                        <td>
                          <span className={`history-result ${outcome}`}>
                            {outcome === "win"
                              ? "Won"
                              : outcome === "loss"
                                ? "Lost"
                                : "Draw"}
                          </span>
                        </td>
                        <td
                          className={
                            change > 0
                              ? "rating-up"
                              : change < 0
                                ? "rating-down"
                                : ""
                          }
                        >
                          {change > 0 ? "+" : ""}
                          {change}
                        </td>
                        <td>{formatDate(game.completed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default GameHistory;
