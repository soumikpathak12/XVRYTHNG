// src/controllers/trialUserController.js
import * as trialUserService from '../services/trialUserService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-\\s]{8,20}$/;

/** GET /api/trial-users */
export async function listTrialUsers(req, res) {
  try {
    const filters = {
      search: req.query.search ?? undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };
    const rows = await trialUserService.getTrialUsers(filters);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('List trial users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load trial users.' });
  }
}

/** GET /api/trial-users/count */
export async function getTrialUsersCount(req, res) {
  try {
    const total = await trialUserService.countTrialUsers({ search: req.query.search ?? undefined });
    return res.json({ success: true, total });
  } catch (err) {
    console.error('Count trial users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to count trial users.' });
  }
}

/** GET /api/trial-users/:id */
export async function getTrialUserById(req, res) {
  try {
    const id = req.params.id;
    const row = await trialUserService.getTrialUserById(id);
    return res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('Get trial user error:', err);
    const status = err.statusCode ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to get trial user.' });
  }
}

/** POST /api/trial-users */
export async function createTrialUser(req, res) {
  try {
    const { name, phone, email } = req.body ?? {};
    const errors = {};

    if (!name || !String(name).trim()) {
      errors.name = 'Name is required.';
    } else if (String(name).trim().length > 150) {
      errors.name = 'Name must be at most 150 characters.';
    }
    if (!email || !String(email).trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(String(email).trim())) {
      errors.email = 'Invalid email format.';
    }
    if (phone && !PHONE_RE.test(String(phone).trim())) {
      errors.phone = 'Invalid phone format.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const created = await trialUserService.createTrialUser({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : null,
      email: String(email).trim(),
    });

    if (!created || !created.id) {
      return res.status(500).json({ success: false, message: 'Insert failed (no row/id returned)' });
    }

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('Create trial user error:', err);
    const status = err.statusCode ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to create trial user.' });
  }
}

/** PATCH /api/trial-users/:id */
export async function updateTrialUser(req, res) {
  try {
    const id = req.params.id;
    const { name, phone, email } = req.body ?? {};
    const patch = {};

    if (name !== undefined) patch.name = name;
    if (phone !== undefined) patch.phone = phone;
    if (email !== undefined) patch.email = email;

    const errors = {};
    if (patch.name !== undefined) {
      if (!String(patch.name).trim()) errors.name = 'Name cannot be empty.';
      else if (String(patch.name).trim().length > 150) errors.name = 'Name must be at most 150 characters.';
    }
    if (patch.email !== undefined && !EMAIL_RE.test(String(patch.email).trim())) {
      errors.email = 'Invalid email format.';
    }
    if (patch.phone !== undefined && patch.phone && !PHONE_RE.test(String(patch.phone).trim())) {
      errors.phone = 'Invalid phone format.';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const updated = await trialUserService.updateTrialUser(id, patch);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Update trial user error:', err);
    const status = err.statusCode ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to update trial user.' });
  }
}

/** DELETE /api/trial-users/:id */
export async function deleteTrialUser(req, res) {
  try {
    const id = req.params.id;
    const ok = await trialUserService.deleteTrialUser(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Trial user not found.' });
    }
    return res.status(200).json({ success: true, message: 'Trial user deleted.' });
  } catch (err) {
    console.error('Delete trial user error:', err);
    const status = err.statusCode ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to delete trial user.' });
  }
}



export async function sendTrialLinks(req, res) {
  try {
    // Allow overriding link via body; fallback to env
    const bodyLink = (req.body?.trialLinkUrl || '').trim();
    const base = process.env.TRIAL_LINK_URL
      || (process.env.APP_BASE_URL ? (process.env.APP_BASE_URL.replace(/\/+$/, '') + '/trial/start') : null);

    const trialLinkUrl = bodyLink || base;
    if (!trialLinkUrl) {
      return res.status(400).json({ success: false, message: 'Missing TRIAL_LINK_URL or APP_BASE_URL env (or trialLinkUrl in body).' });
    }

    const companyName = process.env.COMPANY_NAME || 'XVRYTHNG';

    const result = await trialUserService.sendTrialLinksToAll({ trialLinkUrl, companyName });
    // { total, sent, failed, errors: [] }
    return res.status(200).json({ success: true, ...result, trialLinkUrl });
  } catch (err) {
    console.error('sendTrialLinks error:', err);
    return res.status(500).json({ success: false, message: err.message ?? 'Failed to send trial links.' });
  }
}