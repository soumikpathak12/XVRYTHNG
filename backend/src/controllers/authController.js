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

    // Fallback: internal error
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.',
    });
  }
}