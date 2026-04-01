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
    evisaGiftCardEnabled: true,
    evisaGiftCardAmount: '',
    evisaBrandingEnabled: true,
    evisaBrandingSurcharge: '',
    supportResponseMinutes: '',
    supportCompensationAmount: '',
    supportEscalationAmount: '',
    supportAutoRemoveCompany: true,
  });

  useEffect(() => {
    if (open && settings) {
      setFormData({
        solar: settings.solar || '',
        battery: settings.battery || '',
        'solar+battery': settings['solar+battery'] || '',
        'ev-charger': settings['ev-charger'] || '',
        evisaGiftCardEnabled: settings.evisaGiftCardEnabled !== false,
        evisaGiftCardAmount: settings.evisaGiftCardAmount ?? 50,
        evisaBrandingEnabled: settings.evisaBrandingEnabled !== false,
        evisaBrandingSurcharge: settings.evisaBrandingSurcharge ?? 20,
        supportResponseMinutes: settings.supportResponseMinutes ?? 90,
        supportCompensationAmount: settings.supportCompensationAmount ?? 50,
        supportEscalationAmount: settings.supportEscalationAmount ?? 250,
        supportAutoRemoveCompany: settings.supportAutoRemoveCompany !== false,
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
      evisaGiftCardEnabled: Boolean(formData.evisaGiftCardEnabled),
      evisaGiftCardAmount: parseInt(formData.evisaGiftCardAmount) || 0,
      evisaBrandingEnabled: Boolean(formData.evisaBrandingEnabled),
      evisaBrandingSurcharge: parseInt(formData.evisaBrandingSurcharge) || 0,
      supportResponseMinutes: parseInt(formData.supportResponseMinutes) || 0,
      supportCompensationAmount: parseInt(formData.supportCompensationAmount) || 0,
      supportEscalationAmount: parseInt(formData.supportEscalationAmount) || 0,
      supportAutoRemoveCompany: Boolean(formData.supportAutoRemoveCompany),
    };
    onSave(settingsToSave);
  };

  return (
    <Modal title="Edit Referral Program Settings" open={open} onClose={onClose} width={500}>
      <form className="edit-referral-settings-form" onSubmit={handleSubmit}>
        <p className="edit-referral-settings-description">
          Set the bonus amounts for each job type. These amounts will be used when calculating referral bonuses.
        </p>

        <div className="edit-referral-settings-fields">
          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label">Referral Bonus Amounts</label>
          </div>
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

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label">XVRYTHING e-visa Gift Card</label>
          </div>
          <label className="edit-referral-settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.evisaGiftCardEnabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, evisaGiftCardEnabled: e.target.checked }))}
            />
            Enable company purchase of XVRYTHING e-visa gift cards
          </label>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="evisaGiftCardAmount">
              Gift Card Face Value
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="evisaGiftCardAmount"
                type="text"
                className="edit-referral-settings-input"
                value={formData.evisaGiftCardAmount}
                onChange={(e) => handleChange('evisaGiftCardAmount', e.target.value)}
                placeholder="50"
                required
              />
            </div>
          </div>

          <label className="edit-referral-settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.evisaBrandingEnabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, evisaBrandingEnabled: e.target.checked }))}
            />
            Allow company-branded gift cards (extra charge)
          </label>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="evisaBrandingSurcharge">
              Branding Surcharge
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="evisaBrandingSurcharge"
                type="text"
                className="edit-referral-settings-input"
                value={formData.evisaBrandingSurcharge}
                onChange={(e) => handleChange('evisaBrandingSurcharge', e.target.value)}
                placeholder="20"
                required
              />
            </div>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label">Customer Support Protection Policy</label>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="supportResponseMinutes">
              Company Response Window (minutes)
            </label>
            <input
              id="supportResponseMinutes"
              type="text"
              className="edit-referral-settings-input"
              value={formData.supportResponseMinutes}
              onChange={(e) => handleChange('supportResponseMinutes', e.target.value)}
              placeholder="90"
              required
            />
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="supportCompensationAmount">
              Company Compensation Amount
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="supportCompensationAmount"
                type="text"
                className="edit-referral-settings-input"
                value={formData.supportCompensationAmount}
                onChange={(e) => handleChange('supportCompensationAmount', e.target.value)}
                placeholder="50"
                required
              />
            </div>
          </div>

          <div className="edit-referral-settings-field">
            <label className="edit-referral-settings-label" htmlFor="supportEscalationAmount">
              XVRYTHING Escalation Gift Card Amount
            </label>
            <div className="edit-referral-settings-input-wrapper">
              <span className="edit-referral-settings-currency">$</span>
              <input
                id="supportEscalationAmount"
                type="text"
                className="edit-referral-settings-input"
                value={formData.supportEscalationAmount}
                onChange={(e) => handleChange('supportEscalationAmount', e.target.value)}
                placeholder="250"
                required
              />
            </div>
          </div>

          <label className="edit-referral-settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.supportAutoRemoveCompany}
              onChange={(e) => setFormData((prev) => ({ ...prev, supportAutoRemoveCompany: e.target.checked }))}
            />
            Suspend company when escalation compensation is triggered
          </label>
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
