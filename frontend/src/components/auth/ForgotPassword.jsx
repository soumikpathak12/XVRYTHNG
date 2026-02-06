// ForgotPassword.jsx
import { useState } from 'react';

export default function ForgotPassword({ onRequestReset }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      // If the parent passes a real handler, use that; otherwise run the local mock.
      if (typeof onRequestReset === 'function') {
        await onRequestReset(email.trim());
      } else {
        await mockRequestReset(email.trim());
      }
      setStatus('success');
      setMessage(
        'If an account exists for this email, we’ll send a password reset link.'
      );
    } catch (err) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const mockRequestReset = (email) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        email ? resolve(true) : reject(new Error('Invalid email'));
      }, 800);
    });

  const loading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="login-card" role="region" aria-labelledby="fp-title">
        <header className="login-header">
            <img src="/logo.jpeg" alt="XVRYTHNG" className="login-logo" width="80" height="80" />

          <h1 id="fp-title" className="login-title">
            Forgot Password
          </h1>
          <p className="login-subtitle">
            Enter your email and we’ll send you a reset link.
          </p>
        </header>

        {isError && (
          <div
            className="login-error"
            role="alert"
            aria-live="assertive"
            id="fp-error-msg"
          >
            {message}
          </div>
        )}
        {isSuccess && (
          <div
            className="login-success"
            role="status"
            aria-live="polite"
            id="fp-success-msg"
          >
            {message}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="fp-email" className="login-label">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            name="email"
            placeholder="you@company.com"
            className="login-input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || isSuccess}
            aria-invalid={isError ? true : undefined}
            aria-describedby={
              isError
                ? 'fp-error-msg'
                : isSuccess
                ? 'fp-success-msg'
                : undefined
            }
          />

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !email.trim() || isSuccess}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="fp-actions">
            <a href="/login" className="fp-back">
              ← Back to sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
