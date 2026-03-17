/**
 * Referral service: Track referrals, calculate status, and bonus amounts.
 * Referrals are leads with referred_by_lead_id set.
 */
import db from '../config/db.js';

/**
 * Referral statuses:
 * - Pending: Lead is in early stages (new, contacted, qualified)
 * - In Progress: Lead is progressing (inspection_booked, inspection_completed, proposal_sent, negotiation)
 * - Converted: Lead is closed_won
 * - Bonus Paid: Bonus has been paid (tracked via bonus_paid_at)
 * - Lost: Lead is closed_lost
 */
export const REFERRAL_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  CONVERTED: 'converted',
  BONUS_PAID: 'bonus_paid',
  LOST: 'lost',
};

/**
 * Calculate referral status based on lead stage and bonus payment status.
 */
export function calculateReferralStatus(lead, bonusPaidAt = null) {
  if (bonusPaidAt) {
    return REFERRAL_STATUSES.BONUS_PAID;
  }
  
  if (lead.stage === 'closed_lost') {
    return REFERRAL_STATUSES.LOST;
  }
  
  if (lead.stage === 'closed_won') {
    return REFERRAL_STATUSES.CONVERTED;
  }
  
  const inProgressStages = new Set([
    'inspection_booked',
    'inspection_completed',
    'proposal_sent',
    'negotiation',
  ]);
  
  if (inProgressStages.has(lead.stage)) {
    return REFERRAL_STATUSES.IN_PROGRESS;
  }
  
  return REFERRAL_STATUSES.PENDING;
}

/**
 * Calculate bonus amount based on job type (system size) and value amount.
 * Bonus config: 
 * - Small (< 5kW): 2% of value_amount
 * - Medium (5-10kW): 3% of value_amount
 * - Large (> 10kW): 4% of value_amount
 * Minimum bonus: $50
 */
export function calculateBonusAmount(lead) {
  if (!lead.value_amount || lead.value_amount <= 0) {
    return 0;
  }
  
  const systemSize = lead.system_size_kw || 0;
  let percentage = 0.02; // Default 2%
  
  if (systemSize >= 5 && systemSize <= 10) {
    percentage = 0.03; // 3%
  } else if (systemSize > 10) {
    percentage = 0.04; // 4%
  }
  
  const bonus = lead.value_amount * percentage;
  return Math.max(bonus, 50); // Minimum $50
}

/**
 * Get all referrals with referrer information and calculated status/bonus.
 * @param {Object} filters - { status, dateFrom, dateTo, referrerId, limit, offset }
 */
export async function getReferrals(filters = {}) {
  const where = ['l.referred_by_lead_id IS NOT NULL'];
  const params = [];
  
  // Filter by referrer (the customer who made the referral)
  if (filters.referrerId) {
    where.push('l.referred_by_lead_id = ?');
    params.push(filters.referrerId);
  }
  
  // Filter by date range
  if (filters.dateFrom) {
    where.push('l.created_at >= ?');
    params.push(filters.dateFrom);
  }
  
  if (filters.dateTo) {
    where.push('l.created_at <= ?');
    params.push(filters.dateTo);
  }
  
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  
  // Get referrals with referrer info
  const sql = `
    SELECT 
      l.id,
      l.stage,
      l.customer_name,
      l.email,
      l.phone,
      l.suburb,
      l.system_size_kw,
      l.value_amount,
      l.source,
      l.referred_by_lead_id,
      l.is_closed,
      l.is_won,
      l.won_lost_at,
      l.created_at,
      l.updated_at,
      l.last_activity_at,
      l.site_inspection_date,
      r.id AS referrer_id,
      r.customer_name AS referrer_name,
      r.email AS referrer_email,
      r.phone AS referrer_phone,
      COALESCE(rb.bonus_paid_at, NULL) AS bonus_paid_at
    FROM leads l
    INNER JOIN leads r ON l.referred_by_lead_id = r.id
    LEFT JOIN referral_bonuses rb ON l.id = rb.referral_lead_id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;
  params.push(limit, offset);
  
  const [rows] = await db.execute(sql, params);
  
  // Calculate status and bonus for each referral
  const referrals = rows.map(row => {
    const lead = {
      id: row.id,
      stage: row.stage,
      customer_name: row.customer_name,
      email: row.email,
      phone: row.phone,
      suburb: row.suburb,
      system_size_kw: row.system_size_kw,
      value_amount: row.value_amount,
      source: row.source,
      referred_by_lead_id: row.referred_by_lead_id,
      is_closed: row.is_closed,
      is_won: row.is_won,
      won_lost_at: row.won_lost_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_activity_at: row.last_activity_at,
      site_inspection_date: row.site_inspection_date,
    };
    
    const status = calculateReferralStatus(lead, row.bonus_paid_at);
    const bonusAmount = calculateBonusAmount(lead);
    
    return {
      ...lead,
      status,
      bonusAmount,
      bonusPaidAt: row.bonus_paid_at,
      referrer: {
        id: row.referrer_id,
        name: row.referrer_name,
        email: row.referrer_email,
        phone: row.referrer_phone,
      },
    };
  });
  
  // Apply status filter after calculation (since status is computed)
  if (filters.status) {
    return referrals.filter(r => r.status === filters.status);
  }
  
  return referrals;
}

/**
 * Get count of referrals by status.
 */
export async function getReferralCounts(filters = {}) {
  const referrals = await getReferrals({ ...filters, limit: 10000, offset: 0 });
  
  const counts = {
    [REFERRAL_STATUSES.PENDING]: 0,
    [REFERRAL_STATUSES.IN_PROGRESS]: 0,
    [REFERRAL_STATUSES.CONVERTED]: 0,
    [REFERRAL_STATUSES.BONUS_PAID]: 0,
    [REFERRAL_STATUSES.LOST]: 0,
    total: referrals.length,
  };
  
  referrals.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  
  return counts;
}

/**
 * Mark bonus as paid for a referral.
 */
export async function markBonusPaid(referralLeadId, paidAt = null) {
  const paymentDate = paidAt || new Date();
  
  // Get the referral to calculate bonus amount
  const referrals = await getReferrals({ limit: 10000, offset: 0 });
  const referral = referrals.find(r => r.id === parseInt(referralLeadId));
  
  if (!referral) {
    throw new Error('Referral not found');
  }
  
  // Check if bonus record exists
  const [existing] = await db.execute(
    'SELECT id FROM referral_bonuses WHERE referral_lead_id = ?',
    [referralLeadId]
  );
  
  if (existing.length > 0) {
    // Update existing
    await db.execute(
      'UPDATE referral_bonuses SET bonus_paid_at = ?, bonus_amount = ?, updated_at = NOW() WHERE referral_lead_id = ?',
      [paymentDate, referral.bonusAmount, referralLeadId]
    );
  } else {
    // Create new
    await db.execute(
      'INSERT INTO referral_bonuses (referral_lead_id, bonus_amount, bonus_paid_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [referralLeadId, referral.bonusAmount, paymentDate]
    );
  }
  
  return { success: true };
}

/**
 * Get all referrers (customers who have made referrals).
 */
export async function getReferrers() {
  const [rows] = await db.execute(`
    SELECT DISTINCT
      r.id,
      r.customer_name AS name,
      r.email,
      r.phone,
      COUNT(l.id) AS referral_count
    FROM leads r
    INNER JOIN leads l ON l.referred_by_lead_id = r.id
    GROUP BY r.id, r.customer_name, r.email, r.phone
    ORDER BY referral_count DESC, r.customer_name ASC
  `);
  
  return rows;
}

/**
 * Get default bonus settings.
 */
export function getDefaultSettings() {
  return {
    solar: 150,
    battery: 150,
    'solar+battery': 250,
    'ev-charger': 100,
  };
}

/**
 * Get referral bonus settings from database or return defaults.
 */
export async function getSettings() {
  try {
    // Check if settings table exists, if not return defaults
    const [rows] = await db.execute(`
      SELECT settings_json FROM referral_settings LIMIT 1
    `);
    
    if (rows.length > 0 && rows[0].settings_json) {
      return JSON.parse(rows[0].settings_json);
    }
    
    return getDefaultSettings();
  } catch (error) {
    // Table might not exist, return defaults
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return getDefaultSettings();
    }
    throw error;
  }
}

/**
 * Save referral bonus settings to database.
 */
export async function saveSettings(settings) {
  try {
    // Try to insert or update
    await db.execute(`
      INSERT INTO referral_settings (id, settings_json, updated_at)
      VALUES (1, ?, NOW())
      ON DUPLICATE KEY UPDATE settings_json = ?, updated_at = NOW()
    `, [JSON.stringify(settings), JSON.stringify(settings)]);
    
    return { success: true };
  } catch (error) {
    // If table doesn't exist, create it first
    if (error.code === 'ER_NO_SUCH_TABLE') {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS referral_settings (
          id INT UNSIGNED PRIMARY KEY DEFAULT 1,
          settings_json JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Retry insert
      await db.execute(`
        INSERT INTO referral_settings (id, settings_json)
        VALUES (1, ?)
      `, [JSON.stringify(settings)]);
      
      return { success: true };
    }
    throw error;
  }
}
