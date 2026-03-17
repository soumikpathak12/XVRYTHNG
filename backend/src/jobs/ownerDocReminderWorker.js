// backend/src/jobs/ownerDocReminderWorker.js
import db from '../config/db.js';
import {
  isValidEmail,
  sendAutomatedFollowupEmail,
  renderOwnerDocReminderEmail,
} from '../services/emailService.js';

// ENV
const ADMIN_EMAIL = (process.env.OWNER_DOC_ADMIN_EMAIL || '').trim();
const OWNER_SCHEDULE = (process.env.OWNER_DOC_REMINDER_SCHEDULE_MINUTES || '')
  .split(',')
  .map(s => Number(s.trim()))
  .filter(Number.isFinite);
const OWNER_REPEAT_LAST = String(process.env.OWNER_DOC_REMIND_REPEAT_LAST || 'true').toLowerCase() === 'true';
const INTERVAL_MS = Number(process.env.OWNER_DOC_REMINDER_SWEEP_INTERVAL_MS || 15 * 60 * 1000);

function nextDue(baseDate, k) {
  if (!OWNER_SCHEDULE.length || !baseDate) return null;
  const index = Math.min(k, OWNER_SCHEDULE.length - 1);
  const offset = OWNER_SCHEDULE[index];
  if (!offset && !OWNER_REPEAT_LAST) return null;
  return new Date(new Date(baseDate).getTime() + offset * 60 * 1000);
}

export async function runOwnerDocReminderSweep() {
  console.log('[OWNER-DOC] sweep started at', new Date().toISOString(),
    'schedule=', OWNER_SCHEDULE.join(','), 'repeatLast=', OWNER_REPEAT_LAST,
    'to=', ADMIN_EMAIL);

  if (!isValidEmail(ADMIN_EMAIL)) {
    console.error('[OWNER-DOC] ADMIN EMAIL invalid:', ADMIN_EMAIL);
    return;
  }

  const [rows] = await db.execute(`
    SELECT l.id, l.customer_name, l.created_at,
           l.owner_doc_last_sent_at, l.owner_doc_reminders_count
    FROM leads l
    WHERE l.stage NOT IN ('closed_lost','closed_won')
      AND NOT EXISTS (
        SELECT 1
        FROM lead_documents d
        WHERE d.lead_id = l.id
          AND d.status = 'received'
      )
  `);

  if (!rows.length) {
    console.log('[OWNER-DOC] no leads missing documents.');
    return;
  }

  for (const l of rows) {
    try {
      const k = Number(l.owner_doc_reminders_count || 0);
      const base = l.owner_doc_last_sent_at || l.created_at || new Date();
      const due = nextDue(base, k);
      if (!due) continue;
      if (Date.now() < due.getTime()) continue;  
      const leadMeta = { id: l.id, customer_name: l.customer_name };
      const subject = `Lead #${l.id} — Missing documents`;
      const html = renderOwnerDocReminderEmail({ assigneeName: 'Admin', lead: leadMeta });

      const providerId = await sendAutomatedFollowupEmail({
        to: ADMIN_EMAIL, subject, html,
      });

      // Log communication (Automated)
      await db.execute(
        `INSERT INTO lead_communications
         (lead_id, direction, channel, subject, body, automated, provider_message_id, sent_at)
         VALUES (?, 'outbound', 'email', ?, ?, 1, ?, NOW())`,
        [l.id, subject, html, providerId ?? null]
      );

      await db.execute(
        `UPDATE leads
         SET owner_doc_last_sent_at = NOW(),
             owner_doc_reminders_count = owner_doc_reminders_count + 1,
             last_activity_at = NOW()
         WHERE id = ?`,
        [l.id]
      );

      console.log('[OWNER-DOC] reminder sent OK. lead=', l.id, 'to=', ADMIN_EMAIL, 'pid=', providerId);
    } catch (e) {
      console.error('[OWNER-DOC] reminder error lead', l.id, e?.message || e);
    }
  }

  console.log('[OWNER-DOC] sweep finished at', new Date().toISOString());
}

export function startOwnerDocReminderWorker() {
  console.log('[OWNER-DOC] worker scheduled. interval(ms)=', INTERVAL_MS,
    'ADMIN_EMAIL=', ADMIN_EMAIL);
  setTimeout(async function loop() {
    try { await runOwnerDocReminderSweep(); }
    catch (err) { console.error('runOwnerDocReminderSweep failed', err?.message || err); }
    finally { setTimeout(loop, INTERVAL_MS); }
  }, 5000);
}