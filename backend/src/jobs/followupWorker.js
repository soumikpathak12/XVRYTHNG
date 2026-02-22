// backend/src/jobs/followupWorker.js
import db from '../config/db.js';
import {
  isValidEmail,
  sendAutomatedFollowupEmail,
  renderBrandedFollowup,
} from '../services/emailService.js';

const FIRST_DELAY_MINUTES  = Number(process.env.FU_FIRST_DELAY_MINUTES  || 48 * 60);
const SECOND_DELAY_MINUTES = Number(process.env.FU_SECOND_DELAY_MINUTES || 48 * 60);
const CLOSE_AFTER_SECOND_MINUTES = Number(process.env.FU_CLOSE_AFTER_SECOND_MINUTES || 0);

async function selectFirstFollowups(delayMinutes) {
  const sql = `
    SELECT l.*
    FROM leads l
    WHERE l.stage = 'contacted'
      AND l.followup_first_sent_at IS NULL
      AND l.email IS NOT NULL AND l.email <> ''
      AND TIMESTAMPDIFF(MINUTE, COALESCE(l.last_inbound_email_at, l.contacted_at), NOW()) >= ?
  `;
  const [rows] = await db.execute(sql, [delayMinutes]);
  return rows;
}

async function selectSecondFollowups(delayMinutes) {
  const sql = `
    SELECT l.*
    FROM leads l
    WHERE l.stage = 'contacted'
      AND l.followup_first_sent_at IS NOT NULL
      AND l.followup_second_sent_at IS NULL
      AND l.email IS NOT NULL AND l.email <> ''
      AND TIMESTAMPDIFF(MINUTE, COALESCE(l.last_inbound_email_at, l.followup_first_sent_at), NOW()) >= ?
  `;
  const [rows] = await db.execute(sql, [delayMinutes]);
  return rows;
}

async function selectToFlagAfterSecond() {
  const sql = `
    SELECT l.*
    FROM leads l
    WHERE l.stage = 'contacted'
      AND l.followup_second_sent_at IS NOT NULL
      AND l.flagged_for_review_at IS NULL
      AND TIMESTAMPDIFF(MINUTE, COALESCE(l.last_inbound_email_at, l.followup_second_sent_at), NOW()) >= 0
  `;
  const [rows] = await db.execute(sql);
  return rows;
}

async function selectToAutoCloseAfterSecond(closeDelayMinutes) {
  if (!Number.isFinite(closeDelayMinutes) || closeDelayMinutes <= 0) return [];
  const sql = `
    SELECT l.*
    FROM leads l
    WHERE l.stage = 'contacted'
      AND l.followup_second_sent_at IS NOT NULL
      AND (l.last_inbound_email_at IS NULL OR l.last_inbound_email_at < l.followup_second_sent_at)
      AND TIMESTAMPDIFF(MINUTE, l.followup_second_sent_at, NOW()) >= ?
  `;
  const [rows] = await db.execute(sql, [closeDelayMinutes]);
  return rows;
}

async function logOutbound(leadId, { subject, body, automated, providerId }) {
  await db.execute(
    `INSERT INTO lead_communications
     (lead_id, direction, channel, subject, body, automated, provider_message_id, sent_at)
     VALUES (?, 'outbound', 'email', ?, ?, ?, ?, NOW())`,
    [leadId, subject, body, automated ? 1 : 0, providerId ?? null]
  );
}

async function maybeAutoClose(lead) {
  if (lead.auto_close_nonresponsive) {
    await db.execute(
      `UPDATE leads
       SET stage='closed_lost', is_closed=1, is_won=0, won_lost_at=NOW(),
           lost_reason='Non-responsive', last_activity_at=NOW()
       WHERE id=?`,
      [lead.id]
    );
  }
}

export async function runFollowupSweep(opts = {}) {
  const firstMin  = Number.isFinite(opts.overrideFirstMinutes)  ? opts.overrideFirstMinutes  : FIRST_DELAY_MINUTES;
  const secondMin = Number.isFinite(opts.overrideSecondMinutes) ? opts.overrideSecondMinutes : SECOND_DELAY_MINUTES;

  console.log('[FU] sweep started at', new Date().toISOString());
  console.log('[FU] delays: first=%s min, second=%s min, closeAfterSecond=%s min',
    firstMin, secondMin, CLOSE_AFTER_SECOND_MINUTES);

  // ===== FIRST FOLLOW-UPS =====
  const first = await selectFirstFollowups(firstMin);
  console.log('[FU] first-candidates:', first.map(l => ({ id: l.id, email: l.email })));

  for (const l of first) {
    try {
      if (!isValidEmail(l.email)) {
        console.warn('[FU] skip (invalid email):', l.id, l.email);
        continue;
      }
      console.log('[FU] sending FIRST to', l.id, l.email);
      const subject = 'Following up on your enquiry';
      const html = renderBrandedFollowup({ customerName: l.customer_name, round: 1 });
      const providerId = await sendAutomatedFollowupEmail({ to: l.email, subject, html });

      await logOutbound(l.id, { subject, body: html, automated: true, providerId });
      await db.execute(
        `UPDATE leads
         SET followup_first_sent_at=NOW(), last_outbound_email_at=NOW(), last_activity_at=NOW()
         WHERE id=?`,
        [l.id]
      );
      console.log('[FU] first sent OK. lead=%s providerId=%s', l.id, providerId);
    } catch (e) {
      console.error('[FU] first error lead', l.id, e?.message || e);
    }
  }

  const second = await selectSecondFollowups(secondMin);
  console.log('[FU] second-candidates:', second.map(l => ({ id: l.id, email: l.email })));

  for (const l of second) {
    try {
      if (!isValidEmail(l.email)) {
        console.warn('[FU] skip (invalid email):', l.id, l.email);
        continue;
      }
      console.log('[FU] sending SECOND to', l.id, l.email);
      const subject = 'Quick follow-up';
      const html = renderBrandedFollowup({ customerName: l.customer_name, round: 2 });
      const providerId = await sendAutomatedFollowupEmail({ to: l.email, subject, html });

      await logOutbound(l.id, { subject, body: html, automated: true, providerId });
      await db.execute(
        `UPDATE leads
         SET followup_second_sent_at=NOW(), last_outbound_email_at=NOW(), last_activity_at=NOW()
         WHERE id=?`,
        [l.id]
      );
      console.log('[FU] second sent OK. lead=%s providerId=%s', l.id, providerId);
    } catch (e) {
      console.error('[FU] second error lead', l.id, e?.message || e);
    }
  }

  const toFlag = await selectToFlagAfterSecond();
  console.log('[FU] to-flag:', toFlag.map(l => l.id));
  for (const l of toFlag) {
    try {
      await db.execute(
        `UPDATE leads
         SET flagged_for_review_at=NOW(), last_activity_at=NOW()
         WHERE id=?`,
        [l.id]
      );
      await maybeAutoClose(l);
      console.log('[FU] flagged (and maybe closed by flag) lead', l.id);
    } catch (e) {
      console.error('[FU] flag/close (flag branch) error lead', l.id, e?.message || e);
    }
  }

  const toAutoClose = await selectToAutoCloseAfterSecond(CLOSE_AFTER_SECOND_MINUTES);
  console.log('[FU] to-auto-close-after-second:', toAutoClose.map(l => l.id));
  for (const l of toAutoClose) {
    try {
      await db.execute(
        `UPDATE leads
         SET stage='closed_lost', is_closed=1, is_won=0, won_lost_at=NOW(),
             lost_reason='Non-responsive', last_activity_at=NOW()
         WHERE id=?`,
        [l.id]
      );
      console.log('[FU] auto-closed (non-responsive) lead', l.id);
    } catch (e) {
      console.error('[FU] auto-close error lead', l.id, e?.message || e);
    }
  }

  console.log('[FU] sweep finished at', new Date().toISOString());
}

export function startFollowupWorker() {
  const intervalMs = Number(process.env.FOLLOWUP_SWEEP_INTERVAL_MS || 15 * 60 * 1000);
  console.log('[FU] worker scheduled. interval(ms)=', intervalMs,
              'FU_FIRST_DELAY_MINUTES=', process.env.FU_FIRST_DELAY_MINUTES,
              'FU_SECOND_DELAY_MINUTES=', process.env.FU_SECOND_DELAY_MINUTES,
              'FU_CLOSE_AFTER_SECOND_MINUTES=', process.env.FU_CLOSE_AFTER_SECOND_MINUTES);
  setTimeout(async function loop() {
    try {
      await runFollowupSweep();
    } catch (err) {
      console.error('runFollowupSweep failed', err?.message || err);
    } finally {
      setTimeout(loop, intervalMs);
    }
  }, 5000);
}