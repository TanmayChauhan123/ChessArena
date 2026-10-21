import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to sign in. Please try again.");
        return;
      }

      // Store the token for authenticated API requests.
      localStorage.setItem("chessarena_token", data.user.token);

      // Keep the authenticated user's public profile.
      localStorage.setItem(
        "chessarena_user",
        JSON.stringify({
          id: data.user.user.id,
          username: data.user.user.username,
          email: data.user.user.email,
          rating: data.user.user.rating,
        }),
      );

      navigate("/dashboard", { replace: true });
    } catch {
      setError(
        "Cannot connect to ChessArena. Check that the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-glow"></div>

      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="login-logo">
            ♞ ChessArena
          </Link>

          <p className="login-eyebrow">WELCOME BACK</p>

          <h1>Welcome back.</h1>

          <p className="login-subtitle">
            Sign in to continue your chess journey.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  setError("Password reset is not implemented yet.")
                }
              >
                Forgot password?
              </button>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <p className="signup-prompt">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
