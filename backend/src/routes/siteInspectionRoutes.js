// backend/src/routes/siteInspectionRoutes.js
import { Router } from 'express';
import db from '../config/db.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/leads/:leadId/site-inspection
 */
router.get('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const [rows] = await db.execute(
      `SELECT id, lead_id, status, inspected_at, inspector_name, roof_type, roof_pitch_deg,
              house_storey, meter_phase, inverter_location, msb_condition,
              shading, additional_notes, created_at, updated_at
       FROM lead_site_inspections
       WHERE lead_id=?
       LIMIT 1`,
      [leadId]
    );
    res.json({ success: true, data: rows?.[0] || null });
  } catch (e) {
    console.error('[SITE-INSP] GET error:', e);
    res.status(500).json({ success: false, message: 'Failed to load site inspection' });
  }
});

/**
 * PUT /api/leads/:leadId/site-inspection
 * -> Save Draft (upsert theo lead_id)
 */
router.put('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const {
      inspected_at = null,
      inspector_name = null,
      roof_type = null,
      roof_pitch_deg = null,
      house_storey = null,
      meter_phase = null,
      inverter_location = null,
      msb_condition = null,
      shading = null,
      additional_notes = null,
    } = req.body || {};

    // upsert
    const [rows] = await db.execute('SELECT id FROM lead_site_inspections WHERE lead_id=? LIMIT 1', [leadId]);
    if (rows?.[0]?.id) {
      await db.execute(
        `UPDATE lead_site_inspections
         SET status='draft',
             inspected_at=?, inspector_name=?, roof_type=?, roof_pitch_deg=?,
             house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
             shading=?, additional_notes=?, updated_at=NOW()
         WHERE lead_id=?`,
        [
          inspected_at, inspector_name, roof_type,
          roof_pitch_deg == null ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, additional_notes, leadId
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO lead_site_inspections
         (lead_id, status, inspected_at, inspector_name, roof_type, roof_pitch_deg,
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, additional_notes, created_at)
         VALUES
         (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          leadId, inspected_at, inspector_name, roof_type,
          roof_pitch_deg == null ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition, shading, additional_notes
        ]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[SITE-INSP] PUT error:', e);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
});

/**
 * POST /api/leads/:leadId/site-inspection/submit
 * -> Submit (y/c inspected_at & inspector_name)
 */
router.post('/submit', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const {
      inspected_at,
      inspector_name,
      roof_type = null,
      roof_pitch_deg = null,
      house_storey = null,
      meter_phase = null,
      inverter_location = null,
      msb_condition = null,
      shading = null,
      additional_notes = null,
    } = req.body || {};

    if (!inspected_at || !inspector_name?.trim()) {
      return res.status(400).json({ success: false, message: 'inspected_at and inspector_name are required' });
    }

    const [rows] = await db.execute('SELECT id FROM lead_site_inspections WHERE lead_id=? LIMIT 1', [leadId]);
    if (rows?.[0]?.id) {
      await db.execute(
        `UPDATE lead_site_inspections
         SET status='submitted',
             inspected_at=?, inspector_name=?, roof_type=?, roof_pitch_deg=?,
             house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
             shading=?, additional_notes=?, updated_at=NOW()
         WHERE lead_id=?`,
        [
          inspected_at, inspector_name, roof_type,
          roof_pitch_deg == null ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, additional_notes, leadId
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO lead_site_inspections
         (lead_id, status, inspected_at, inspector_name, roof_type, roof_pitch_deg,
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, additional_notes, created_at)
         VALUES
         (?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          leadId, inspected_at, inspector_name, roof_type,
          roof_pitch_deg == null ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition, shading, additional_notes
        ]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[SITE-INSP] SUBMIT error:', e);
    res.status(500).json({ success: false, message: 'Failed to submit site inspection' });
  }
});

export default router;