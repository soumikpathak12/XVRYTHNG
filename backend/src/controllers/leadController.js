import * as leadService from '../services/leadService.js';

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

// -------------------- CREATE --------------------
export async function createLead(req, res) {
  try {
    const {
      stage,
      customer_name,
      suburb = null,
      system_size_kw = null,
      value_amount = null,
      source = null,
      site_inspection_date = null,
    } = req.body || {};

    const errors = {};

    if (!customer_name || !String(customer_name).trim()) {
      errors.customer_name = 'Customer name is required.';
    } else if (String(customer_name).trim().length > 150) {
      errors.customer_name = 'Customer name must be at most 150 characters.';
    }

    if (!STAGES_SET.has(stage)) {
      errors.stage = 'Invalid stage selected.';
    }

    if (system_size_kw != null && Number.isNaN(Number(system_size_kw))) {
      errors.system_size_kw = 'System size must be a number (kW).';
    }

    if (value_amount != null && Number.isNaN(Number(value_amount))) {
      errors.value_amount = 'Value amount must be a number.';
    }

    
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
      suburb: suburb ? String(suburb).trim() : null,
      system_size_kw: system_size_kw != null ? Number(system_size_kw) : null,
      value_amount: value_amount != null ? Number(value_amount) : null,
      source: source ? String(source).trim() : null,
      site_inspection_date: normalizedInspection,
    };

    const lead = await leadService.createLead(payload);

    return res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (err) {
    console.error('Create lead error:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to create lead.',
    });
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