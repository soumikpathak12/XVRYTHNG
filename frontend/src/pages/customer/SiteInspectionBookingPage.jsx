import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerBookSiteInspection } from '../../services/api.js';

const PENDING_BOOKING_KEY = 'xtech_pending_site_inspection_booking';

export default function SiteInspectionBookingPage() {
  const [params] = useSearchParams();
  const tokenFromUrl = useMemo(() => String(params.get('token') || '').trim(), [params]);
  const [bookingToken, setBookingToken] = useState(tokenFromUrl);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const autoSubmittedRef = useRef(false);

  const useStripeTestMode = String(import.meta.env.VITE_SITE_INSPECTION_USE_TEST_MODE || '').trim() === '1';
  const stripeUrl = useStripeTestMode
    ? (import.meta.env.VITE_SITE_INSPECTION_STRIPE_TEST_LINK ||
      import.meta.env.VITE_SITE_INSPECTION_STRIPE_LINK ||
      'https://buy.stripe.com/00weV61gj1G5gXF5C38Ra03')
    : (import.meta.env.VITE_SITE_INSPECTION_STRIPE_LINK ||
      'https://buy.stripe.com/00weV61gj1G5gXF5C38Ra03');
  const subtotal = Number(import.meta.env.VITE_SITE_INSPECTION_BASE_FEE || 150);
  const gst = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + gst).toFixed(2));

  const canSubmit = !!bookingToken && !!date && !!time && !loading;

  function goToPayment() {
    if (!bookingToken || !date || !time) {
      setError('Please select date and time before payment.');
      return;
    }
    setError('');
    localStorage.setItem(
      PENDING_BOOKING_KEY,
      JSON.stringify({ token: bookingToken, date, time, savedAt: Date.now() }),
    );
    window.location.href = stripeUrl;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await customerBookSiteInspection({
        token: bookingToken,
        date,
        time,
        paymentCompleted: true,
      });
      localStorage.removeItem(PENDING_BOOKING_KEY);
      setSuccess(result?.message || 'Your site inspection has been booked successfully.');
    } catch (err) {
      setError(err?.message || 'Could not book site inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenFromUrl) {
      setBookingToken(tokenFromUrl);
      return;
    }
    if (date || time) return;
    try {
      const raw = localStorage.getItem(PENDING_BOOKING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.token) setBookingToken(String(saved.token));
      if (saved?.date) setDate(String(saved.date));
      if (saved?.time) setTime(String(saved.time));
    } catch {
      // ignore localStorage parse errors
    }
  }, [tokenFromUrl, date, time]);

  useEffect(() => {
    const paymentSuccess = String(params.get('payment') || '').trim().toLowerCase() === 'success';
    if (!paymentSuccess || autoSubmittedRef.current) return;
    if (!bookingToken || !date || !time) return;
    autoSubmittedRef.current = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await customerBookSiteInspection({
          token: bookingToken,
          date,
          time,
          paymentCompleted: true,
        });
        localStorage.removeItem(PENDING_BOOKING_KEY);
        setSuccess(result?.message || 'Your site inspection has been booked successfully.');
      } catch (err) {
        setError(err?.message || 'Payment received but booking confirmation failed. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [params, bookingToken, date, time]);

  return (
    <div style={{ minHeight: '100vh', background: '#eaf0f2', padding: '28px 12px' }}>
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #d4e2e6',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(6,48,63,0.18)',
        }}
      >
        <div style={{ background: '#06303f', padding: '16px 20px' }}>
          <img
            src="/logo-removebg.png"
            alt="XTECH Renewables logo"
            width="56"
            height="56"
            style={{ borderRadius: '50%', background: '#fff', padding: 4 }}
          />
        </div>
        <div style={{ padding: '26px 24px', background: 'linear-gradient(135deg,#34a0a4 0%,#18877e 55%,#06303f 100%)' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 30, lineHeight: 1.2 }}>Book Your Site Inspection</h1>
          <p style={{ margin: '8px 0 0', color: '#dff5f2', fontSize: 14 }}>
            Choose your preferred date and time. Our team will confirm your booking shortly.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 24 }}>
          {!bookingToken && (
            <div style={{ marginBottom: 14, color: '#9d1c1c', background: '#fff3f3', border: '1px solid #f0c6c6', borderRadius: 10, padding: '10px 12px' }}>
              Invalid booking link. Please use the latest email link.
            </div>
          )}

          <div style={{ marginBottom: 14, border: '1px solid #b6dedd', borderRadius: 12, background: '#f7fcfc', padding: 12 }}>
            <div style={{ fontWeight: 700, color: '#06303f', marginBottom: 8 }}>Payment required</div>
            <div style={{ fontSize: 13, color: '#23424c', lineHeight: 1.7 }}>
              <div>Site inspection fee: ${subtotal.toFixed(2)} AUD</div>
              <div>GST (10%): ${gst.toFixed(2)} AUD</div>
              <div style={{ fontWeight: 800 }}>Total: ${total.toFixed(2)} AUD</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#56727b' }}>
              Flow: Book Site Inspection → Stripe payment page.
            </div>
          </div>

          <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: '#06303f' }}>Preferred date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid #b8d7dc', marginBottom: 14 }}
            required
          />

          <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: '#06303f' }}>Preferred time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid #b8d7dc', marginBottom: 18 }}
            required
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={goToPayment}
              disabled={!canSubmit}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '12px 22px',
                fontWeight: 700,
                color: '#06303f',
                background: canSubmit ? '#52b69a' : '#c7dbd6',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Book Site Inspection
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                border: '1px solid #9fc8c2',
                borderRadius: 999,
                padding: '12px 22px',
                fontWeight: 700,
                color: '#06303f',
                background: '#ffffff',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              I have paid - confirm booking
            </button>
          </div>

          {error && <div style={{ marginTop: 12, color: '#9d1c1c' }}>{error}</div>}
          {success && <div style={{ marginTop: 12, color: '#126748', fontWeight: 700 }}>{success}</div>}
        </form>
      </div>
    </div>
  );
}
