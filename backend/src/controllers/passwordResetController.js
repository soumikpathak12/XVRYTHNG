import {
  requestPasswordReset,
  validateResetToken,
  resetPasswordWithToken,
} from '../services/passwordResetService.js';

export async function postRequestReset(req, res) {
  try {
    const { email, companyId } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    await requestPasswordReset({
      email,
      companyId: companyId ?? null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({
      success: true,
      message: 'If an account exists for this email, we’ll send a reset link.',
    });
  } catch (err) {
    console.error('request-reset error:', err);
    return res.status(500).json({ success: false, message: 'Unable to process request.' });
  }
}

export async function getValidateToken(req, res) {
  try {
    const token = String(req.query.token || '');
    const { valid } = await validateResetToken(token);
    return res.json({ success: true, valid });
  } catch {
    return res.json({ success: true, valid: false });
  }
}

export async function postResetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required.' });
    }
    await resetPasswordWithToken({ rawToken: token, newPassword: password });
    return res.json({ success: true, message: 'Password has been reset.' });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('expired')) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }
    if (msg.includes('password')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('reset-password error:', err);
    return res.status(500).json({ success: false, message: 'Unable to reset password.' });
  }
}