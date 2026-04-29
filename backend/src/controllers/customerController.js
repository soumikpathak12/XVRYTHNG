/**
 * Customer portal: verify link, request OTP, login (public, no auth); submit referral (customer auth).
 */
import jwt from 'jsonwebtoken';
import * as customerCredentialsService from '../services/customerCredentialsService.js';
import * as leadService from '../services/leadService.js';
import db from '../config/db.js';
import { sendSiteInspectionBookedEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET;
const CUSTOMER_JWT_EXPIRES_IN = process.env.CUSTOMER_JWT_EXPIRES_IN || '8h';

/** GET /api/customer/verify-link?token= → { valid, email?, customerName? } */
export async function verifyLink(req, res) {
  try {
    const token = req.query.token;
    const rec = customerCredentialsService.verifyLinkToken(token);
    if (!rec) {
      return res.status(200).json({ valid: false });
    }
    return res.status(200).json({
      valid: true,
      email: rec.email,
      customerName: rec.customerName,
    });
  } catch (err) {
    return res.status(500).json({ valid: false, message: err.message });
  }
}

/** POST /api/customer/request-otp { email, token? } → send OTP to email (token optional - can use email directly). */
export async function requestOtp(req, res) {
  try {
    const { email, token } = req.body || {};
    await customerCredentialsService.requestOTPForEmail(email, token || null);
    return res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Could not send OTP.',
    });
  }
}

/** POST /api/customer/login { email, otp } → verify OTP, return JWT + user. */
export async function customerLogin(req, res) {
  try {
    const { email, otp } = req.body || {};
    const e = String(email || '').trim();
    const o = String(otp || '').trim();
    if (!e || !o) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const { leadId, customerName } = customerCredentialsService.verifyOTP(e, o);

    const payload = { role: 'customer', email: e, leadId, name: customerName };
    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: CUSTOMER_JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        role: 'customer',
        email: e,
        leadId,
        name: customerName,
      },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.message || 'Invalid or expired OTP.',
    });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/customer/submit-referral { friendName, friendEmail, friendPhone } – create lead in NEW stage, source=referral, referred_by_lead_id=customer. */
export async function submitReferral(req, res) {
  try {
    const { leadId: referrerLeadId } = req.customer || {};
    if (!referrerLeadId) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    const { friendName, friendEmail, friendPhone } = req.body || {};
    const name = friendName != null ? String(friendName).trim() : '';
    const email = friendEmail != null ? String(friendEmail).trim() : '';
    const phone = friendPhone != null ? String(friendPhone).trim() : '';

    if (!name) {
      return res.status(400).json({ success: false, message: "Friend's name is required." });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Friend's email is required." });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    const payload = {
      stage: 'new',
      customer_name: name,
      email,
      phone: phone || '',
      suburb: null,
      system_size_kw: null,
      value_amount: null,
      source: 'referral',
      referred_by_lead_id: referrerLeadId,
    };
    const lead = await leadService.createLead(payload);
    return res.status(201).json({
      success: true,
      message: 'Referral submitted. They will appear in the lead pipeline.',
      data: { id: lead.id, customer_name: lead.customer_name, email: lead.email },
    });
  } catch (err) {
    console.error('Submit referral error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to submit referral.',
    });
  }
}

/** POST /api/customer/site-inspection/book { token, date, time } */
export async function bookSiteInspection(req, res) {
  try {
    const { token, date, time, paymentCompleted } = req.body || {};
    const rec = customerCredentialsService.verifyLinkToken(String(token || '').trim());
    if (!rec?.leadId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired booking link.' });
    }

    const useStripeTestMode = String(process.env.SITE_INSPECTION_USE_TEST_MODE || '').trim() === '1';
    const stripePaymentLink = useStripeTestMode
      ? (process.env.SITE_INSPECTION_STRIPE_TEST_LINK || process.env.SITE_INSPECTION_STRIPE_LINK || 'https://buy.stripe.com/00weV61gj1G5gXF5C38Ra03')
      : (process.env.SITE_INSPECTION_STRIPE_LINK || 'https://buy.stripe.com/00weV61gj1G5gXF5C38Ra03');
    const baseFee = Number(process.env.SITE_INSPECTION_BASE_FEE || 150);
    const gstAmount = Number((baseFee * 0.1).toFixed(2));
    const totalAmount = Number((baseFee + gstAmount).toFixed(2));

    if (!paymentCompleted) {
      return res.status(402).json({
        success: false,
        code: 'PAYMENT_REQUIRED',
        message: 'Payment is required to confirm your site inspection booking.',
        payment: {
          subtotal: baseFee,
          gst: gstAmount,
          total: totalAmount,
          currency: 'AUD',
          stripeUrl: stripePaymentLink,
        },
      });
    }

    const d = String(date || '').trim();
    const t = String(time || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return res.status(422).json({ success: false, message: 'Date must be in YYYY-MM-DD format.' });
    }
    if (!/^\d{2}:\d{2}$/.test(t)) {
      return res.status(422).json({ success: false, message: 'Time must be in HH:mm format.' });
    }

    const scheduledAt = `${d} ${t}:00`;
    await leadService.updateLead(rec.leadId, {
      site_inspection_date: scheduledAt,
      stage: 'inspection_booked',
    });
    await db.execute('UPDATE leads SET last_activity_at = NOW() WHERE id = ?', [rec.leadId]);

    // Best-effort booking confirmation email to customer.
    try {
      if (rec.email) {
        await sendSiteInspectionBookedEmail({
          to: rec.email,
          customerName: rec.customerName,
        });
      }
    } catch (emailErr) {
      console.warn('sendSiteInspectionBookedEmail failed:', emailErr?.message || emailErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Your site inspection request has been booked.',
      data: {
        leadId: rec.leadId,
        site_inspection_date: scheduledAt,
        payment: {
          subtotal: baseFee,
          gst: gstAmount,
          total: totalAmount,
          currency: 'AUD',
        },
      },
    });
  } catch (err) {
    console.error('bookSiteInspection error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to book site inspection.',
    });
  }
}
