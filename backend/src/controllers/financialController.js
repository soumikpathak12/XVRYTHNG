import { getProfitLossAdjustments } from '../services/financialService.js';

// GET /api/financial/profit-loss-adjustments?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
export async function profitLossAdjustments(req, res) {
  try {
    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing company context' });
    }

    const data = await getProfitLossAdjustments({
      companyId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to load financial adjustments' });
  }
}
