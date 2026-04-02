import { Router } from 'express';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import {
  resolveSiteLocation,
  buildSiteAddress,
  buildCustomerDetails,
  createSolarProject,
  listSolarDesignsForProject,
  pickProposalUrlFromDesigns,
  libraryUrlForProject,
} from '../services/pylonService.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.post('/:id/proposal', async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    if (!leadId) return res.status(400).json({ success: false, message: 'Invalid lead id' });

    const token = process.env.PYLON_API_TOKEN || process.env.PYLON_TOKEN;
    if (!token || !String(token).trim()) {
      return res.status(503).json({
        success: false,
        message:
          'Pylon is not configured. Set PYLON_API_TOKEN in the server environment (never in the browser).',
      });
    }

    const [rows] = await db.execute('SELECT * FROM leads WHERE id=? LIMIT 1', [leadId]);
    const lead = rows?.[0];
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const tenantId = req.tenantId != null ? Number(req.tenantId) : null;
    const leadCompanyId = lead.company_id != null ? Number(lead.company_id) : null;
    if (tenantId != null && leadCompanyId != null && leadCompanyId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let projectId = lead.pylon_solar_project_id ? String(lead.pylon_solar_project_id).trim() : '';
    let proposalUrl = null;
    let libraryUrl = null;

    if (!projectId) {
      const siteLocation = await resolveSiteLocation(lead);
      const referenceNumber = `XVRY-LEAD-${leadId}`;

      const created = await createSolarProject(String(token).trim(), {
        referenceNumber,
        siteLocation,
        siteAddress: buildSiteAddress(lead),
        customerDetails: buildCustomerDetails(lead),
      });

      projectId = created?.id ? String(created.id) : '';
      if (!projectId) {
        return res.status(502).json({
          success: false,
          message: 'Pylon did not return a solar project id.',
        });
      }

      const hasPylonCol = Object.prototype.hasOwnProperty.call(lead, 'pylon_solar_project_id');
      if (hasPylonCol) {
        await db.execute(
          `UPDATE leads SET pylon_solar_project_id = ?, pylon_proposal_url = NULL WHERE id = ?`,
          [projectId, leadId],
        );
      }
    }

    libraryUrl = libraryUrlForProject(projectId);

    try {
      const designs = await listSolarDesignsForProject(String(token).trim(), projectId);
      proposalUrl = pickProposalUrlFromDesigns(designs);
    } catch (e) {
      console.warn('[Pylon] solar_designs fetch failed:', e?.message || e);
    }

    if (proposalUrl) {
      const hasPylonCol = Object.prototype.hasOwnProperty.call(lead, 'pylon_proposal_url');
      if (hasPylonCol) {
        await db.execute(`UPDATE leads SET pylon_proposal_url = ? WHERE id = ?`, [proposalUrl, leadId]);
      }
    }

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
        [leadId],
      );
    }

    return res.json({
      success: true,
      message: proposalUrl
        ? 'Pylon project ready — proposal link available.'
        : 'Pylon project created. Open the library to build a design and proposal in Pylon.',
      pylon: {
        solarProjectId: projectId,
        libraryUrl,
        webProposalUrl: proposalUrl || null,
      },
    });
  } catch (e) {
    console.error('[PROPOSAL] error:', e);
    const status = e.statusCode || e.status || 500;
    const message = e.message || 'Failed to create Pylon project';
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message,
    });
  }
});

export default router;
