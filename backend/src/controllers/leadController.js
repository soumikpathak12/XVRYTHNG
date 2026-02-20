import * as leadService from '../services/leadService.js';
import * as customerCredentialsService from '../services/customerCredentialsService.js';

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

const STAGES_SET = new Set(STAGES);

function toMySQLDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = '00';
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
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
      site_inspection_date = null,
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

    if (!stage || !STAGES_SET.has(stage)) {
      errors.stage = 'Invalid stage selected.';
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

    // Required number + non-negative
    if (system_size_kw === undefined || system_size_kw === null || String(system_size_kw) === '') {
      errors.system_size_kw = 'System size (kW) is required.';
    } else if (Number.isNaN(Number(system_size_kw))) {
      errors.system_size_kw = 'System size must be a number (kW).';
    } else if (Number(system_size_kw) < 0) {
      errors.system_size_kw = 'System size cannot be negative.';
    }

    if (value_amount === undefined || value_amount === null || String(value_amount) === '') {
      errors.value_amount = 'Value amount is required.';
    } else if (Number.isNaN(Number(value_amount))) {
      errors.value_amount = 'Value amount must be a number.';
    } else if (Number(value_amount) < 0) {
      errors.value_amount = 'Value amount cannot be negative.';
    }

    // Optional date validation
    const normalizedInspection = toMySQLDateTime(site_inspection_date);
    if (site_inspection_date && !normalizedInspection) {
      errors.site_inspection_date = 'Invalid date format.';
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
      system_size_kw: Number(system_size_kw),
      value_amount: Number(value_amount),
      source: source ? String(source).trim() : null,
      site_inspection_date: normalizedInspection,
    };

    const lead = await leadService.createLead(payload);

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

    const { imported, failed, errors } = await leadService.importLeads(leads);

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

    const filters = {
      stage: req.query.stage || undefined,
      search: req.query.search || undefined,
      assigned_user: req.query.assigned_user || undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };

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
    if (body.stage !== undefined) payload.stage = body.stage;
    if (body.customer_name !== undefined) payload.customer_name = body.customer_name;
    if (body.suburb !== undefined) payload.suburb = body.suburb;
    if (body.system_size_kw !== undefined) payload.system_size_kw = body.system_size_kw;
    if (body.value_amount !== undefined) payload.value_amount = body.value_amount;
    if (body.source !== undefined) payload.source = body.source;
    if (body.site_inspection_date !== undefined) payload.site_inspection_date = toMySQLDateTime(body.site_inspection_date);

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

    if (body.nmi_number !== undefined) payload.nmi_number = trimOrNull(body.nmi_number, 50);
    if (body.meter_number !== undefined) payload.meter_number = trimOrNull(body.meter_number, 50);

    if (Object.keys(payload).length === 0) {
      const result = await leadService.getLeadById(leadId);
      return res.status(200).json({ success: true, data: result.lead });
    }

    if (payload.stage && !STAGES_SET.has(payload.stage)) {
      return res.status(422).json({ success: false, errors: { stage: 'Invalid stage.' } });
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

// -------------------- UPDATE STAGE --------------------
export async function updateLeadStage(req, res) {
  try {
    const leadId = req.params.id;
    const { stage } = req.body || {};

    if (!stage || !STAGES_SET.has(stage)) {
      return res.status(422).json({
        success: false,
        errors: { stage: 'Invalid stage selected.' },
      });
    }

    const updated = await leadService.updateLeadStage(leadId, stage);
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
    });
  } catch (err) {
    console.error('Send customer credentials error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to send credentials.',
    });
  }
}
