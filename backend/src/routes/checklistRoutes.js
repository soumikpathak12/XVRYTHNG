// backend/src/routes/checklistRoutes.js
import { Router } from 'express';
import db from '../config/db.js';

const router = Router();

// GET all checklist templates (with optional company filter)
router.get('/', async (req, res) => {
  try {
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;
    const showInactive = req.query.showInactive === 'true';
    
    let query = `SELECT id, company_id, name, description, items, is_active, created_at, updated_at
                 FROM site_inspection_checklist_templates`;
    const params = [];
    
    // For public API (inspectors), only show active with optional company filter
    // For admin API, show all unless filtered
    if (!showInactive) {
      query += ` WHERE is_active = 1`;
    }
    
    if (companyId) {
      const connector = showInactive ? 'WHERE' : 'AND';
      query += ` ${connector} (company_id IS NULL OR company_id = ?)`;
      params.push(companyId);
    }
    
    query += ` ORDER BY company_id DESC, name ASC`;
    
    const [templates] = await db.execute(query, params);
    
    // Parse items JSON for each template
    const parsedTemplates = templates.map(t => ({
      ...t,
      items: t.items ? JSON.parse(t.items) : []
    }));
    
    res.json({ success: true, data: parsedTemplates });
  } catch (e) {
    console.error('[CHECKLIST] GET error:', e);
    res.status(500).json({ success: false, message: 'Failed to load checklist templates' });
  }
});

// GET single template by ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.execute(
      'SELECT id, company_id, name, description, items, is_active, created_at, updated_at FROM site_inspection_checklist_templates WHERE id = ?',
      [id]
    );
    
    if (!rows || !rows[0]) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    const template = {
      ...rows[0],
      items: rows[0].items ? JSON.parse(rows[0].items) : []
    };
    
    res.json({ success: true, data: template });
  } catch (e) {
    console.error('[CHECKLIST] GET by ID error:', e);
    res.status(500).json({ success: false, message: 'Failed to load template' });
  }
});

// POST - Create new template
router.post('/', async (req, res) => {
  try {
    const { name, description, items, company_id, is_active } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items must be an array' });
    }
    
    // Validate items format
    const validItems = items.map((item, index) => ({
      text: String(item.text || '').trim(),
      order: item.order ?? index + 1
    })).filter(item => item.text);
    
    if (validItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }
    
    const [result] = await db.execute(
      `INSERT INTO site_inspection_checklist_templates (name, description, items, company_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        name.trim(),
        description || null,
        JSON.stringify(validItems),
        company_id || null,
        is_active ? 1 : 0
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Template created successfully',
      data: { id: result.insertId }
    });
  } catch (e) {
    console.error('[CHECKLIST] POST error:', e);
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
});

// PUT - Update template
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, items, company_id, is_active } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items must be an array' });
    }
    
    // Validate items format
    const validItems = items.map((item, index) => ({
      text: String(item.text || '').trim(),
      order: item.order ?? index + 1
    })).filter(item => item.text);
    
    if (validItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }
    
    const [result] = await db.execute(
      `UPDATE site_inspection_checklist_templates 
       SET name = ?, description = ?, items = ?, company_id = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name.trim(),
        description || null,
        JSON.stringify(validItems),
        company_id || null,
        is_active ? 1 : 0,
        id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (e) {
    console.error('[CHECKLIST] PUT error:', e);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// DELETE - The template
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [result] = await db.execute(
      'DELETE FROM site_inspection_checklist_templates WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (e) {
    console.error('[CHECKLIST] DELETE error:', e);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

export default router;
