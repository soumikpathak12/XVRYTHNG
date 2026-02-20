/**
 * Customer portal login: open link from email → email pre-filled → Send OTP → enter OTP → Sign in.
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
  const [linkValid, setLinkValid] = useState(null); // null = checking, true = valid, false = invalid
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!tokenFromUrl) {
      setLinkValid(false);
      return;
    }
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
    if (!email.trim() || !linkToken) return;
    setSendingOtp(true);
    try {
      await customerRequestOtp(email.trim(), linkToken);
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
          <h1 className="customer-login-title">Customer Portal</h1>
          <p className="customer-login-subtitle">
            {linkValid === false && !tokenFromUrl && 'Use the link sent to your email to sign in.'}
            {linkValid === true && !otpSent && 'Enter your email and click Send OTP to receive a one-time code.'}
            {otpSent && 'Enter the 6-digit code sent to your email. It expires in 15 minutes.'}
            {linkValid === null && tokenFromUrl && 'Verifying link…'}
          </p>
        </header>

        {linkValid === false && !tokenFromUrl && (
          <p className="customer-login-hint" style={{ marginTop: 0 }}>
            Your project team will send you a link by email. Open that link to sign in here.
          </p>
        )}
        {linkValid === false && tokenFromUrl && (
          <p className="customer-login-error" style={{ marginTop: 0 }}>
            This link is invalid or has expired. Ask your project team to send you a new link.
          </p>
        )}

        {linkValid === true && (
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
                  readOnly={!!tokenFromUrl}
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
