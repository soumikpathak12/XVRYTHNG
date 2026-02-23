// backend/src/jobs/proposalFollowupWorker.js
import db from '../config/db.js';
import {
  isValidEmail,
  sendAutomatedFollowupEmail,
  renderBrandedFollowup,
} from '../services/emailService.js';

const MIN = 60 * 1000;
const FU_FIRST_DELAY_MINUTES = Number(process.env.FU_FIRST_DELAY_MINUTES || 48 * 60);
const FU_SECOND_DELAY_MINUTES = Number(process.env.FU_SECOND_DELAY_MINUTES || 48 * 60);
const FU_CLOSE_AFTER_SECOND_MINUTES = Number(process.env.FU_CLOSE_AFTER_SECOND_MINUTES || 72 * 60);
const SWEEP_INTERVAL = Number(process.env.FOLLOWUP_SWEEP_INTERVAL_MS || 5 * MIN);

function minutesSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / MIN;
}

async function logOutbound(leadId, { subject, body, automated, providerId }) {
  await db.execute(
    `INSERT INTO lead_communications
      (lead_id, direction, channel, subject, body, automated, provider_message_id, sent_at)
     VALUES (?, 'outbound', 'email', ?, ?, ?, ?, NOW())`,
    [leadId, subject, body, automated ? 1 : 0, providerId ?? null]
  );
}

async function sendProposalFU(lead, round) {
  const to = lead.email;
  if (!isValidEmail(to)) {
    console.warn('[PROPOSAL FU] skip invalid email', lead.id, to);
    return null;
  }
  const subject = round === 1 ? 'Following up on your solar enquiry' : 'Quick follow-up';
  const html = renderBrandedFollowup({ customerName: lead.customer_name, round });
  const providerId = await sendAutomatedFollowupEmail({
    to, subject, html,
    headers: { 'X-Automated': 'true', 'X-Followup-Type': 'proposal', 'X-Round': String(round) }
  });
  await logOutbound(lead.id, { subject, body: html, automated: true, providerId });
  await db.execute(`UPDATE leads SET last_outbound_email_at=NOW(), last_activity_at=NOW() WHERE id=?`, [lead.id]);
  return providerId;
}

export async function runProposalFollowupSweep() {
  console.log('[PROPOSAL FU] sweep start', new Date().toISOString(),
    'first=', FU_FIRST_DELAY_MINUTES, 'min; second=', FU_SECOND_DELAY_MINUTES, 'min; closeAfterSecond=', FU_CLOSE_AFTER_SECOND_MINUTES, 'min');

  const [rows] = await db.execute(
    `SELECT id, customer_name, email,
            proposal_sent, proposal_sent_at,
            proposal_fu_first_sent_at, proposal_fu_second_sent_at,
            proposal_fu_flagged_for_review_at,
            proposal_fu_closed, proposal_fu_closed_at,
            last_inbound_email_at
       FROM leads
      WHERE proposal_sent=1 AND proposal_fu_closed=0
      ORDER BY proposal_sent_at ASC`
  );

  for (const l of rows || []) {
    try {
      if (l.last_inbound_email_at && new Date(l.last_inbound_email_at) > new Date(l.proposal_sent_at)) {
        await db.execute(
          `UPDATE leads
              SET proposal_fu_closed=1,
                  proposal_fu_closed_at=NOW(),
                  proposal_fu_flagged_for_review_at=NULL
            WHERE id=?`,
          [l.id]
        );
        continue;
      }

      if (!l.proposal_fu_first_sent_at) {
        if (minutesSince(l.proposal_sent_at) >= FU_FIRST_DELAY_MINUTES) {
          const pid = await sendProposalFU(l, 1);
          if (pid !== null) {
            await db.execute(
              `UPDATE leads SET proposal_fu_first_sent_at=NOW() WHERE id=?`,
              [l.id]
            );
          }
        }
        continue;
      }

      if (!l.proposal_fu_second_sent_at) {
        if (minutesSince(l.proposal_fu_first_sent_at) >= FU_SECOND_DELAY_MINUTES) {
          const pid = await sendProposalFU(l, 2);
          if (pid !== null) {
            await db.execute(
              `UPDATE leads
                  SET proposal_fu_second_sent_at=NOW(),
                      proposal_fu_flagged_for_review_at=NOW()
               WHERE id=?`,
              [l.id]
            );
          }
        }
        continue;
      }

      if (FU_CLOSE_AFTER_SECOND_MINUTES > 0 &&
          minutesSince(l.proposal_fu_second_sent_at) >= FU_CLOSE_AFTER_SECOND_MINUTES) {
        await db.execute(
          `UPDATE leads
              SET proposal_fu_closed=1,
                  proposal_fu_closed_at=NOW()
           WHERE id=?`,
          [l.id]
        );
      }
    } catch (e) {
      console.error('[PROPOSAL FU] sweep error lead=', l.id, e?.message || e);
    }
  }

  console.log('[PROPOSAL FU] sweep finish', new Date().toISOString());
}

let timer = null;
export function startProposalFollowupWorker() {
  if (timer) return;
  const intervalMs = SWEEP_INTERVAL;
  console.log('[PROPOSAL FU] worker scheduled. interval(ms)=', intervalMs);
  setTimeout(async function loop() {
    try {
      await runProposalFollowupSweep();
    } catch (err) {
      console.error('[PROPOSAL FU] run sweep failed', err?.message || err);
    } finally {
      setTimeout(loop, intervalMs);
    }
  }, 5000);
}