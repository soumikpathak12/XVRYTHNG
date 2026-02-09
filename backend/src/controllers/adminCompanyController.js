// src/controllers/companyController.js
import db from '../config/db.js';

export async function getCompanyProfile(req, res) {
  try {
    const companyId = req.user?.companyId ?? null;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'User has no company' });
    }

    const [rows] = await db.execute(
      `SELECT id, name, abn, contact_email, contact_phone
       FROM companies
       WHERE id = ?
       LIMIT 1`,
      [companyId]
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
}

export async function updateCompanyProfile(req, res) {
  try {
    const companyId = req.user?.companyId ?? null;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'User has no company' });
    }
    const { companyName, abn, email, phone } = req.body || {};

    const errors = {};
    if (!companyName || !String(companyName).trim()) errors.companyName = 'Company name is required';
    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) errors.email = 'Invalid email';

    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    await db.execute(
      `UPDATE companies
       SET name = ?, abn = ?, contact_email = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(companyName).trim(), abn ?? null, email ?? null, phone ?? null, companyId]
    );

    const [rows] = await db.execute(
      `SELECT id, name, abn, contact_email, contact_phone
       FROM companies
       WHERE id = ?
       LIMIT 1`,
      [companyId]
    );
    const row = rows[0];

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
    console.error('updateCompanyProfile error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}