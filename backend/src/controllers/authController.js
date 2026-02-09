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