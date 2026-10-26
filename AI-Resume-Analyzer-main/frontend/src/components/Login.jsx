
import React, { useState } from "react";
import axios from "axios";
import { Sparkles, LogIn, LoaderCircle } from "lucide-react";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Login({
  onLogin,
  onLoginSuccess,
  onSwitchToSignup,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: email.trim(),
        password,
      });

      const data = response.data;
      const token =
        data.token ||
        data.accessToken ||
        data.access_token ||
        data.data?.token;

      const user =
        data.user ||
        data.data?.user ||
        data.data ||
        { email: email.trim() };

      if (!token) {
        setError(
          "Login response did not contain a token. Please check the backend login API."
        );
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Support both callback names.
      const callback = onLoginSuccess || onLogin;

      if (typeof callback === "function") {
        callback(user);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Login failed. Check your email, password, and backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand-icon">
          <Sparkles size={25} />
        </div>

        <h1>Welcome Back</h1>
        <p>Log in to your AI Resume Analyzer account.</p>

        {error && (
          <div className="message error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Logging in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>
        </form>

        <p>
          Don't have an account?{" "}
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToSignup}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
