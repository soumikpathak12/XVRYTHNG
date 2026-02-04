/**
 * Auth controller: handles /api/auth/* requests.
 * Returns consistent JSON; no sensitive data in responses.
 */
import * as authService from '../services/authService.js';

/**
 * POST /api/auth/login
 * Body: { email, password, companyId? }
 * Returns: { token, user: { id, name, role, companyId } }
 */
export async function login(req, res) {
  try {
    const { email, password, companyId } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }
    const result = await authService.login(
      String(email).trim().toLowerCase(),
      password,
      companyId ? parseInt(companyId, 10) : null
    );
    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.',
    });
  }
}
