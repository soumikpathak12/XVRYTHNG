// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.userId,
      role: payload.role,
      companyId: payload.companyId ?? null,
    };

   
    next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired', code: 'SESSION_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}