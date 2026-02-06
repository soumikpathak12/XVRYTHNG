/**
 * T-001 – Login Page UI
 * Email + Password, show/hide password, Remember me, Forgot password (UI only).
 * Mobile-first, brand colors, no external UI kits.
 */
import { useState } from 'react';
import { theme } from '../../styles/theme';
import './LoginForm.css';

export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email: email.trim(), password, rememberMe });
  };

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="login-card">
        <header className="login-header">
          <img src="/logo.jpeg" alt="XVRYTHNG" className="login-logo" width="80" height="80" />
          <h1 className="login-title">XVRYTHNG</h1>
          <p className="login-subtitle">Solar CRM & Project Management</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div id="login-error-msg" className="login-error" role="alert">
              {error}
            </div>
          )}

          <label className="login-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="login-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error-msg' : undefined}
          />

          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <div className="login-password-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
              aria-invalid={!!error}
            />
            <button
              type="button"
              className="login-toggle-password"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                aria-label="Remember me"
              />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="login-forgot">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
            style={{
              '--primary': theme.primary,
              '--primary-hover': theme.primaryHover,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in '}
          </button>
        </form>
      </div>
    </div>
  );
}
