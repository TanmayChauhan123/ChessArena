import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_URL = "http://localhost:5000";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chessarena_user")) || null;
    } catch {
      return null;
    }
  });

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("chessarena_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadDashboard = async () => {
      try {
        const [historyResponse, userResponse] = await Promise.all([
          fetch(`${API_URL}/api/games`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();

          if (historyData.success) {
            setGames(historyData.games || []);
          }
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const currentUser = userData.user || userData.data || userData;

          if (currentUser?.username) {
            setUser((previous) => {
              const updated = { ...previous, ...currentUser };
              localStorage.setItem("chessarena_user", JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const getOutcome = (game) => {
    if (game.result === "draw") return "draw";

    const won =
      (game.player_color === "white" && game.result === "white") ||
      (game.player_color === "black" && game.result === "black");

    return won ? "win" : "loss";
  };

  const wins = games.filter((game) => getOutcome(game) === "win").length;
  const winRate = games.length ? Math.round((wins / games.length) * 100) : 0;

  const handleLogout = () => {
    localStorage.removeItem("chessarena_token");
    localStorage.removeItem("chessarena_user");
    navigate("/login");
  };

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="dashboard-logo">♞ ChessArena</div>

        <div className="dashboard-nav-right">
          <span className="dashboard-username">
            {user?.username || "Chess Player"}
          </span>

          <button onClick={handleLogout} className="dashboard-logout">
            Logout
          </button>
        </div>
      </nav>

      <section className="dashboard-hero">
        <p className="dashboard-eyebrow">YOUR CHESS JOURNEY STARTS HERE</p>

        <h1>
          Welcome back,
          <br />
          <span>{user?.username || "Chess Player"}.</span>
        </h1>

        <p className="dashboard-description">
          Sharpen your strategy, challenge your limits, and make every move
          count.
        </p>

        <div className="dashboard-actions">
          <button
            className="dashboard-primary"
            onClick={() => navigate("/play")}
          >
            ♟ Play vs Real Player
          </button>

          <button
            className="dashboard-secondary"
            onClick={() => navigate("/computer")}
          >
            Play vs Computer
          </button>

          <button
            className="dashboard-secondary"
            onClick={() => navigate("/history")}
          >
            ♜ Game History
          </button>
        </div>
      </section>

      <section className="dashboard-stats">
        <article className="dashboard-card">
          <span className="dashboard-card-icon">♜</span>
          <p>Your Rating</p>
          <h2>{user?.rating ?? "—"}</h2>
          <span className="dashboard-muted">Current Elo rating</span>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card-icon">♞</span>
          <p>Games Played</p>
          <h2>{loading ? "…" : games.length}</h2>
          <span className="dashboard-muted">Completed matches</span>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card-icon">♛</span>
          <p>Win Rate</p>
          <h2>{loading ? "…" : `${winRate}%`}</h2>
          <span className="dashboard-muted">
            {wins} {wins === 1 ? "win" : "wins"} from {games.length} games
          </span>
        </article>
      </section>

      <section className="dashboard-performance">
        <div>
          <p className="dashboard-eyebrow">KEEP IMPROVING</p>
          <h2>Your next move starts here.</h2>
          <p>
            Review past matches, learn from each result, and keep building your
            rating.
          </p>
        </div>

        <button
          className="dashboard-primary"
          onClick={() => navigate("/history")}
        >
          View Game History
        </button>
      </section>

      <footer className="dashboard-footer">
        THINK AHEAD. PLAY SMART. OWN THE BOARD.
      </footer>
    </main>
  );
}

export default Dashboard;
