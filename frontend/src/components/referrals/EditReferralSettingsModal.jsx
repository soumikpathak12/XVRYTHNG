/**
 * Edit Referral Settings Modal - Edit bonus amounts for different job types
 */
import { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import '../referrals/EditReferralSettingsModal.css';

export default function EditReferralSettingsModal({ open, onClose, settings, onSave, saving }) {
  const [formData, setFormData] = useState({
    solar: '',
    battery: '',
    'solar+battery': '',
    'ev-charger': '',
  });

  useEffect(() => {
    if (open && settings) {
      setFormData({
        solar: settings.solar || '',
        battery: settings.battery || '',
        'solar+battery': settings['solar+battery'] || '',
        'ev-charger': settings['ev-charger'] || '',
      });
    }
  }, [open, settings]);

  const handleChange = (key, value) => {
    // Only allow numbers
    const numValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const settingsToSave = {
      solar: parseInt(formData.solar) || 0,
      battery: parseInt(formData.battery) || 0,
      'solar+battery': parseInt(formData['solar+battery']) || 0,
      'ev-charger': parseInt(formData['ev-charger']) || 0,
    };
    onSave(settingsToSave);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <Modal title="Edit Referral Program Settings" open={open} onClose={onClose} width={500}>
      <form className="edit-referral-settings-form" onSubmit={handleSubmit}>
        <p className="edit-referral-settings-description">
          Set the bonus amounts for each job type. These amounts will be used when calculating referral bonuses.
        </p>

        <div className="edit-referral-settings-fields">
          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="solar">
              Solar Only
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="solar"
                type="text"
                className="edit-referral-settings-input"
                value={formData.solar}
                onChange={(e) => handleChange('solar', e.target.value)}
                placeholder="150"
                required
              />
            </div>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="battery">
              Battery Only
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="battery"
                type="text"
                className="edit-referral-settings-input"
                value={formData.battery}
                onChange={(e) => handleChange('battery', e.target.value)}
                placeholder="150"
                required
              />
            </div>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="solar+battery">
              Solar + Battery
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="solar+battery"
                type="text"
                className="edit-referral-settings-input"
                value={formData['solar+battery']}
                onChange={(e) => handleChange('solar+battery', e.target.value)}
                placeholder="250"
                required
              />
            </div>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="ev-charger">
              EV Charger
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="ev-charger"
                type="text"
                className="edit-referral-settings-input"
                value={formData['ev-charger']}
                onChange={(e) => handleChange('ev-charger', e.target.value)}
                placeholder="100"
                required
              />
            </div>
          </div>
        </div>

        <div className="edit-referral-settings-actions">
          <button
            type="button"
            className="edit-referral-settings-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="edit-referral-settings-save"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
