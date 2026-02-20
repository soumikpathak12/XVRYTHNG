/**
 * Customer portal – Referral Program: referral code, submit form, your referrals list, payment history.
 */
import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { submitReferralApi } from '../../services/api.js';
import { Gift } from 'lucide-react';
import '../../styles/CustomerPortal.css';
import '../../styles/ReferralsPage.css';

const REFERRAL_AMOUNT = 200;

/** Generate a stable referral code from customer name + leadId */
function getReferralCode(name, leadId) {
  const surname = name?.split(/\s+/).pop()?.toUpperCase().replace(/\W/g, '') || 'REF';
  const id = leadId != null ? String(leadId) : '0000';
  return `${surname}-REF-${id}`;
}

/** Sample payment history (replace with API when available) */
const SAMPLE_PAYMENTS = [
  { id: 1, title: 'Deposit Payment', details: '28 Jan 2026 • Visa •••• 4532', status: 'Paid', amount: 2000 },
  { id: 2, title: 'Progress Payment', details: 'Due: 4 Feb 2026 (Before Installation)', status: 'Pending', amount: 3000 },
  { id: 3, title: 'Final Payment', details: 'Due: Upon Completion', status: 'Pending', amount: 3600 },
];

export default function ReferralsPage() {
  const { customerUser } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ friendName: '', friendEmail: '', friendPhone: '' });
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const referralCode = useMemo(
    () => getReferralCode(customerUser?.name, customerUser?.leadId),
    [customerUser?.name, customerUser?.leadId]
  );

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmitReferral = async (e) => {
    e.preventDefault();
    if (!form.friendName?.trim() || !form.friendEmail?.trim()) return;
    setSending(true);
    setSubmitError('');
    try {
      await submitReferralApi({
        friendName: form.friendName.trim(),
        friendEmail: form.friendEmail.trim(),
        friendPhone: form.friendPhone.trim(),
      });
      setReferrals((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: form.friendName.trim(),
          email: form.friendEmail.trim(),
          phone: form.friendPhone.trim() || '—',
          date: new Date().toLocaleDateString('en-AU'),
        },
      ]);
      setForm({ friendName: '', friendEmail: '', friendPhone: '' });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit referral');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="referrals-page">
      <header className="referrals-header">
        <h1 className="referrals-title">
          <Gift size={24} className="referrals-title-icon" aria-hidden />
          Referral Program
        </h1>
        <p className="referrals-incentive">
          Refer a friend and earn <strong>${REFERRAL_AMOUNT}</strong> when they install solar with us!
        </p>
      </header>

      <section className="referrals-code-section customer-portal-card">
        <label className="referrals-code-label">Your Referral Code</label>
        <div className="referrals-code-row">
          <input
            type="text"
            readOnly
            value={referralCode}
            className="referrals-code-input"
            aria-label="Your referral code"
          />
          <button type="button" className="referrals-copy-btn" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section className="referrals-form-section customer-portal-card">
        <h2 className="referrals-section-title">Submit Referral</h2>
        {submitError && <p className="referrals-form-error" role="alert">{submitError}</p>}
        <form className="referrals-form" onSubmit={handleSubmitReferral}>
          <div className="referrals-form-grid">
            <label className="referrals-field">
              <span className="referrals-field-label">Friend's Name</span>
              <input
                type="text"
                className="referrals-input"
                placeholder="e.g. John Smith"
                value={form.friendName}
                onChange={(e) => setForm((f) => ({ ...f, friendName: e.target.value }))}
              />
            </label>
            <label className="referrals-field">
              <span className="referrals-field-label">Friend's Email</span>
              <input
                type="email"
                className="referrals-input"
                placeholder="friend@example.com"
                value={form.friendEmail}
                onChange={(e) => setForm((f) => ({ ...f, friendEmail: e.target.value }))}
              />
            </label>
            <label className="referrals-field">
              <span className="referrals-field-label">Friend's Phone</span>
              <input
                type="tel"
                className="referrals-input"
                placeholder="0400 000 000"
                value={form.friendPhone}
                onChange={(e) => setForm((f) => ({ ...f, friendPhone: e.target.value }))}
              />
            </label>
            <div className="referrals-submit-wrap">
              <button type="submit" className="customer-portal-btn referrals-send-btn" disabled={sending}>
                {sending ? 'Sending…' : 'Send Referral'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="referrals-list-section customer-portal-card">
        <h2 className="referrals-section-title">Your Referrals</h2>
        <div className="referrals-list-container">
          {referrals.length === 0 ? (
            <p className="referrals-empty">No referrals yet. Start referring and earn rewards!</p>
          ) : (
            <ul className="referrals-list">
              {referrals.map((r) => (
                <li key={r.id} className="referrals-list-item">
                  <span className="referrals-list-name">{r.name}</span>
                  <span className="referrals-list-email">{r.email}</span>
                  <span className="referrals-list-date">{r.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="referrals-payment-section customer-portal-card">
        <h2 className="referrals-section-title">Payment History</h2>
        <div className="referrals-payment-list">
          {SAMPLE_PAYMENTS.map((payment, index) => (
            <div
              key={payment.id}
              className={`referrals-payment-item ${index > 0 ? 'referrals-payment-item-border' : ''}`}
            >
              <div className="referrals-payment-left">
                <span className="referrals-payment-title">{payment.title}</span>
                <span className="referrals-payment-details">{payment.details}</span>
                <span className={`referrals-payment-badge ${payment.status === 'Paid' ? 'referrals-payment-badge-paid' : 'referrals-payment-badge-pending'}`}>
                  {payment.status}
                </span>
              </div>
              <div className="referrals-payment-amount">
                ${payment.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
