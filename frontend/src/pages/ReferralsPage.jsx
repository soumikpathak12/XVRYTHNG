/**
 * Referrals Dashboard - Track referrals, status, and bonus payments.
 * UI matches the referral dashboard design with metrics, settings, and table.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, CheckCircle, MoreVertical, ExternalLink } from 'lucide-react';
import { getReferrals, getReferralCounts, getReferrers, markReferralBonusPaid, getReferralSettings, saveReferralSettings, updateLeadStage } from '../services/api.js';
import EditReferralSettingsModal from '../components/referrals/EditReferralSettingsModal.jsx';
import Modal from '../components/common/Modal.jsx';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [updatingStage, setUpdatingStage] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStatusMenu && !event.target.closest('.referrals-actions-menu')) {
        setShowStatusMenu(null);
      }
    };
    if (showStatusMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusMenu]);

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

  const handleMarkBonusPaid = async (referralId, paidAt = null) => {
    try {
      setMarkingPaid(referralId);
      await markReferralBonusPaid(referralId, paidAt);
      setToast('Bonus marked as paid successfully');
      setTimeout(() => setToast(''), 3000);
      setShowPaymentModal(false);
      setSelectedReferral(null);
      setPaymentDate('');
      await loadReferrals();
    } catch (err) {
      console.error('Error marking bonus as paid:', err);
      setToast(err.message || 'Failed to mark bonus as paid');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleOpenPaymentModal = (referral) => {
    setSelectedReferral(referral);
    setPaymentDate(new Date().toISOString().split('T')[0]); // Today's date
    setShowPaymentModal(true);
  };

  const handleUpdateStatus = async (referralId, newStage) => {
    try {
      setUpdatingStage(referralId);
      await updateLeadStage(referralId, newStage);
      setToast('Status updated successfully');
      setTimeout(() => setToast(''), 3000);
      setShowStatusMenu(null);
      await loadReferrals();
    } catch (err) {
      console.error('Error updating status:', err);
      setToast(err.message || 'Failed to update status');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setUpdatingStage(null);
    }
  };

  // Map referral status to lead stage for updating
  const getStageForStatus = (status) => {
    const map = {
      [REFERRAL_STATUSES.PENDING]: 'new',
      [REFERRAL_STATUSES.IN_PROGRESS]: 'negotiation',
      [REFERRAL_STATUSES.CONVERTED]: 'closed_won',
      [REFERRAL_STATUSES.LOST]: 'closed_lost',
    };
    return map[status] || null;
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
                      <div className="referrals-actions">
                        {referral.status === REFERRAL_STATUSES.CONVERTED && (
                          <button
                            className="referrals-pay-link"
                            onClick={() => handleOpenPaymentModal(referral)}
                            disabled={markingPaid === referral.id}
                          >
                            {markingPaid === referral.id ? 'Processing...' : 'Pay Bonus'}
                          </button>
                        )}
                        {referral.status === REFERRAL_STATUSES.BONUS_PAID && (
                          <span className="referrals-paid-badge">Paid</span>
                        )}
                        <div className="referrals-actions-menu">
                          <button
                            className="referrals-menu-btn"
                            onClick={() => setShowStatusMenu(showStatusMenu === referral.id ? null : referral.id)}
                            type="button"
                            aria-label="More actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {showStatusMenu === referral.id && (
                            <div className="referrals-menu-dropdown">
                              <button
                                className="referrals-menu-item"
                                onClick={() => navigate(`/admin/leads/${referral.id}`)}
                                type="button"
                              >
                                <ExternalLink size={14} />
                                View Lead
                              </button>
                              {referral.status !== REFERRAL_STATUSES.CONVERTED && referral.status !== REFERRAL_STATUSES.BONUS_PAID && (
                                <button
                                  className="referrals-menu-item"
                                  onClick={() => handleUpdateStatus(referral.id, 'closed_won')}
                                  disabled={updatingStage === referral.id}
                                  type="button"
                                >
                                  Mark as Converted
                                </button>
                              )}
                              {referral.status !== REFERRAL_STATUSES.LOST && (
                                <button
                                  className="referrals-menu-item referrals-menu-item-danger"
                                  onClick={() => handleUpdateStatus(referral.id, 'closed_lost')}
                                  disabled={updatingStage === referral.id}
                                  type="button"
                                >
                                  Mark as Lost
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Payment Modal */}
      <Modal title="Record Bonus Payment" open={showPaymentModal} onClose={() => {
        setShowPaymentModal(false);
        setSelectedReferral(null);
        setPaymentDate('');
      }} width={400}>
        {selectedReferral && (
          <div className="referrals-payment-modal">
            <div className="referrals-payment-modal-info">
              <p><strong>Referrer:</strong> {selectedReferral.referrer?.name || '—'}</p>
              <p><strong>Referred Customer:</strong> {selectedReferral.customer_name}</p>
              <p><strong>Bonus Amount:</strong> {formatCurrency(selectedReferral.bonusAmount)}</p>
            </div>
            <div className="referrals-payment-modal-field">
              <label className="referrals-payment-modal-label" htmlFor="payment-date">
                Payment Date
              </label>
              <input
                id="payment-date"
                type="date"
                className="referrals-payment-modal-input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div className="referrals-payment-modal-actions">
              <button
                type="button"
                className="referrals-payment-modal-cancel"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReferral(null);
                  setPaymentDate('');
                }}
                disabled={markingPaid === selectedReferral.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="referrals-payment-modal-confirm"
                onClick={() => handleMarkBonusPaid(selectedReferral.id, paymentDate || null)}
                disabled={markingPaid === selectedReferral.id || !paymentDate}
              >
                {markingPaid === selectedReferral.id ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
