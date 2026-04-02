import * as leadService from '../services/leadService.js';
import * as customerCredentialsService from '../services/customerCredentialsService.js';
import * as db from '../config/db.js';
import * as activityService from '../services/activityService.js';
import * as companyWorkflowService from '../services/companyWorkflowService.js';
import {
  getPanelBrandOptions,
  getPanelModelOptionsByBrand,
} from '../services/cecApprovedService.js';

const STAGES = [
  'new',
  'contacted',
  'qualified',
  'inspection_booked',
  'inspection_completed',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

/** @deprecated use company workflow — kept for dashboard bucket keys */
const STAGES_SET = new Set(STAGES);

function toMySQLDateTime(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // Expected from datetime-local: "YYYY-MM-DDTHH:mm" (naive wall-clock time)
  // DO NOT use `new Date()` as it interprets the time as UTC!
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/);
  if (m) {
    // Extract wall-clock parts directly, no timezone conversion
    return `${m[1]} ${m[2]}:00`;
  }

  // Fallback: try to parse if it's already in MySQL format
  if (s.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return s;
  }

  return null;
}
function toBoolOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}
function trimOrNull(v, max = 255) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

// -------------------- CREATE --------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-\s]*[0-9][0-9()+\-\s]*$/;


export async function createLead(req, res) {
  try {
    const {
      stage,
      customer_name,
      email,
      phone,
      suburb,
      system_size_kw,
      value_amount,
      source = null,
      inspector_id,
      site_inspection_date = null,
      sales_segment,
    } = req.body || {};

    const errors = {};

    // Required text
    if (!customer_name || !String(customer_name).trim()) {
      errors.customer_name = 'Customer name is required.';
    } else if (String(customer_name).trim().length > 150) {
      errors.customer_name = 'Customer name must be at most 150 characters.';
    }

    if (!suburb || !String(suburb).trim()) {
      errors.suburb = 'Suburb is required.';
    }

    // Required email
    if (!email || !String(email).trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(String(email).trim())) {
      errors.email = 'Invalid email format.';
    }

    // Required phone
    if (!phone || !String(phone).trim()) {
      errors.phone = 'Phone is required.';
    } else if (!PHONE_RE.test(String(phone).trim())) {
      errors.phone = 'Invalid phone format.';
    }

    // Optional numbers (validate only when provided)
    if (system_size_kw !== undefined && system_size_kw !== null && String(system_size_kw) !== '') {
      if (Number.isNaN(Number(system_size_kw))) {
        errors.system_size_kw = 'System size must be a number (kW).';
      } else if (Number(system_size_kw) < 0) {
        errors.system_size_kw = 'System size cannot be negative.';
      }
    }

    if (value_amount !== undefined && value_amount !== null && String(value_amount) !== '') {
      if (Number.isNaN(Number(value_amount))) {
        errors.value_amount = 'Value amount must be a number.';
      } else if (Number(value_amount) < 0) {
        errors.value_amount = 'Value amount cannot be negative.';
      }
    }

    // Optional date validation
    const normalizedInspection = toMySQLDateTime(site_inspection_date);
    if (site_inspection_date && !normalizedInspection) {
      errors.site_inspection_date = 'Invalid date format.';
    }

    // Optional inspector assignment for site inspection
    if (inspector_id !== undefined) {
      if (inspector_id === null || inspector_id === '') {
        // treat empty as "not assigned"
      } else if (Number.isNaN(Number(inspector_id))) {
        errors.inspector_id = 'Invalid inspector_id.';
      }
    }

    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    const { allKeys, enabledKeys } = await companyWorkflowService.getLeadStageSets(companyId);
    if (!stage || !companyWorkflowService.isSafeStageKey(stage) || !allKeys.has(stage)) {
      errors.stage = 'Invalid stage selected.';
    } else if (!enabledKeys.has(stage)) {
      errors.stage = 'This stage is disabled in your workflow settings.';
    }

    if (sales_segment !== undefined && sales_segment !== null && sales_segment !== '') {
      const s = String(sales_segment).toLowerCase();
      if (s !== 'b2c' && s !== 'b2b') {
        errors.sales_segment = 'Must be b2c or b2b.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const payload = {
      stage,
      customer_name: String(customer_name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      suburb: String(suburb).trim(),
      system_size_kw:
        system_size_kw === undefined || system_size_kw === null || String(system_size_kw) === ''
          ? null
          : Number(system_size_kw),
      value_amount:
        value_amount === undefined || value_amount === null || String(value_amount) === ''
          ? null
          : Number(value_amount),
      source: source ? String(source).trim() : null,
      site_inspection_date: normalizedInspection,
      inspector_id:
        inspector_id === undefined || inspector_id === null || inspector_id === ''
          ? undefined
          : Number(inspector_id),
      sales_segment:
        sales_segment === undefined || sales_segment === null || sales_segment === ''
          ? null
          : String(sales_segment).toLowerCase(),
    };

    const lead = await leadService.createLead(payload, { allowedStageKeys: enabledKeys });

    // Log activity: lead created
    try {
      await activityService.logActivity({
        companyId: req.tenantId ?? req.user?.companyId ?? null,
        userId: req.user?.id ?? null,
        leadId: lead.id,
        actionType: 'lead_created',
        description: `created lead "${lead.customer_name}"`,
        meta: { stage: lead.stage, value_amount: lead.value_amount },
      });
    } catch (e) {
      console.warn('logActivity lead_created failed:', e.message);
    }

    if (!lead || typeof lead.id !== 'number') {
      return res.status(500).json({
        success: false,
        message: 'Insert failed (no row/id returned)',
      });
    }

    return res.status(201).json({ success: true, data: lead });
  } catch (err) {
    console.error('Create lead error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to create lead.',
    });
  }
}


// -------------------- IMPORT --------------------
export async function importLeads(req, res) {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided.' });
    }

    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    const { enabledKeys } = await companyWorkflowService.getLeadStageSets(companyId);
    const { imported, failed, errors } = await leadService.importLeads(leads, {
      allowedStageKeys: enabledKeys,
    });

    return res.status(200).json({
      success: true,
      data: { imported, failed, errors },
      message: `Imported ${imported} leads. ${failed} failed.`,
    });
  } catch (err) {
    console.error('Import leads error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// -------------------- LIST --------------------
export async function listLeads(req, res) {
  try {
    const grouped = String(req.query.grouped || '').trim() === '1';

    const segQ = String(req.query.sales_segment || '').trim().toLowerCase();
    const filters = {
      stage: req.query.stage || undefined,
      search: req.query.search || undefined,
      assigned_user: req.query.assigned_user || undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      sales_segment: segQ === 'b2c' || segQ === 'b2b' ? segQ : undefined,
    };

    // IMPORTANT:
    // Do NOT auto-restrict employee Leads Pipeline.
    // Only restrict to assigned site inspections when explicitly requested by the UI.
    // Example: GET /api/leads?site_inspection=1
    const siteInspectionScope = String(req.query.site_inspection || '').trim() === '1';
    if (siteInspectionScope) {
      const companyId = req.tenantId ?? req.user?.companyId ?? null;
      if (companyId != null && req.user?.id) {
        try {
          const { getEmployeeIdByUserId } = await import('../services/attendanceService.js');
          const employeeId = await getEmployeeIdByUserId(companyId, req.user.id);
          if (employeeId != null) {
            filters.inspector_id = employeeId;
          } else {
            // No employee record -> return empty list for site inspection scope
            return res.status(200).json({ success: true, data: grouped ? {} : [] });
          }
        } catch (e) {
          return res.status(200).json({ success: true, data: grouped ? {} : [] });
        }
      } else {
        return res.status(200).json({ success: true, data: grouped ? {} : [] });
      }
    }

    const rows = await leadService.getLeads(filters);

    if (!grouped) {
      return res.status(200).json({ success: true, data: rows });
    }

    const bucket = STAGES.reduce((acc, s) => {
      acc[s] = [];
      return acc;
    }, {});

    for (const r of rows) {
      if (bucket[r.stage]) bucket[r.stage].push(r);
      else {
        if (!bucket._unknown) bucket._unknown = [];
        bucket._unknown.push(r);
      }
    }

    return res.status(200).json({ success: true, data: bucket });
  } catch (err) {
    console.error('List leads error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load leads.',
    });
  }
}

/** POST /api/leads/:id/customer-portal-announce { type: 'pre_approval' | 'solar_vic' } — staff only */
export async function announceCustomerPortalUtility(req, res) {
  try {
    if (String(req.user?.role || '').toLowerCase() === 'customer') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const leadId = req.params.id;
    const { type } = req.body || {};
    const updated = await leadService.announceCustomerPortalUtilityToCustomer(leadId, type);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update customer portal.',
    });
  }
}

// -------------------- GET BY ID (with relations) --------------------
export async function getLeadById(req, res) {
  try {
    const leadId = req.params.id;
    const result = await leadService.getLeadById(leadId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Get lead error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Lead not found.',
    });
  }
}

// -------------------- UPDATE (full) --------------------
export async function updateLead(req, res) {
  try {
    const leadId = req.params.id;
    const body = req.body || {};
    const payload = {};
    const panelBrand = body.pv_panel_brand !== undefined ? trimOrNull(body.pv_panel_brand, 120) : undefined;
    const panelModel = body.pv_panel_model !== undefined ? trimOrNull(body.pv_panel_model, 120) : undefined;
    if (body.stage !== undefined) payload.stage = body.stage;
    if (body.customer_name !== undefined) payload.customer_name = body.customer_name;
    if (body.suburb !== undefined) payload.suburb = body.suburb;
    if (body.system_size_kw !== undefined) payload.system_size_kw = body.system_size_kw;
    if (body.value_amount !== undefined) payload.value_amount = body.value_amount;
    if (body.source !== undefined) payload.source = body.source;
    if (body.site_inspection_date !== undefined) payload.site_inspection_date = toMySQLDateTime(body.site_inspection_date);
    if (body.inspector_id !== undefined) payload.inspector_id = body.inspector_id;
    if (body.email !== undefined) {
      const email = trimOrNull(body.email, 255);
      if (email && !EMAIL_RE.test(email)) {
        return res.status(422).json({ success: false, errors: { email: 'Invalid email format.' } });
      }
      payload.email = email;
    }
    if (body.phone !== undefined) {
      const phone = trimOrNull(body.phone, 50);
      if (phone && !PHONE_RE.test(phone)) {
        return res.status(422).json({ success: false, errors: { phone: 'Invalid phone format.' } });
      }
      payload.phone = phone;
    }
    if (body.sales_segment !== undefined) {
      const s = body.sales_segment;
      if (s === null || s === '') {
        payload.sales_segment = null;
      } else {
        const low = String(s).toLowerCase();
        if (low !== 'b2c' && low !== 'b2b') {
          return res.status(422).json({ success: false, errors: { sales_segment: 'Must be b2c or b2b.' } });
        }
        payload.sales_segment = low;
      }
    }

    if (body.system_type !== undefined) payload.system_type = trimOrNull(body.system_type, 100);
    if (body.house_storey !== undefined) payload.house_storey = trimOrNull(body.house_storey, 50);
    if (body.roof_type !== undefined) payload.roof_type = trimOrNull(body.roof_type, 100);
    if (body.meter_phase !== undefined) payload.meter_phase = trimOrNull(body.meter_phase, 20);

    if (body.access_to_second_storey !== undefined)
      payload.access_to_second_storey = toBoolOrNull(body.access_to_second_storey);
    if (body.access_to_inverter !== undefined)
      payload.access_to_inverter = toBoolOrNull(body.access_to_inverter);

    if (body.pre_approval_reference_no !== undefined)
      payload.pre_approval_reference_no = trimOrNull(body.pre_approval_reference_no, 100);
    if (body.energy_retailer !== undefined)
      payload.energy_retailer = trimOrNull(body.energy_retailer, 120);
    if (body.energy_distributor !== undefined)
      payload.energy_distributor = trimOrNull(body.energy_distributor, 120);

    if (body.solar_vic_eligibility !== undefined)
      payload.solar_vic_eligibility = toBoolOrNull(body.solar_vic_eligibility);

    const isCustomer = String(req.user?.role || '').toLowerCase() === 'customer';
    if (!isCustomer) {
      if (body.customer_portal_pre_approval_announced !== undefined) {
        payload.customer_portal_pre_approval_announced = !!body.customer_portal_pre_approval_announced;
      }
      if (body.customer_portal_solar_vic_announced !== undefined) {
        payload.customer_portal_solar_vic_announced = !!body.customer_portal_solar_vic_announced;
      }
    }

    if (body.nmi_number !== undefined) payload.nmi_number = trimOrNull(body.nmi_number, 50);
    if (body.meter_number !== undefined) payload.meter_number = trimOrNull(body.meter_number, 50);

    // PV details
    if (body.pv_system_size_kw !== undefined)
      payload.pv_system_size_kw = body.pv_system_size_kw;
    if (body.pv_inverter_size_kw !== undefined)
      payload.pv_inverter_size_kw = body.pv_inverter_size_kw;
    if (body.pv_inverter_brand !== undefined)
      payload.pv_inverter_brand = trimOrNull(body.pv_inverter_brand, 120);
    if (body.pv_inverter_model !== undefined)
      payload.pv_inverter_model = trimOrNull(body.pv_inverter_model, 120);
    if (body.pv_inverter_series !== undefined)
      payload.pv_inverter_series = trimOrNull(body.pv_inverter_series, 120);
    if (body.pv_inverter_power_kw !== undefined)
      payload.pv_inverter_power_kw = body.pv_inverter_power_kw;
    if (body.pv_inverter_quantity !== undefined)
      payload.pv_inverter_quantity = body.pv_inverter_quantity;
    if (body.pv_panel_brand !== undefined)
      payload.pv_panel_brand = panelBrand;
    if (body.pv_panel_model !== undefined)
      payload.pv_panel_model = panelModel;
    if (body.pv_panel_quantity !== undefined)
      payload.pv_panel_quantity = body.pv_panel_quantity;
    if (body.pv_panel_module_watts !== undefined)
      payload.pv_panel_module_watts = body.pv_panel_module_watts;

    // EV charger details
    if (body.ev_charger_brand !== undefined)
      payload.ev_charger_brand = trimOrNull(body.ev_charger_brand, 120);
    if (body.ev_charger_model !== undefined)
      payload.ev_charger_model = trimOrNull(body.ev_charger_model, 120);

    // Battery details
    if (body.battery_size_kwh !== undefined)
      payload.battery_size_kwh = body.battery_size_kwh;
    if (body.battery_brand !== undefined)
      payload.battery_brand = trimOrNull(body.battery_brand, 120);
    if (body.battery_model !== undefined)
      payload.battery_model = trimOrNull(body.battery_model, 120);

    if (panelBrand !== undefined && panelBrand) {
      const { brands } = await getPanelBrandOptions();
      const approvedBrand = brands.some(
        (brand) => brand.toLowerCase() === panelBrand.toLowerCase(),
      );
      if (!approvedBrand) {
        return res.status(422).json({
          success: false,
          errors: { pv_panel_brand: 'Panel manufacturer is not in the approved CEC list.' },
        });
      }
    }

    if (panelModel !== undefined && panelModel) {
      const brandForModel = panelBrand ?? payload.pv_panel_brand ?? null;
      if (brandForModel) {
        const models = await getPanelModelOptionsByBrand(brandForModel);
        const approvedModel = (models.models || []).some(
          (model) => model.toLowerCase() === panelModel.toLowerCase(),
        );
        if (!approvedModel) {
          return res.status(422).json({
            success: false,
            errors: { pv_panel_model: 'Panel model is not approved for the selected manufacturer.' },
          });
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      const result = await leadService.getLeadById(leadId);
      return res.status(200).json({ success: true, data: result.lead });
    }

    if (payload.stage) {
      const companyId = req.tenantId ?? req.user?.companyId ?? null;
      const { allKeys, enabledKeys } = await companyWorkflowService.getLeadStageSets(companyId);
      if (
        !companyWorkflowService.isSafeStageKey(payload.stage) ||
        !allKeys.has(payload.stage) ||
        !enabledKeys.has(payload.stage)
      ) {
        return res.status(422).json({ success: false, errors: { stage: 'Invalid or disabled stage.' } });
      }
    }
    const updated = await leadService.updateLead(leadId, payload);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Update lead error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update lead.',
    });
  }
}

/** GET /api/leads/catalog/panels?brand=... */
export async function getLeadPanelCatalog(req, res) {
  try {
    const brand = trimOrNull(req.query?.brand, 255);
    if (brand) {
      const data = await getPanelModelOptionsByBrand(brand);
      return res.status(200).json({ success: true, data });
    }

    const data = await getPanelBrandOptions();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getLeadPanelCatalog error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load panel catalog.' });
  }
}

// -------------------- UPDATE STAGE --------------------
export async function updateLeadStage(req, res) {
  try {
    const leadId = req.params.id;
    const { stage } = req.body || {};

    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    const { enabledKeys } = await companyWorkflowService.getLeadStageSets(companyId);
    if (!stage || !companyWorkflowService.isSafeStageKey(stage) || !enabledKeys.has(stage)) {
      return res.status(422).json({
        success: false,
        errors: { stage: 'Invalid stage selected or stage is disabled in your workflow.' },
      });
    }

    const updated = await leadService.updateLeadStage(leadId, stage);

    // Log activity: stage changed / proposal sent
    try {
      const companyId = req.tenantId ?? req.user?.companyId ?? null;
      const userId = req.user?.id ?? null;
      const prevStage = updated.previous_stage ?? null;
      const actionType = stage === 'proposal_sent' ? 'proposal_sent' : 'stage_changed';
      const desc =
        actionType === 'proposal_sent'
          ? `sent proposal for "${updated.customer_name}"`
          : `moved "${updated.customer_name}" to ${stage}`;

      await activityService.logActivity({
        companyId,
        userId,
        leadId,
        actionType,
        description: desc,
        meta: { from: prevStage, to: stage },
      });
    } catch (e) {
      console.warn('logActivity stage_changed failed:', e.message);
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Update stage error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update lead stage.',
    });
  }
}

// -------------------- SCHEDULE INSPECTION --------------------
export async function scheduleInspection(req, res) {
  try {
    const leadId = req.params.id;
    const { scheduledDate, scheduledTime, inspectorId } = req.body || {};

    if (!scheduledDate || !scheduledTime || !inspectorId) {
      return res.status(422).json({
        success: false,
        errors: { schedule: 'Date, time, and inspector are required.' },
      });
    }

    const dateOnly = String(scheduledDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return res.status(422).json({
        success: false,
        errors: { schedule: 'Invalid scheduled date format. Use YYYY-MM-DD.' },
      });
    }
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateOnly < todayStr) {
      return res.status(422).json({
        success: false,
        errors: { schedule: 'Cannot schedule inspection in the past.' },
      });
    }

    const updated = await leadService.scheduleLeadInspection(leadId, {
      scheduledDate,
      scheduledTime,
      inspectorId,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Schedule inspection error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to schedule inspection.',
    });
  }
}

export async function addLeadNote(req, res) {
  try {
    const leadId = req.params.id;
    const { body, followUpAt } = req.body ?? {};
    const errors = {};

    if (!body || !String(body).trim()) {
      errors.body = 'Comment is required.';
    } else if (String(body).trim().length > 4000) {
      errors.body = 'Comment must be at most 4000 characters.';
    }
    let followUp = null;
    if (followUpAt) {
      const d = new Date(followUpAt);
      if (Number.isNaN(d.getTime())) {
        errors.followUpAt = 'Invalid follow up date.';
      } else {
        // Store as MySQL DATETIME "YYYY-MM-DD HH:mm:00"
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        followUp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const createdBy = req.user?.id ?? null; // requireAuth sets req.user
    const note = await leadService.addLeadNote(leadId, {
      body: String(body).trim(),
      followUpAt: followUp,
      createdBy,
    });

    // Return an activity-shaped item so your UI can swap the optimistic item.
    const activity = {
      id: `note-${note.id}`,
      type: 'note',
      title: 'Comment added',
      created_at: note.created_at,
      body: note.body + (note.follow_up_at ? `\n\nNext follow-up: ${String(note.follow_up_at).slice(0, 10)}` : ''),
    };

    // Best-effort: log \"call logged\" when note looks like a call
    try {
      const lower = String(body).trim().toLowerCase();
      if (lower.startsWith('call:') || lower.startsWith('called ')) {
        await activityService.logActivity({
          companyId: req.tenantId ?? req.user?.companyId ?? null,
          userId: createdBy,
          leadId,
          actionType: 'call_logged',
          description: `logged a call on lead #${leadId}`,
          meta: { noteId: note.id },
        });
      }
    } catch (e) {
      console.warn('logActivity call_logged failed:', e.message);
    }

    return res.status(201).json({ success: true, data: activity });
  } catch (err) {
    console.error('Add lead note error:', err);
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({
      success: false,
      message: err.message ?? 'Failed to add note.',
    });
  }
}

/** -------------------- NOTES: LIST -------------------- */
export async function listLeadNotes(req, res) {
  try {
    const leadId = req.params.id;
    const rows = await leadService.getLeadNotes(leadId);

    const activities = rows.map((n) => ({
      id: `note-${n.id}`,
      type: 'note',
      title: 'Comment added',
      created_at: n.created_at,
      body: n.body + (n.follow_up_at ? `\n\nNext follow-up: ${String(n.follow_up_at).slice(0, 10)}` : ''),
    }));
    return res.status(200).json({ success: true, data: activities });
  } catch (err) {
    console.error('List lead notes error:', err);
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({
      success: false,
      message: err.message ?? 'Failed to load notes.',
    });
  }
}

/** -------------------- CUSTOMER PORTAL TEST LINK (no email sent) -------------------- */
export async function getCustomerPortalTestLink(req, res) {
  try {
    const rawId = req.params.id ?? req.query.leadId ?? req.body?.leadId;
    const leadId = rawId != null ? String(rawId) : null;
    if (!leadId || !leadId.trim()) {
      return res.status(400).json({ success: false, message: 'leadId is required (param or query).' });
    }
    const result = await leadService.getLeadById(leadId.trim());
    const lead = result.lead;
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    const email = lead.email && String(lead.email).trim();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'Lead must have a valid email address.' });
    }
    const customerName = lead.customer_name && String(lead.customer_name).trim() || null;
    const linkToken = customerCredentialsService.createLinkToken(email, { leadId: lead.id, customerName });
    const portalBaseUrl = process.env.PORTAL_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
    const loginUrl = `${portalBaseUrl}/portal/login?token=${linkToken}`;
    return res.status(200).json({
      success: true,
      loginUrl,
      email,
      message: 'Test link created (valid 7 days). No email sent.',
    });
  } catch (err) {
    console.error('Customer portal test link error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create test link.',
    });
  }
}

/** -------------------- SEND CUSTOMER CREDENTIALS (Closed Won only) -------------------- */
export async function sendCustomerCredentials(req, res) {
  try {
    const leadId = req.params.id;
    const result = await leadService.getLeadById(leadId);
    const lead = result.lead;
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    if (lead.stage !== 'closed_won') {
      return res.status(400).json({ success: false, message: 'Only leads in Closed Won stage can receive portal credentials.' });
    }
    const email = lead.email && String(lead.email).trim();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'Lead must have a valid email address.' });
    }

    const customerName = lead.customer_name && String(lead.customer_name).trim() || null;
    const linkToken = customerCredentialsService.createLinkToken(email, { leadId: lead.id, customerName });
    const portalBaseUrl = process.env.PORTAL_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
    const loginUrl = `${portalBaseUrl}/portal/login?token=${linkToken}`;
    await customerCredentialsService.sendPortalLinkEmail({
      to: email,
      customerName,
      loginUrl,
    });

    return res.status(200).json({
      success: true,
      message: 'Portal link sent to customer.',
      email,
      loginUrl, // so staff can copy link for testing
    });
  } catch (err) {
    console.error('Send customer credentials error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to send credentials.',
    });
  }
}


export async function getLeadsCount(req, res) {
  try {
    const { stage, search } = req.query;
    const total = await leadService.countLeads({ stage, search });
    return res.json({ success: true, total });
  } catch (err) {
    console.error('getLeadsCount error', err);
    return res.status(500).json({ success: false, message: 'Failed to count leads' });
  }
}

// GET /api/leads/dashboard?range=week|month|quarter|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getSalesDashboard(req, res) {
  try {
    const { range = 'month', from: customFrom = null, to: customTo = null } = req.query;
    const [metrics, team] = await Promise.all([
      leadService.getSalesDashboardMetrics({ range, customFrom, customTo }),
      leadService.getTeamPerformance({ range, customFrom, customTo }),
    ]);
    return res.json({ success: true, data: { ...metrics, team_performance: team } });
  } catch (err) {
    console.error('getSalesDashboard error', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard metrics' });
  }
}
