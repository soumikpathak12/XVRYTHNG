/**
 * Customer portal: verify link, request OTP, login (public, no auth).
 */
import jwt from 'jsonwebtoken';
import * as customerCredentialsService from '../services/customerCredentialsService.js';

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

/** POST /api/customer/request-otp { email, token } → send OTP to email (token from link required). */
export async function requestOtp(req, res) {
  try {
    const { email, token } = req.body || {};
    await customerCredentialsService.requestOTPForEmail(email, token);
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
