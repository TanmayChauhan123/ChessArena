import { Link } from "react-router-dom";
import "./Login.css";

function Login() {
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

        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>

              <button type="button" className="forgot-password">
                Forgot password?
              </button>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-submit">
            Sign In
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
