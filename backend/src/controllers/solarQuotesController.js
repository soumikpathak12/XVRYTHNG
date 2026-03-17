import * as solarQuotesService from '../services/solarQuotesService.js';

export async function fetchLeads(req, res) {
    try {
        const { startDate, endDate } = req.body || {};
        const { count, results } = await solarQuotesService.syncSolarQuotesLeads(startDate, endDate);
        return res.status(200).json({ success: true, count, results });
    } catch (err) {
        console.error('[SolarQuotes Controller] Error:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch SolarQuotes leads.',
        });
    }
}
