/**
 * Customer portal – Referral Program: referral code, submit form, your referrals list, payment history.
 */
import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { submitReferralApi } from '../../services/api.js';
import { Gift, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal.jsx';
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
  const [errors, setErrors] = useState({ friendName: '', friendEmail: '', friendPhone: '' });
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedReferral, setSubmittedReferral] = useState(null);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[\d\s\-()+]*$/;

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

  const validateEmail = (email) => {
    if (!email || !email.trim()) {
      return 'Email is required.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) {
      return ''; // Phone is optional
    }
    const cleaned = phone.replace(/[\s\-()+]/g, '');
    if (!/^\d+$/.test(cleaned)) {
      return 'Phone number should contain only numbers.';
    }
    if (cleaned.length < 8 || cleaned.length > 15) {
      return 'Phone number should be between 8 and 15 digits.';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, friendEmail: value }));
    // Clear error when user starts typing (validate on blur)
    if (errors.friendEmail && value.trim()) {
      setErrors((err) => ({ ...err, friendEmail: '' }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Only allow numbers, spaces, dashes, parentheses, and plus
    if (!PHONE_REGEX.test(value)) {
      return; // Don't update if invalid character
    }
    setForm((f) => ({ ...f, friendPhone: value }));
    // Clear error when user starts typing (validate on blur)
    if (errors.friendPhone && value.trim()) {
      setErrors((err) => ({ ...err, friendPhone: '' }));
    }
  };

  const handleSubmitReferral = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Validate all fields
    const nameError = !form.friendName?.trim() ? 'Name is required.' : '';
    const emailError = validateEmail(form.friendEmail);
    const phoneError = validatePhone(form.friendPhone);
    
    const newErrors = {
      friendName: nameError,
      friendEmail: emailError,
      friendPhone: phoneError,
    };
    setErrors(newErrors);
    
    if (nameError || emailError || phoneError) {
      return; // Don't submit if there are errors
    }
    
    setSending(true);
    try {
      await submitReferralApi({
        friendName: form.friendName.trim(),
        friendEmail: form.friendEmail.trim(),
        friendPhone: form.friendPhone.trim(),
      });
      const newReferral = {
        id: Date.now(),
        name: form.friendName.trim(),
        email: form.friendEmail.trim(),
        phone: form.friendPhone.trim() || '—',
        date: new Date().toLocaleDateString('en-AU'),
      };
      setReferrals((prev) => [...prev, newReferral]);
      setSubmittedReferral(newReferral);
      setShowSuccessModal(true);
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
                className={`referrals-input ${errors.friendName ? 'referrals-input-error' : ''}`}
                placeholder="e.g. John Smith"
                value={form.friendName}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((f) => ({ ...f, friendName: value }));
                  if (value.trim()) {
                    setErrors((err) => ({ ...err, friendName: '' }));
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setErrors((err) => ({ ...err, friendName: 'Name is required.' }));
                  }
                }}
              />
              {errors.friendName && <span className="referrals-field-error">{errors.friendName}</span>}
            </label>
            <label className="referrals-field">
              <span className="referrals-field-label">Friend's Email</span>
              <input
                type="email"
                className={`referrals-input ${errors.friendEmail ? 'referrals-input-error' : ''}`}
                placeholder="friend@example.com"
                value={form.friendEmail}
                onChange={handleEmailChange}
                onBlur={(e) => {
                  const error = validateEmail(e.target.value);
                  setErrors((err) => ({ ...err, friendEmail: error }));
                }}
              />
              {errors.friendEmail && <span className="referrals-field-error">{errors.friendEmail}</span>}
            </label>
            <label className="referrals-field">
              <span className="referrals-field-label">Friend's Phone</span>
              <input
                type="tel"
                className={`referrals-input ${errors.friendPhone ? 'referrals-input-error' : ''}`}
                placeholder="0400 000 000"
                value={form.friendPhone}
                onChange={handlePhoneChange}
                onBlur={(e) => {
                  const error = validatePhone(e.target.value);
                  setErrors((err) => ({ ...err, friendPhone: error }));
                }}
              />
              {errors.friendPhone && <span className="referrals-field-error">{errors.friendPhone}</span>}
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

      {showSuccessModal && submittedReferral && (
        <Modal
          title="Referral Submitted Successfully"
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSubmittedReferral(null);
          }}
          width={420}
        >
          <div style={{ padding: '0 18px 24px', fontSize: 15, color: '#334155', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <CheckCircle size={32} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                  Thank you for your referral!
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                  Your referral has been submitted successfully.
                </p>
              </div>
            </div>
           
          </div>
        </Modal>
      )}

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
