// src/services/trialUserService.js
import db from '../config/db.js';

import { sendTrialLinkEmail } from './emailService.js';


/**
 * Create a trial user and return the created row.
 * Throws error with statusCode on business rule violations (e.g. duplicate email).
 */
export async function createTrialUser({ name, phone = null, email }) {
  // Ensure unique email
  const [exists] = await db.execute(
    'SELECT id FROM trial_users WHERE email = ? LIMIT 1',
    [email]
  );
  if (exists?.[0]) {
    const err = new Error('Email already exists');
    err.statusCode = 409;
    throw err;
  }

  // Insert row
  const [ins] = await db.execute(
    `INSERT INTO trial_users (name, phone, email, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [String(name).trim(), phone ?? null, String(email).trim()]
  );
  if (!ins?.affectedRows) {
    const err = new Error('Insert returned 0 affected rows');
    err.statusCode = 500;
    throw err;
  }

  // Return created row
  const insertedId = ins.insertId;
  const [rows] = await db.execute(
    'SELECT id, name, phone, email, created_at, updated_at FROM trial_users WHERE id = ? LIMIT 1',
    [insertedId]
  );
  return rows?.[0] ?? null;
}

/**
 * List trial users with optional search/limit/offset.
 * Search runs against name, email, phone.
 */
export async function getTrialUsers({ search, limit, offset } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let limitSql = '';
  if (typeof limit === 'number' && limit > 0) {
    if (typeof offset === 'number' && offset >= 0) {
      limitSql = 'LIMIT ? OFFSET ?';
      params.push(limit, offset);
    } else {
      limitSql = 'LIMIT ?';
      params.push(limit);
    }
  }

  const sql = `
    SELECT id, name, phone, email, created_at, updated_at
    FROM trial_users
    ${whereSql}
    ORDER BY created_at DESC
    ${limitSql}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

/** Return a single trial user by id. */
export async function getTrialUserById(id) {
  if (!id || Number.isNaN(Number(id))) {
    const err = new Error('Invalid id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    'SELECT id, name, phone, email, created_at, updated_at FROM trial_users WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows?.[0];
  if (!row) {
    const err = new Error('Trial user not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

/**
 * Update a trial user (partial). Allowed fields: name, phone, email.
 * Enforces unique email if changed.
 */
export async function updateTrialUser(id, payload = {}) {
  if (!id || Number.isNaN(Number(id))) {
    const err = new Error('Invalid id');
    err.statusCode = 400;
    throw err;
  }

  // Ensure row exists
  const [ex] = await db.execute('SELECT id, email, name, phone FROM trial_users WHERE id = ? LIMIT 1', [id]);
  const existing = ex?.[0];
  if (!existing) {
    const err = new Error('Trial user not found');
    err.statusCode = 404;
    throw err;
  }

  const updates = [];
  const params = [];

  if (payload.name !== undefined) {
    updates.push('name = ?');
    params.push(payload.name ? String(payload.name).trim() : existing.name);
  }
  if (payload.phone !== undefined) {
    updates.push('phone = ?');
    params.push(payload.phone ?? null);
  }
  if (payload.email !== undefined) {
    const newEmail = payload.email ? String(payload.email).trim() : existing.email;
    if (newEmail && newEmail !== existing.email) {
      const [dup] = await db.execute('SELECT id FROM trial_users WHERE email = ? AND id <> ? LIMIT 1', [newEmail, id]);
      if (dup?.[0]) {
        const err = new Error('Email already exists');
        err.statusCode = 409;
        throw err;
      }
    }
    updates.push('email = ?');
    params.push(newEmail);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = NOW()');
  params.push(id);
  const sql = `UPDATE trial_users SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [rows] = await db.execute(
    'SELECT id, name, phone, email, created_at, updated_at FROM trial_users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows?.[0] ?? null;
}

/** Delete a trial user by id. Returns true if deleted. */
export async function deleteTrialUser(id) {
  if (!id || Number.isNaN(Number(id))) {
    const err = new Error('Invalid id');
    err.statusCode = 400;
    throw err;
  }
  const [res] = await db.execute('DELETE FROM trial_users WHERE id = ? LIMIT 1', [id]);
  return !!res?.affectedRows;
}

/** Count trial users (optional search filter) */
export async function countTrialUsers({ search } = {}) {
  const where = [];
  const params = [];
  if (search) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const sql = `
    SELECT COUNT(*) AS total
    FROM trial_users
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;
  const [rows] = await db.execute(sql, params);
  return rows?.[0]?.total ?? 0;
}



export async function getAllTrialUserEmails() {
  const [rows] = await db.execute(
    'SELECT id, name, email FROM trial_users WHERE email IS NOT NULL AND email <> ""'
  );
  return rows.map(r => ({ id: r.id, name: r.name, email: r.email }));
}

/**
 * Send trial link emails to all current trial users.
 * Returns { total, sent, failed, errors: [{ email, reason }] }
 */
export async function sendTrialLinksToAll({ trialLinkUrl, companyName = 'XVRYTHNG' }) {
  const recipients = await getAllTrialUserEmails();
  const result = { total: recipients.length, sent: 0, failed: 0, errors: [] };

  for (const r of recipients) {
    try {
      await sendTrialLinkEmail({
        to: r.email,
        recipientName: r.name,
        trialLink: trialLinkUrl,
        companyName,
      });
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ email: r.email, reason: err.message });
    }
  }
  return result;
}
