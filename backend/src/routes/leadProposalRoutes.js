import { Router } from 'express';
import db from '../config/db.js';

const router = Router();


router.post('/:id/proposal', async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    if (!leadId) return res.status(400).json({ success: false, message: 'Invalid lead id' });

    const [rows] = await db.execute(
      `SELECT id, stage, proposal_sent, proposal_sent_at FROM leads WHERE id=? LIMIT 1`,
      [leadId]
    );
    const lead = rows?.[0];
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!lead.proposal_sent) {
      await db.execute(
        `UPDATE leads
            SET proposal_sent=1,
                proposal_sent_at=NOW(),
                stage = CASE WHEN stage <> 'proposal_sent' THEN 'proposal_sent' ELSE stage END,
                proposal_fu_first_sent_at=NULL,
                proposal_fu_second_sent_at=NULL,
                proposal_fu_flagged_for_review_at=NULL,
                proposal_fu_closed=0,
                proposal_fu_closed_at=NULL
         WHERE id=?`,
        [leadId]
      );
    }

    return res.json({ success: true, message: 'Proposal marked as sent' });
  } catch (e) {
    console.error('[PROPOSAL] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to mark proposal as sent' });
  }
});

export default router;