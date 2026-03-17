// backend/src/routes/emailWebhookRoutes.js
import { Router } from 'express';
import db from '../config/db.js';

const router = Router();

router.post('/resend/inbound', async (req, res) => {
  try {
    const payload = req.body || {};
    const from = payload?.from || payload?.sender; 
    const subject = payload?.subject || null;
    const body = payload?.html || payload?.text || '';
    const inReplyTo = payload?.headers?.['in-reply-to'] || null;

    if (!from) return res.json({ ok: true });

    const [rows] = await db.execute('SELECT id FROM leads WHERE email = ? LIMIT 1', [from]);
    if (rows?.[0]?.id) {
      const leadId = rows[0].id;
      await db.execute(
        `INSERT INTO lead_communications (lead_id, direction, channel, subject, body, automated, related_message_id, created_at)
         VALUES (?, 'inbound', 'email', ?, ?, 0, ?, NOW())`,
        [leadId, subject, body, inReplyTo]
      );
      await db.execute(
        `UPDATE leads SET last_inbound_email_at=NOW(), last_activity_at=NOW() WHERE id=?`,
        [leadId]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Inbound webhook error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;