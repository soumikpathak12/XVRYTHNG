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

/** Customer portal: require JWT with role 'customer' and leadId. Sets req.customer = { leadId, email, name }. */
export function requireCustomerAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'customer' || payload.leadId == null) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    req.customer = {
      leadId: payload.leadId,
      email: payload.email ?? null,
      name: payload.name ?? null,
    };
    next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired', code: 'SESSION_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}