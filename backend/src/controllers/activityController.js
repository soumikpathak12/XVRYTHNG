import { getRecentActivity } from '../services/activityService.js';

// GET /api/sales/activity?limit=50&offset=0
export async function listSalesActivity(req, res) {
  try {
    const limit  = req.query.limit  ? Number(req.query.limit)  : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const companyId = req.tenantId ?? req.user?.companyId ?? null;

    const rows = await getRecentActivity({ companyId, limit, offset });

    return res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        action_type: r.action_type,
        description: r.description,
        created_at: r.created_at,
        lead_id: r.lead_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        customer_name: r.customer_name,
        lead_stage: r.lead_stage,
      })),
    });
  } catch (err) {
    console.error('listSalesActivity error', err);
    return res.status(500).json({ success: false, message: 'Failed to load activity feed' });
  }
}

