// backend/src/routes/inspectionTemplateRoutes.js
import { Router } from 'express';
import db from '../config/db.js';

const router = Router({ mergeParams: true });

// GET list
router.get('/', async (req, res) => {
  try {
    const companyId = Number(req.user?.company_id || req.query.company_id || 1);
    const { status } = req.query;
    let sql =
      `SELECT id, company_id, \`key\`, \`name\`, version, status,
              applies_to, steps, validation, meta, published_at, created_at, updated_at
         FROM inspection_templates
        WHERE company_id=? AND deleted_at IS NULL`;
    const params = [companyId];
    if (status) { sql += ' AND status=?'; params.push(status); }
    sql += ' ORDER BY \`key\`, version DESC';
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error('[TPL] GET error:', e);
    res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

// Create/Update draft
router.post('/', async (req, res) => {
  try {
    const companyId = Number(req.user?.company_id || req.body.company_id || 1);
    const { id = null, key, name, version = 1, status = 'draft', appliesTo = [], steps = [], validation = null, meta = null } = req.body || {};
    if (!key || !name) return res.status(400).json({ success: false, message: 'key and name are required' });

    const applies_to = JSON.stringify(appliesTo || []);
    const stepsJson = JSON.stringify(steps || []);
    const validationJson = validation ? JSON.stringify(validation) : null;
    const metaJson = meta ? JSON.stringify(meta) : null;

    if (id) {
      await db.execute(
        `UPDATE inspection_templates
            SET name=?, status=?, applies_to=?, steps=?, validation=?, meta=?, updated_at=NOW()
          WHERE id=? AND company_id=? AND deleted_at IS NULL`,
        [name, status, applies_to, stepsJson, validationJson, metaJson, id, companyId]
      );
      return res.json({ success: true, id });
    }

    const [ins] = await db.execute(
      `INSERT INTO inspection_templates
        (company_id, \`key\`, \`name\`, version, status, applies_to, steps, validation, meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [companyId, key, name, Number(version), status, applies_to, stepsJson, validationJson, metaJson]
    );
    res.json({ success: true, id: ins.insertId });
  } catch (e) {
    console.error('[TPL] POST error:', e);
    res.status(500).json({ success: false, message: 'Failed to save template' });
  }
});

// Publish
router.post('/:id/publish', async (req, res) => {
  try {
    const companyId = Number(req.user?.company_id || req.body.company_id || 1);
    const id = Number(req.params.id);
    await db.execute(
      `UPDATE inspection_templates SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=? AND company_id=? AND deleted_at IS NULL`,
      [id, companyId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[TPL] PUBLISH error:', e);
    res.status(500).json({ success: false, message: 'Failed to publish template' });
  }
});

// Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const companyId = Number(req.user?.company_id || 1);
    const id = Number(req.params.id);
    await db.execute(
      `UPDATE inspection_templates SET deleted_at=NOW(), updated_at=NOW()
       WHERE id=? AND company_id=? AND deleted_at IS NULL`,
      [id, companyId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[TPL] DELETE error:', e);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

export default router;