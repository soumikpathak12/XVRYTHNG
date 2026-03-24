// backend/src/routes/siteInspectionRoutes.js
import { Router } from 'express';
import db from '../config/db.js';

const router = Router({ mergeParams: true });
const BEST_ROW_ORDER = `
  ORDER BY
    CASE WHEN COALESCE(NULLIF(TRIM(additional_notes), ''), NULL) IS NOT NULL THEN 1 ELSE 0 END DESC,
    CASE WHEN inspected_at IS NOT NULL THEN 1 ELSE 0 END DESC,
    updated_at DESC,
    id DESC
`;

// GET one inspection by lead
router.get('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const [rows] = await db.execute(
      `SELECT id, lead_id, status, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
              roof_type, roof_pitch_deg, house_storey, meter_phase, inverter_location, msb_condition,
              shading, additional_notes, template_key, template_version, created_at, updated_at
         FROM lead_site_inspections
        WHERE lead_id=?
        ${BEST_ROW_ORDER}
        LIMIT 1`,
      [leadId]
    );
    res.json({ success: true, data: rows?.[0] || null });
  } catch (e) {
    console.error('[SITE-INSP] GET error:', e);
    res.status(500).json({ success: false, message: 'Failed to load site inspection' });
  }
});

// PUT (save draft)
router.put('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const inspectionId = Number(req.body?.id || 0) || null;
    const {
      inspected_at = null, inspector_name = null, customer_name = null, signature_url = null, customer_notes = null,
      roof_type = null, roof_pitch_deg = null,
      house_storey = null, meter_phase = null, inverter_location = null, msb_condition = null,
      shading = null, additional_notes = null, template_key = null, template_version = null,
    } = req.body || {};

    let addNotes = additional_notes;
    try {
      const obj = additional_notes ? JSON.parse(additional_notes) : {};
      if (template_key) obj._t = template_key;
      if (template_version != null) obj._v = template_version;
      addNotes = JSON.stringify(obj);
    } catch {
      addNotes = JSON.stringify({ _t: template_key || null, _v: template_version ?? null, _raw: additional_notes ?? null });
    }

    const [rows] = inspectionId
      ? await db.execute('SELECT id FROM lead_site_inspections WHERE id=? AND lead_id=? LIMIT 1', [inspectionId, leadId])
      : await db.execute(`SELECT id FROM lead_site_inspections WHERE lead_id=? ${BEST_ROW_ORDER} LIMIT 1`, [leadId]);
    if (rows?.[0]?.id) {
      await db.execute(
        `UPDATE lead_site_inspections
            SET status='draft',
                inspected_at=?, inspector_name=?, customer_name=?, signature_url=?, customer_notes=?,
                roof_type=?, roof_pitch_deg=?,
                house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
                shading=?, additional_notes=?, template_key=?, template_version=?, updated_at=NOW()
          WHERE id=? AND lead_id=?`,
        [
          inspected_at, inspector_name, customer_name, signature_url, customer_notes,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, addNotes, template_key, template_version, rows[0].id, leadId
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO lead_site_inspections
           (lead_id, status, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
            roof_type, roof_pitch_deg,
            house_storey, meter_phase, inverter_location, msb_condition,
            shading, additional_notes, template_key, template_version, created_at)
         VALUES
           (?, 'draft', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          leadId, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, addNotes, template_key, template_version
        ]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[SITE-INSP] PUT error:', e);
    if (e?.code === 'ER_NET_PACKET_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        message: 'Draft payload is too large. Please remove oversized inline images and try again.',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
});

// POST /submit (finalize) —> status=submitted AND lead.stage -> site_inspection_completed (with fallback)
router.post('/submit', async (req, res) => {
  const conn = await db.getConnection(); // so we can do a small transaction
  try {
    const leadId = Number(req.params.leadId);
    const inspectionId = Number(req.body?.id || 0) || null;
    const {
      inspected_at, inspector_name, customer_name, signature_url, customer_notes,
      roof_type = null, roof_pitch_deg = null, house_storey = null, meter_phase = null,
      inverter_location = null, msb_condition = null, shading = null,
      additional_notes = null, template_key = null, template_version = null,
    } = req.body || {};

    if (!inspected_at || !customer_name?.trim()) {
      return res.status(400).json({ success: false, message: 'inspected_at and customer_name are required' });
    }

    let addNotes = additional_notes;
    try {
      const obj = additional_notes ? JSON.parse(additional_notes) : {};
      if (template_key) obj._t = template_key;
      if (template_version != null) obj._v = template_version;
      addNotes = JSON.stringify(obj);
    } catch {
      addNotes = JSON.stringify({ _t: template_key || null, _v: template_version ?? null, _raw: additional_notes ?? null });
    }

    await conn.beginTransaction();

    const [rows] = inspectionId
      ? await conn.execute('SELECT id FROM lead_site_inspections WHERE id=? AND lead_id=? LIMIT 1', [inspectionId, leadId])
      : await conn.execute(`SELECT id FROM lead_site_inspections WHERE lead_id=? ${BEST_ROW_ORDER} LIMIT 1`, [leadId]);
    if (rows?.[0]?.id) {
      await conn.execute(
        `UPDATE lead_site_inspections
            SET status='submitted',
                inspected_at=?, inspector_name=?, customer_name=?, signature_url=?, customer_notes=?,
                roof_type=?, roof_pitch_deg=?,
                house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
                shading=?, additional_notes=?, template_key=?, template_version=?, updated_at=NOW()
          WHERE id=? AND lead_id=?`,
        [
          inspected_at, inspector_name || null, customer_name, signature_url || null, customer_notes || null,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, addNotes, template_key, template_version, rows[0].id, leadId
        ]
      );
    } else {
      await conn.execute(
        `INSERT INTO lead_site_inspections
           (lead_id, status, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
            roof_type, roof_pitch_deg,
            house_storey, meter_phase, inverter_location, msb_condition,
            shading, additional_notes, template_key, template_version, created_at)
         VALUES
           (?, 'submitted', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          leadId, inspected_at, inspector_name || null, customer_name, signature_url || null, customer_notes || null,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, addNotes, template_key, template_version
        ]
      );
    }

    // Keep a single effective status per lead: once submitted, hide stale draft rows.
    await conn.execute(
      `UPDATE lead_site_inspections
          SET status='submitted', updated_at=NOW()
        WHERE lead_id=?`,
      [leadId]
    );

    // Try to move lead.stage to 'site_inspection_completed'
    const TARGET_STAGE = 'inspection_completed';
    try {
      await conn.execute(
        `UPDATE leads
            SET stage=?, last_activity_at=NOW(), updated_at=NOW()
          WHERE id=?`,
        [TARGET_STAGE, leadId]
      );
    } catch (errStage) {
      // Fallback to 'inspection_completed' if enum doesn't include 'site_inspection_completed'
      const isEnumError = String(errStage?.message || '').toLowerCase().includes('data truncated') ||
                          String(errStage?.message || '').toLowerCase().includes('incorrect enum');
      if (isEnumError) {
        await conn.execute(
          `UPDATE leads
              SET stage='inspection_completed', last_activity_at=NOW(), updated_at=NOW()
            WHERE id=?`,
          [leadId]
        );
      } else {
        throw errStage;
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('[SITE-INSP] SUBMIT error:', e);
    if (e?.code === 'ER_NET_PACKET_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        message: 'Submit payload is too large. Please remove oversized inline images and try again.',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to submit site inspection' });
  } finally {
    try { await conn.release(); } catch {}
  }
});

export default router;