/**
 * Referrals Dashboard - Track referrals, status, and bonus payments.
 * UI matches the referral dashboard design with metrics, settings, and table.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { getReferrals, getReferralCounts, getReferrers, markReferralBonusPaid, getReferralSettings, saveReferralSettings } from '../services/api.js';
import EditReferralSettingsModal from '../components/referrals/EditReferralSettingsModal.jsx';
import '../styles/ReferralsDashboard.css';

const REFERRAL_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  CONVERTED: 'converted',
  BONUS_PAID: 'bonus_paid',
  LOST: 'lost',
};

const STATUS_LABELS = {
  [REFERRAL_STATUSES.PENDING]: 'Pending',
  [REFERRAL_STATUSES.IN_PROGRESS]: 'In Progress',
  [REFERRAL_STATUSES.CONVERTED]: 'Converted',
  [REFERRAL_STATUSES.BONUS_PAID]: 'Bonus Paid',
  [REFERRAL_STATUSES.LOST]: 'Lost',
};

const STATUS_COLORS = {
  [REFERRAL_STATUSES.PENDING]: '#FFC107',
  [REFERRAL_STATUSES.IN_PROGRESS]: '#17A2B8',
  [REFERRAL_STATUSES.CONVERTED]: '#28A745',
  [REFERRAL_STATUSES.BONUS_PAID]: '#1A7B7B',
  [REFERRAL_STATUSES.LOST]: '#DC3545',
};

// Default bonus configuration
const DEFAULT_BONUS_CONFIG = {
  solar: 150,
  battery: 150,
  'solar+battery': 250,
  'ev-charger': 100,
};

export default function ReferralsPage() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState([]);
  const [counts, setCounts] = useState({});
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [referrerFilter, setReferrerFilter] = useState('');
  
  // Actions
  const [markingPaid, setMarkingPaid] = useState(null);
  const [toast, setToast] = useState('');
  
  // Settings
  const [bonusConfig, setBonusConfig] = useState(DEFAULT_BONUS_CONFIG);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (referrerFilter) filters.referrerId = referrerFilter;
      
      const [referralsData, countsData, referrersData] = await Promise.all([
        getReferrals(filters),
        getReferralCounts(),
        getReferrers(),
      ]);
      
      setReferrals(referralsData.referrals || []);
      setCounts(countsData || {});
      setReferrers(referrersData || []);
    } catch (err) {
      console.error('Error loading referrals:', err);
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, referrerFilter]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getReferralSettings();
        if (settings) {
          setBonusConfig(settings);
        } else {
          // Try loading from localStorage as fallback
          const stored = localStorage.getItem('referral_bonus_settings');
          if (stored) {
            try {
              setBonusConfig(JSON.parse(stored));
            } catch (e) {
              // Invalid stored data, use defaults
            }
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        // Use defaults
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      setSavingSettings(true);
      await saveReferralSettings(newSettings);
      setBonusConfig(newSettings);
      // Also save to localStorage as backup
      localStorage.setItem('referral_bonus_settings', JSON.stringify(newSettings));
      setShowEditSettings(false);
      setToast('Settings saved successfully');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      // Save to localStorage anyway as fallback
      localStorage.setItem('referral_bonus_settings', JSON.stringify(newSettings));
      setBonusConfig(newSettings);
      setShowEditSettings(false);
      setToast('Settings saved locally (backend unavailable)');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkBonusPaid = async (referralId) => {
    try {
      setMarkingPaid(referralId);
      await markReferralBonusPaid(referralId);
      setToast('Bonus marked as paid successfully');
      setTimeout(() => setToast(''), 3000);
      await loadReferrals();
    } catch (err) {
      console.error('Error marking bonus as paid:', err);
      setToast(err.message || 'Failed to mark bonus as paid');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setMarkingPaid(null);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(amount);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalReferrals = referrals.length;
    const converted = referrals.filter(r => r.status === REFERRAL_STATUSES.CONVERTED || r.status === REFERRAL_STATUSES.BONUS_PAID).length;
    const conversionRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0;
    
    const pendingBonuses = referrals.filter(r => r.status === REFERRAL_STATUSES.CONVERTED);
    const pendingBonusesAmount = pendingBonuses.reduce((sum, r) => sum + (r.bonusAmount || 0), 0);
    
    // Paid this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = referrals
      .filter(r => r.status === REFERRAL_STATUSES.BONUS_PAID && r.bonusPaidAt)
      .filter(r => new Date(r.bonusPaidAt) >= startOfMonth)
      .reduce((sum, r) => sum + (r.bonusAmount || 0), 0);
    
    return {
      totalReferrals,
      conversionRate,
      pendingBonusesAmount,
      paidThisMonth,
    };
  }, [referrals]);

  // Determine job type from referral data
  const getJobType = (referral) => {
    // This is a simplified version - you may need to check for battery/EV charger in actual data
    const systemSize = referral.system_size_kw || 0;
    // For now, assume Solar if system_size_kw > 0
    // In real implementation, check for battery/EV charger fields
    if (systemSize > 0) {
      return 'Solar Only';
    }
    return '—';
  };

  return (
    <div className="referrals-dashboard">
      {toast && (
        <div className={`referrals-toast ${toast.includes('Failed') ? 'error' : 'success'}`}>
          {toast}
        </div>
      )}

      {/* Stats Cards - 4 cards */}
      <div className="referrals-stats">
        <div className="referrals-stat-card">
          <div className="referrals-stat-icon">
            <Users size={24} />
          </div>
          <div className="referrals-stat-label">Referrals Received</div>
          <div className="referrals-stat-value">{metrics.totalReferrals}</div>
        </div>
        
        <div className="referrals-stat-card">
          <div className="referrals-stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="referrals-stat-label">Conversion Rate</div>
          <div className="referrals-stat-value">{metrics.conversionRate}%</div>
        </div>
        
        <div className="referrals-stat-card">
          <div className="referrals-stat-icon">
            <Clock size={24} />
          </div>
          <div className="referrals-stat-label">Pending Bonuses</div>
          <div className="referrals-stat-value">{formatCurrency(metrics.pendingBonusesAmount)}</div>
        </div>
        
        <div className="referrals-stat-card">
          <div className="referrals-stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="referrals-stat-label">Paid This Month</div>
          <div className="referrals-stat-value">{formatCurrency(metrics.paidThisMonth)}</div>
        </div>
      </div>

      {/* Referral Program Settings */}
      <div className="referrals-settings-card">
        <div className="referrals-settings-header">
          <h2 className="referrals-settings-title">Referral Program Settings</h2>
          <button 
            className="referrals-settings-edit-btn" 
            type="button"
            onClick={() => setShowEditSettings(true)}
          >
            Edit Settings
          </button>
        </div>
        <div className="referrals-bonus-chips">
          <span className="referrals-bonus-chip">Solar: {formatCurrency(bonusConfig.solar)}</span>
          <span className="referrals-bonus-chip">Battery: {formatCurrency(bonusConfig.battery)}</span>
          <span className="referrals-bonus-chip">Solar+Battery: {formatCurrency(bonusConfig['solar+battery'])}</span>
          <span className="referrals-bonus-chip">EV Charger: {formatCurrency(bonusConfig['ev-charger'])}</span>
        </div>
      </div>

      {/* All Referrals Table */}
      <div className="referrals-table-section">
        <h2 className="referrals-table-title">All Referrals</h2>
        <div className="referrals-table-container">
          {loading ? (
            <div className="referrals-loading">Loading referrals...</div>
          ) : error ? (
            <div className="referrals-error">{error}</div>
          ) : referrals.length === 0 ? (
            <div className="referrals-empty">No referrals found</div>
          ) : (
            <table className="referrals-table">
              <thead>
                <tr>
                  <th>REFERRER</th>
                  <th>REFERRED CUSTOMER</th>
                  <th>JOB TYPE</th>
                  <th>STATUS</th>
                  <th>BONUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td>
                      <div className="referrals-customer">
                        <div className="referrals-customer-name">{referral.referrer?.name || '—'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="referrals-customer">
                        <div className="referrals-customer-name">{referral.customer_name}</div>
                      </div>
                    </td>
                    <td>{getJobType(referral)}</td>
                    <td>
                      <span
                        className="referrals-status-chip"
                        style={{
                          backgroundColor: referral.status === REFERRAL_STATUSES.CONVERTED 
                            ? '#d4edda' 
                            : referral.status === REFERRAL_STATUSES.IN_PROGRESS
                            ? '#d1ecf1'
                            : `${STATUS_COLORS[referral.status]}20`,
                          color: referral.status === REFERRAL_STATUSES.CONVERTED 
                            ? '#155724' 
                            : referral.status === REFERRAL_STATUSES.IN_PROGRESS
                            ? '#0c5460'
                            : STATUS_COLORS[referral.status],
                          borderColor: referral.status === REFERRAL_STATUSES.CONVERTED 
                            ? '#c3e6cb' 
                            : referral.status === REFERRAL_STATUSES.IN_PROGRESS
                            ? '#bee5eb'
                            : STATUS_COLORS[referral.status],
                        }}
                      >
                        {STATUS_LABELS[referral.status]}
                      </span>
                    </td>
                    <td>
                      <strong>{formatCurrency(referral.bonusAmount)}</strong>
                    </td>
                    <td>
                      {referral.status === REFERRAL_STATUSES.CONVERTED && (
                        <button
                          className="referrals-pay-link"
                          onClick={() => handleMarkBonusPaid(referral.id)}
                          disabled={markingPaid === referral.id}
                        >
                          {markingPaid === referral.id ? 'Processing...' : 'Pay Bonus'}
                        </button>
                      )}
                      {referral.status === REFERRAL_STATUSES.BONUS_PAID && (
                        <span className="referrals-paid-badge">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Settings Modal */}
      <EditReferralSettingsModal
        open={showEditSettings}
        onClose={() => setShowEditSettings(false)}
        settings={bonusConfig}
        onSave={handleSaveSettings}
        saving={savingSettings}
      />
    </div>
  );
}
