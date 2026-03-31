// src/controllers/meController.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSidebarForUser } from '../services/sidebarService.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/me/sidebar', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    const data = await getSidebarForUser(req.user.id, companyId);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/company/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute(
      `
      SELECT c.id, c.name, c.abn, c.contact_email, c.contact_phone
      FROM companies c
      JOIN users u ON u.company_id = c.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    return res.json({
      success: true,
      data: {
        companyId: row.id,
        companyName: row.name,
        abn: row.abn ?? '',
        email: row.contact_email ?? '',
        phone: row.contact_phone ?? '',
      },
    });
  } catch (err) {
    console.error('getCompanyProfile error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/company/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [[rowCompany]] = await db.execute(
      'SELECT company_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const companyId = rowCompany?.company_id ?? null;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'User has no company' });
    }

    const { companyName, abn, email, phone } = req.body ?? {};
    const errors = {};
    if (!companyName || !String(companyName).trim()) errors.companyName = 'Company name is required';
    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) errors.email = 'Invalid email';
    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    await db.execute(
      `
      UPDATE companies
      SET name = ?, abn = ?, contact_email = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [String(companyName).trim(), abn ?? null, email ?? null, phone ?? null, companyId]
    );

    const [[updated]] = await db.execute(
      `
      SELECT id, name, abn, contact_email, contact_phone
      FROM companies
      WHERE id = ?
      LIMIT 1
      `,
      [companyId]
    );

    return res.json({
      success: true,
      data: {
        companyId: updated.id,
        companyName: updated.name,
        abn: updated.abn ?? '',
        email: updated.contact_email ?? '',
        phone: updated.contact_phone ?? '',
      },
    });
  } catch (err) {
    console.error('updateCompanyProfile error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;