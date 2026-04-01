/**
 * Referral controller: Handle referral list, filters, and bonus management.
 */
import * as referralService from '../services/referralService.js';

/**
 * GET /api/referrals
 * List referrals with filters: status, dateFrom, dateTo, referrerId
 */
export async function listReferrals(req, res) {
  try {
    const {
      status,
      dateFrom,
      dateTo,
      referrerId,
      limit = 100,
      offset = 0,
    } = req.query;
    
    const filters = {
      status: status || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      referrerId: referrerId ? parseInt(referrerId) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    
    const referrals = await referralService.getReferrals(filters);
    const counts = await referralService.getReferralCounts();
    
    res.json({
      success: true,
      referrals,
      counts,
      total: referrals.length,
    });
  } catch (error) {
    console.error('Error listing referrals:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list referrals',
    });
  }
}

/**
 * GET /api/referrals/counts
 * Get referral counts by status
 */
export async function getReferralCounts(req, res) {
  try {
    const counts = await referralService.getReferralCounts();
    res.json({
      success: true,
      counts,
    });
  } catch (error) {
    console.error('Error getting referral counts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get referral counts',
    });
  }
}

/**
 * GET /api/referrals/referrers
 * Get all referrers (customers who have made referrals)
 */
export async function getReferrers(req, res) {
  try {
    const referrers = await referralService.getReferrers();
    res.json({
      success: true,
      referrers,
    });
  } catch (error) {
    console.error('Error getting referrers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get referrers',
    });
  }
}

/**
 * POST /api/referrals/:id/mark-bonus-paid
 * Mark bonus as paid for a referral
 */
export async function markBonusPaid(req, res) {
  try {
    const { id } = req.params;
    const { paidAt } = req.body;
    
    await referralService.markBonusPaid(id, paidAt);
    
    res.json({
      success: true,
      message: 'Bonus marked as paid',
    });
  } catch (error) {
    console.error('Error marking bonus as paid:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark bonus as paid',
    });
  }
}

/**
 * GET /api/referrals/settings
 * Get referral bonus settings
 */
export async function getSettings(req, res) {
  try {
    const settings = await referralService.getSettings();
    res.json({
      success: true,
      settings: settings || referralService.getDefaultSettings(),
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get settings',
    });
  }
}

/**
 * PUT /api/referrals/settings
 * Save referral bonus settings
 */
export async function saveSettings(req, res) {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings data',
      });
    }
    
    const normalized = referralService.normalizeSettings(settings);
    await referralService.saveSettings(normalized);
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: normalized,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save settings',
    });
  }
}
