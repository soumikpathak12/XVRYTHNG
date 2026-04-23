/**
 * Auth controller: handles /api/auth/* requests.
 * Returns consistent JSON; no sensitive data in responses.
 */
import * as authService from '../services/authService.js';

/**
 * POST /api/auth/login
 * Body: { email, password, companyId? }
 * Returns: { success, token, user: { id, name, role, companyId } }
 */
export async function login(req, res) {
  try {
    const { email, password, companyId } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCompanyId =
      companyId !== undefined && companyId !== null
        ? Number.parseInt(companyId, 10)
        : null;

    const result = await authService.login(
      normalizedEmail,
      password,
      normalizedCompanyId
    );

    return res.status(200).json({
      success: true,
      token: result.accessToken,
      ...result,
    });
  } catch (err) {
    // Map authService errors to safe, consistent responses
    const msg = String(err?.message || '').toLowerCase();

    // If the service indicated a lock (from our earlier implementation)
    if (msg.includes('temporarily locked') || msg.includes('locked')) {
     
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
      });
    }

    // Invalid credentials (generic, no user-enumeration)
    if (msg.includes('invalid email or password')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Inactive / disabled account (if exposed by service)
    if (msg.includes('inactive')) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Multiple accounts for same email (no companyId sent)
    if (msg.includes('multiple accounts')) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Multiple accounts found for this email. Please contact support or use your company portal.',
      });
    }

    // Fallback: internal error
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.',
    });
  }
}

/**
 * POST /api/auth/pin/login
 * Body: { email, pin, companyId? }
 */
export async function loginWithPin(req, res) {
  try {
    const { email, pin, companyId } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (pin == null || String(pin).trim() === '') {
      return res.status(400).json({ success: false, message: 'PIN is required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCompanyId =
      companyId !== undefined && companyId !== null
        ? Number.parseInt(companyId, 10)
        : null;
    const result = await authService.loginWithPin(
      normalizedEmail,
      String(pin).trim(),
      Number.isNaN(normalizedCompanyId) ? null : normalizedCompanyId,
    );
    return res.status(200).json({
      success: true,
      token: result.accessToken,
      ...result,
    });
  } catch (err) {
    const msg = String(err?.message || '');
    const lower = msg.toLowerCase();
    if (lower.includes('6 digits') || lower.includes('email is required')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (lower.includes('multiple accounts')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (lower.includes('not set up')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (lower.includes('temporarily locked') || lower.includes('locked')) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
      });
    }
    if (lower.includes('inactive')) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }
    if (lower.includes('invalid email or pin')) {
      return res.status(401).json({ success: false, message: 'Invalid email or PIN.' });
    }
    console.error('Login with PIN error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during sign in.',
    });
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns: { success, token, accessToken, refreshToken, expiresIn, refreshExpiresIn, user }
 */
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    const result = await authService.refresh(refreshToken);

    return res.status(200).json({
      success: true,
      token: result.accessToken,
      ...result,
    });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }
    console.error('Refresh error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during token refresh.',
    });
  }
}

// POST /api/auth/change-password (requires auth/JWT middleware to set req.user.userId)
export async function changePassword(req, res) {
  try {
    const userId = req.user?.userId; 
    const { currentPassword, newPassword } = req.body ?? {};
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    await authService.changePassword(userId, currentPassword, newPassword);
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('incorrect')) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (msg.includes('least 8')) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

export async function getMobilePinStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const data = await authService.getMobilePinStatus(userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Get mobile pin status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load PIN status.' });
  }
}

export async function setupMobilePin(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { pin, securityQuestion, securityAnswer } = req.body ?? {};
    await authService.setupMobilePin(userId, pin, securityQuestion, securityAnswer);
    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('required') || msg.toLowerCase().includes('6 digits')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Setup mobile pin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to setup PIN.' });
  }
}

export async function verifyMobilePin(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { pin } = req.body ?? {};
    const data = await authService.verifyMobilePin(userId, pin);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('6 digits')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Verify mobile pin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify PIN.' });
  }
}

export async function verifyMobilePinSecurityAnswer(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { securityAnswer } = req.body ?? {};
    const data = await authService.verifyMobilePinSecurityAnswer(
      userId,
      securityAnswer,
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('required')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Verify mobile pin security answer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify answer.' });
  }
}

export async function resetMobilePin(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { securityAnswer, newPin } = req.body ?? {};
    const data = await authService.resetMobilePinWithSecurityAnswer(
      userId,
      securityAnswer,
      newPin,
    );
    if (!data.success) {
      return res.status(400).json({ success: false, message: 'Security answer is incorrect.' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('required') || msg.toLowerCase().includes('6 digits')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Reset mobile pin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset PIN.' });
  }
}

export async function requestMobilePinRecoveryEmail(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    await authService.requestMobilePinRecoveryEmail(userId);
    return res.status(200).json({
      success: true,
      message: 'A security code has been sent to your email.',
    });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('wait')) {
      return res.status(429).json({ success: false, message: msg });
    }
    if (
      msg.toLowerCase().includes('not configured') ||
      msg.toLowerCase().includes('no email')
    ) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Request mobile pin recovery email error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send recovery email.' });
  }
}

export async function verifyMobilePinEmailRecoveryCode(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { recoveryCode } = req.body ?? {};
    const data = await authService.verifyMobilePinEmailRecoveryCode(userId, recoveryCode);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('6 digits')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Verify mobile pin email recovery error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify code.' });
  }
}

export async function resetMobilePinWithEmailRecovery(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { recoveryCode, newPin } = req.body ?? {};
    const data = await authService.resetMobilePinWithEmailRecovery(userId, recoveryCode, newPin);
    if (!data.success) {
      const reason = data.reason || 'wrong';
      let message = 'Invalid or expired code.';
      if (reason === 'locked') message = 'Too many attempts. Request a new code.';
      if (reason === 'expired') message = 'Code has expired. Request a new code.';
      return res.status(400).json({ success: false, message, reason });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('6 digits')) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Reset mobile pin with email recovery error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset PIN.' });
  }
}