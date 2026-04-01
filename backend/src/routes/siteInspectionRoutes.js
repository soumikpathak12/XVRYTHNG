// backend/src/routes/siteInspectionRoutes.js
import { Router } from 'express';
import db from '../config/db.js';
import {
  formObjectToSiSqlParts,
  inspectionFormFromRowWithLegacyFallback,
  mergeInspectionFormPayload,
  siInsertColumnListSql,
  siInsertPlaceholders,
  formObjectToSiInsertValues,
  stripSiColumnsFromRow,
} from '../services/siteInspectionFormMapper.js';

const router = Router({ mergeParams: true });

const SI_COL_SQL = siInsertColumnListSql();
const SI_PLACEHOLDERS = siInsertPlaceholders();

function normalizeShadingText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

/** Prefer submitted, then newest row (form lives in si_* or legacy JSON). */
const BEST_ROW_ORDER = `
  ORDER BY
    CASE WHEN status = 'submitted' THEN 2 WHEN status = 'draft' THEN 1 ELSE 0 END DESC,
    updated_at DESC,
    id DESC
`;

// GET one inspection by lead
router.get('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const [rows] = await db.execute(
      `SELECT * FROM lead_site_inspections
        WHERE lead_id=?
        ${BEST_ROW_ORDER}
        LIMIT 1`,
      [leadId]
    );
    const row = rows?.[0];
    if (!row) {
      return res.json({ success: true, data: null });
    }
    const form = inspectionFormFromRowWithLegacyFallback(row);
    const data = stripSiColumnsFromRow(row);
    data.form = form;
    res.json({ success: true, data });
  } catch (e) {
    console.error('[SITE-INSP] GET error:', e);
    res.status(500).json({
      success: false,
      message: e?.sqlMessage || e?.message || 'Failed to load site inspection',
      code: e?.code,
    });
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
      shading: rawShading = null, form_data_json: formDataJsonBody = null, template_key = null, template_version = null,
    } = req.body || {};
    const shading = normalizeShadingText(rawShading);

    const [rows] = inspectionId
      ? await db.execute('SELECT * FROM lead_site_inspections WHERE id=? AND lead_id=? LIMIT 1', [inspectionId, leadId])
      : await db.execute(`SELECT * FROM lead_site_inspections WHERE lead_id=? ${BEST_ROW_ORDER} LIMIT 1`, [leadId]);

    const mergedForm = mergeInspectionFormPayload(rows?.[0], formDataJsonBody);
    const { fragments: siFrags, vals: siVals } = formObjectToSiSqlParts(mergedForm);

    if (rows?.[0]?.id) {
      await db.execute(
        `UPDATE lead_site_inspections
            SET status='draft',
                inspected_at=?, inspector_name=?, customer_name=?, signature_url=?, customer_notes=?,
                roof_type=?, roof_pitch_deg=?,
                house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
                shading=?, additional_notes=NULL, form_data_json=NULL, template_key=?, template_version=?,
                updated_at=NOW(),
                ${siFrags.join(', ')}
          WHERE id=? AND lead_id=?`,
        [
          inspected_at, inspector_name, customer_name, signature_url, customer_notes,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, template_key, template_version,
          ...siVals,
          rows[0].id,
          leadId,
        ]
      );
    } else {
      const insertSiVals = formObjectToSiInsertValues(mergedForm);
      await db.execute(
        `INSERT INTO lead_site_inspections
           (lead_id, status, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
            roof_type, roof_pitch_deg,
            house_storey, meter_phase, inverter_location, msb_condition,
            shading, additional_notes, form_data_json, template_key, template_version, created_at,
            ${SI_COL_SQL})
         VALUES
           (?, 'draft', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NOW(),
            ${SI_PLACEHOLDERS})`,
        [
          leadId, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, template_key, template_version,
          ...insertSiVals,
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
    res.status(500).json({
      success: false,
      message: e?.sqlMessage || e?.message || 'Failed to save draft',
      code: e?.code,
    });
  }
});

// POST /submit (finalize) —> status=submitted AND lead.stage -> site_inspection_completed (with fallback)
router.post('/submit', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const leadId = Number(req.params.leadId);
    const inspectionId = Number(req.body?.id || 0) || null;
    const {
      inspected_at, inspector_name, customer_name, signature_url, customer_notes,
      roof_type = null, roof_pitch_deg = null, house_storey = null, meter_phase = null,
      inverter_location = null, msb_condition = null, shading: rawShading = null,
      form_data_json: submitFormDataJson = null, template_key = null, template_version = null,
    } = req.body || {};
    const shading = normalizeShadingText(rawShading);

    if (!inspected_at || !customer_name?.trim()) {
      return res.status(400).json({ success: false, message: 'inspected_at and customer_name are required' });
    }

    await conn.beginTransaction();

    const [rows] = inspectionId
      ? await conn.execute('SELECT * FROM lead_site_inspections WHERE id=? AND lead_id=? LIMIT 1', [inspectionId, leadId])
      : await conn.execute(`SELECT * FROM lead_site_inspections WHERE lead_id=? ${BEST_ROW_ORDER} LIMIT 1`, [leadId]);

    const mergedForm = mergeInspectionFormPayload(rows?.[0], submitFormDataJson);
    const { fragments: siFrags, vals: siVals } = formObjectToSiSqlParts(mergedForm);

    if (rows?.[0]?.id) {
      await conn.execute(
        `UPDATE lead_site_inspections
            SET status='submitted',
                inspected_at=?, inspector_name=?, customer_name=?, signature_url=?, customer_notes=?,
                roof_type=?, roof_pitch_deg=?,
                house_storey=?, meter_phase=?, inverter_location=?, msb_condition=?,
                shading=?, additional_notes=NULL, form_data_json=NULL, template_key=?, template_version=?,
                updated_at=NOW(),
                ${siFrags.join(', ')}
          WHERE id=? AND lead_id=?`,
        [
          inspected_at, inspector_name || null, customer_name, signature_url || null, customer_notes || null,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, template_key, template_version,
          ...siVals,
          rows[0].id,
          leadId,
        ]
      );
    } else {
      const insertSiVals = formObjectToSiInsertValues(mergedForm);
      await conn.execute(
        `INSERT INTO lead_site_inspections
           (lead_id, status, inspected_at, inspector_name, customer_name, signature_url, customer_notes,
            roof_type, roof_pitch_deg,
            house_storey, meter_phase, inverter_location, msb_condition,
            shading, additional_notes, form_data_json, template_key, template_version, created_at,
            ${SI_COL_SQL})
         VALUES
           (?, 'submitted', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NOW(),
            ${SI_PLACEHOLDERS})`,
        [
          leadId, inspected_at, inspector_name || null, customer_name, signature_url || null, customer_notes || null,
          roof_type,
          !roof_pitch_deg ? null : Number(roof_pitch_deg),
          house_storey, meter_phase, inverter_location, msb_condition,
          shading, template_key, template_version,
          ...insertSiVals,
        ]
      );
    }

    await conn.execute(
      `UPDATE lead_site_inspections
          SET status='submitted', updated_at=NOW()
        WHERE lead_id=?`,
      [leadId]
    );

    const TARGET_STAGE = 'inspection_completed';
    try {
      await conn.execute(
        `UPDATE leads
            SET stage=?, last_activity_at=NOW(), updated_at=NOW()
          WHERE id=?`,
        [TARGET_STAGE, leadId]
      );
    } catch (errStage) {
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
    try { await conn.rollback(); } catch { /* ignore */ }
    console.error('[SITE-INSP] SUBMIT error:', e);
    if (e?.code === 'ER_NET_PACKET_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        message: 'Submit payload is too large. Please remove oversized inline images and try again.',
      });
    }
    res.status(500).json({
      success: false,
      message: e?.sqlMessage || e?.message || 'Failed to submit site inspection',
      code: e?.code,
    });
  } finally {
    try { await conn.release(); } catch { /* ignore */ }
  }
});

export default router;
