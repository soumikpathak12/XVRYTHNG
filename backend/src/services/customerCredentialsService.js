/**
 * Customer portal: link token (sent when staff clicks "Send credentials"), OTP (sent when user clicks "Send OTP").
 * Send credentials → email with portal link only. User opens link → enters email (pre-filled) → Send OTP → receives OTP email → Sign in with OTP.
 */
import crypto from 'crypto';
import { Resend } from 'resend';

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const LINK_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';

function getResendFrom() {
  return process.env.RESEND_FROM || 'XVRYTHNG <onboarding@resend.dev>';
}

/** In-memory: email (lowercase) -> { otp, leadId, customerName, expiresAt } */
const otpStore = new Map();

/** In-memory: linkToken -> { email, leadId, customerName, expiresAt } */
const linkTokenStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateLinkToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store OTP for email. Overwrites any existing.
 */
export function storeOTP(email, { leadId, customerName }) {
  const key = String(email).toLowerCase().trim();
  const otp = generateOTP();
  otpStore.set(key, {
    otp,
    leadId: Number(leadId),
    customerName: customerName || key,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  return otp;
}

/**
 * Create a one-time portal link token. Used when staff sends credentials; link is emailed (no OTP).
 */
export function createLinkToken(email, { leadId, customerName }) {
  const key = String(email).toLowerCase().trim();
  const token = generateLinkToken();
  linkTokenStore.set(token, {
    email: key,
    leadId: Number(leadId),
    customerName: customerName || key,
    expiresAt: Date.now() + LINK_TOKEN_TTL_MS,
  });
  return token;
}

/**
 * Verify portal link token. Returns { email, leadId, customerName } if valid; does not delete (user may request OTP multiple times).
 */
export function verifyLinkToken(token) {
  if (!token || typeof token !== 'string') return null;
  const rec = linkTokenStore.get(token.trim());
  if (!rec || rec.expiresAt < Date.now()) return null;
  return { email: rec.email, leadId: rec.leadId, customerName: rec.customerName };
}

/**
 * Send portal link email only (no OTP). Requires RESEND_API_KEY.
 */
export async function sendPortalLinkEmail({ to, customerName, loginUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send portal link email.');
  }

  const from = getResendFrom();
  const subject = 'Access your XVRYTHNG project portal';
  const text = `Hello${customerName ? ` ${customerName}` : ''},\n\nUse the link below to sign in to your project portal:\n\n${loginUrl}\n\nIf you did not expect this email, you can ignore it.\n\n— XVRYTHNG`;
  const html = `
    <p>Hello${customerName ? ` ${customerName}` : ''},</p>
    <p>Use the link below to sign in to your project portal:</p>
    <p><a href="${loginUrl}" target="_blank" rel="noopener">${loginUrl}</a></p>
    <p>If you did not expect this email, you can ignore it.</p>
    <p>— XVRYTHNG</p>
  `;

  const resend = new Resend(apiKey);
  const toList = Array.isArray(to) ? to : [String(to)];
  console.log('[Resend] Sending portal link email to:', toList[0], 'from:', from);
  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[Resend] Portal link email failed:', error);
    throw new Error(error.message || 'Failed to send email');
  }
  console.log('[Resend] Portal link email sent, id:', data?.id);
  return { sent: true };
}

/**
 * Request OTP for an email. Valid only when linkToken is provided and matches the email (user opened the link).
 * Generates OTP, stores it, sends OTP email via Resend.
 */
export async function requestOTPForEmail(email, linkToken) {
  const e = String(email || '').toLowerCase().trim();
  if (!e) throw new Error('Email is required.');
  const rec = verifyLinkToken(linkToken);
  if (!rec) throw new Error('Invalid or expired link. Use the latest link sent to your email.');
  if (rec.email !== e) throw new Error('Email does not match the link.');
  const { leadId, customerName } = rec;
  const otp = storeOTP(e, { leadId, customerName });
  await sendCustomerOTPEmail({ to: e, customerName, otp });
  return { sent: true };
}

/**
 * Verify OTP for email. Returns { leadId, customerName } if valid; deletes OTP. Throws on invalid/expired.
 */
export function verifyOTP(email, otp) {
  const key = String(email).toLowerCase().trim();
  const rec = otpStore.get(key);
  if (!rec) throw new Error('Invalid or expired OTP. Request a new one by clicking Send OTP.');
  if (rec.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw new Error('OTP has expired. Request a new one by clicking Send OTP.');
  }
  if (String(otp).trim() !== rec.otp) throw new Error('Invalid OTP. Please check the code sent to your email.');
  otpStore.delete(key);
  return { leadId: rec.leadId, customerName: rec.customerName };
}

/**
 * Send OTP email to customer via Resend. Requires RESEND_API_KEY.
 * @returns {{ sent: boolean }}
 */
export async function sendCustomerOTPEmail({ to, customerName, otp }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send customer login email.');
  }

  const from = getResendFrom();
  const loginUrl = `${PORTAL_BASE_URL}/portal/login`;
  const subject = 'Your XVRYTHNG customer portal login code';
  const text = `Hello${customerName ? ` ${customerName}` : ''},\n\nYour one-time login code is: ${otp}\n\nUse this code to sign in at: ${loginUrl}\n\nThis code expires in 15 minutes. If you didn't request this, you can ignore this email.\n\n— XVRYTHNG`;
  const html = `
    <p>Hello${customerName ? ` ${customerName}` : ''},</p>
    <p>Your one-time login code is: <strong>${otp}</strong></p>
    <p>Use this code to sign in at: <a href="${loginUrl}">${loginUrl}</a></p>
    <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
    <p>— XVRYTHNG</p>
  `;

  const resend = new Resend(apiKey);
  const toList = Array.isArray(to) ? to : [String(to)];
  console.log('[Resend] Sending OTP email to:', toList[0], 'from:', from);
  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[Resend] OTP email failed:', error);
    throw new Error(error.message || 'Failed to send email');
  }
  console.log('[Resend] OTP email sent, id:', data?.id);
  return { sent: true };
}
