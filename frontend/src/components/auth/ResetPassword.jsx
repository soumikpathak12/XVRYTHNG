import { useEffect, useMemo, useState } from 'react';

export default function ResetPassword() {
  const [phase, setPhase] = useState('checking');
  const [banner, setBanner] = useState({ type: '', text: '' }); // '', 'error', 'success'

  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);


    useEffect(() => {
    if (banner.text) {
        const el = document.getElementById('reset-banner');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    }, [banner.text]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) {
      setPhase('invalid');
      setBanner({ type: 'error', text: 'Invalid or missing reset token.' });
      return;
    }

    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res?.valid) {
          setPhase('ready');
        } else {
          setPhase('invalid');
          setBanner({ type: 'error', text: 'Invalid or expired reset link.' });
        }
      })
      .catch(() => {
        setPhase('invalid');
        setBanner({ type: 'error', text: 'Unable to validate reset link.' });
      });
  }, []);

  // --- password rules (live)
  const rules = useMemo(() => {
    const lengthOk = pw.length >= 8;
    const uppercaseOk = /[A-Z]/.test(pw);
    // special chars: any non-alphanumeric (adjust to your policy if needed)
    const specialOk = /[^A-Za-z0-9]/.test(pw);
    const matchOk = pw.length > 0 && pw === pw2;
    return { lengthOk, uppercaseOk, specialOk, matchOk };
  }, [pw, pw2]);

  // --- submit handler
  const onSubmit = async (e) => {
    e.preventDefault();

    // do NOT block the button; show a top alert instead
    if (!rules.lengthOk || !rules.uppercaseOk || !rules.specialOk) {
      setBanner({
        type: 'error',
        text:
          'Password must be at least 8 characters, include an uppercase letter, and a special character.',
      });
      return;
    }
    if (!rules.matchOk) {
      setBanner({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    // ok to submit
    setSubmitting(true);
    setBanner({ type: '', text: '' });
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to reset password.');
      }

      setPhase('success');
      setBanner({ type: 'success', text: 'Password has been reset. You can now sign in.' });
    } catch (err) {
      // Keep phase as 'ready' so user can try again
      setPhase('ready');
      setBanner({ type: 'error', text: err.message || 'Failed to reset password.' });
    } finally {
      setSubmitting(false);
    }
  };

  // checklist visuals
  const itemStyle = (ok) => ({
    color: ok ? '#16824D' : '#555',
    listStyle: 'none',
    paddingLeft: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  });
  const Bullet = ({ ok }) => (
    <span aria-hidden="true" style={{ width: '1rem', display: 'inline-block', textAlign: 'center' }}>
      {ok ? '✓' : '•'}
    </span>
  );

  // disable fields only if token invalid, checking, or after success
  const inputsDisabled = phase === 'checking' || phase === 'invalid' || phase === 'success';
  // keep button clickable whenever link is valid; disable only while submitting or invalid phases
  const buttonDisabled = submitting || phase === 'checking' || phase === 'invalid' || phase === 'success';

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="login-card" role="region" aria-labelledby="rp-title">
        <header className="login-header">
          <h1 id="rp-title" className="login-title">Reset password</h1>
          <p className="login-subtitle">Choose a new password to secure your account.</p>
        </header>
        
        <div
        id="reset-banner"
        className={
            banner.text
            ? (banner.type === 'error' ? 'login-error' : 'login-success')
            : 'visually-hidden'
        }
        role={banner.type === 'error' ? 'alert' : 'status'}
        aria-live={banner.type === 'error' ? 'assertive' : 'polite'}
        style={{ marginBottom: banner.text ? '0.75rem' : 0 }}
        >
        {banner.text || ' '}
        </div>

       

        {/* Form visible when link is valid (phase ready or success) */}
        {(phase === 'ready' || phase === 'success') && (
          <form className="login-form" onSubmit={onSubmit} noValidate>
            <label htmlFor="rp-pw" className="login-label">New password</label>
            <div className="login-password-wrap">
              <input
                id="rp-pw"
                type={showPw ? 'text' : 'password'}
                className="login-input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
                required
                autoComplete="new-password"
                aria-describedby="pw-rules"
                disabled={inputsDisabled}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
                disabled={inputsDisabled}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>

            <label htmlFor="rp-pw2" className="login-label">Confirm password</label>
            <input
              id="rp-pw2"
              type={showPw ? 'text' : 'password'}
              className="login-input"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Re-enter your new password"
              minLength={8}
              required
              autoComplete="new-password"
              disabled={inputsDisabled}
            />

            {/* Live checklist */}
            <ul id="pw-rules" style={{ margin: '0.25rem 0 0.75rem 0', paddingLeft: 0 }}>
              <li style={itemStyle(rules.lengthOk)}>
                <Bullet ok={rules.lengthOk} />
                <span>At least 8 characters</span>
              </li>
              <li style={itemStyle(rules.uppercaseOk)}>
                <Bullet ok={rules.uppercaseOk} />
                <span>At least 1 uppercase letter</span>
              </li>
              <li style={itemStyle(rules.specialOk)}>
                <Bullet ok={rules.specialOk} />
                <span>At least 1 special character</span>
              </li>
              <li style={itemStyle(rules.matchOk)}>
                <Bullet ok={rules.matchOk} />
                <span>Passwords match</span>
              </li>
            </ul>

            <button
              type="submit"
              className="login-submit"
              disabled={buttonDisabled}
            >
              {submitting ? 'Saving…' : 'Save new password'}
            </button>

            <div className="fp-actions">
              <a className="fp-back" href="/login">← Back to sign in</a>
            </div>
          </form>
        )}

        {/* Progress text when still checking and no error yet */}
        {phase === 'checking' && !banner.text && (
          <p className="login-subtitle">Checking reset link…</p>
        )}
      </div>
    </div>
  );
}