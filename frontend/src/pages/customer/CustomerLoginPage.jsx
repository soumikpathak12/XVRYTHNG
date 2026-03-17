/**
 * Customer portal login: email → Send OTP → enter OTP → Sign in.
 * Supports both magic link flow (with token) and direct email entry.
 */
import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { customerVerifyLink, customerRequestOtp } from '../../services/api.js';
import '../../styles/CustomerLoginPage.css';

export default function CustomerLoginPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const { customerLogin, isCustomerAuthenticated, loading, error, clearSessionExpiredMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [linkToken, setLinkToken] = useState(tokenFromUrl || null);
  const [linkValid, setLinkValid] = useState(null); // null = checking, true = valid, false = invalid (or no token)
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!tokenFromUrl) {
      // No token - allow direct email entry
      setLinkValid(false);
      return;
    }
    // Token provided - verify it
    setLinkToken(tokenFromUrl);
    let cancelled = false;
    customerVerifyLink(tokenFromUrl)
      .then((data) => {
        if (cancelled) return;
        setLinkValid(data.valid === true);
        if (data.valid && data.email) setEmail(data.email);
      })
      .catch(() => {
        if (!cancelled) setLinkValid(false);
      });
    return () => { cancelled = true; };
  }, [tokenFromUrl]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearSessionExpiredMessage?.();
    if (!email.trim()) return;
    setSendingOtp(true);
    try {
      // Token is optional - can send OTP with just email
      await customerRequestOtp(email.trim(), linkToken || undefined);
      setOtpSent(true);
    } catch (err) {
      setLocalError(err.message || 'Could not send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearSessionExpiredMessage?.();
    await customerLogin(email.trim(), otp.trim());
  };

  if (isCustomerAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  const err = localError || error;

  return (
    <div className="customer-login-page">
      <div className="customer-login-bg" aria-hidden="true" />
      <div className="customer-login-card">
        <header className="customer-login-header">
          <img src="/logo.jpeg" alt="XVRYTHNG" className="customer-login-logo" width="80" height="80" />
          <h1 className="customer-login-title">XVRYTHNG</h1>
          <p className="customer-login-subtitle">
            {!otpSent && 'Enter your email address to receive a one-time login code.'}
            {otpSent && 'Enter the 6-digit code sent to your email. It expires in 15 minutes.'}
            {linkValid === null && tokenFromUrl && 'Verifying link…'}
          </p>
        </header>

        {linkValid === false && tokenFromUrl && (
          <p className="customer-login-error" style={{ marginTop: 0 }}>
            This link is invalid or has expired. You can still sign in by entering your email below.
          </p>
        )}

        {/* Show form if no token, or token is verified/invalid */}
        {(linkValid === false || linkValid === true || !tokenFromUrl) && (
          <>
            {err && (
              <div className="customer-login-error" role="alert">
                {err}
              </div>
            )}

            {!otpSent ? (
              <form className="customer-login-form" onSubmit={handleSendOtp} noValidate>
                <label className="customer-login-label" htmlFor="customer-email">
                  Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  className="customer-login-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  readOnly={!!tokenFromUrl && linkValid === true}
                />
                <button type="submit" className="customer-login-submit" disabled={sendingOtp}>
                  {sendingOtp ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form className="customer-login-form" onSubmit={handleSubmit} noValidate>
                <label className="customer-login-label" htmlFor="customer-otp">
                  One-time code
                </label>
                <input
                  id="customer-otp"
                  type="text"
                  className="customer-login-input"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
                <button type="submit" className="customer-login-submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
                {otpSent && (
                  <button
                    type="button"
                    className="customer-login-resend"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    style={{ marginTop: '12px', background: 'none', border: 'none', color: '#1A7B7B', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Use a different email
                  </button>
                )}
              </form>
            )}
          </>
        )}

        {linkValid === null && tokenFromUrl && (
          <p className="customer-login-hint">Loading…</p>
        )}
      </div>
    </div>
  );
}
