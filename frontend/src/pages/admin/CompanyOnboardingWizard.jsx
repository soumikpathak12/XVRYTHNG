/**
 * Company onboarding wizard: create new tenant + company admin.
 * Steps: 1) Company details, 2) Company admin account, 3) Review & submit.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api.js';

const STEPS = [
  { id: 1, title: 'Company details', fields: ['name', 'abn', 'contact', 'type', 'address'] },
  { id: 2, title: 'Company admin account', fields: ['admin'] },
  { id: 3, title: 'Review & create', fields: [] },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A7B7B] focus:border-[#1A7B7B] outline-none';

export default function CompanyOnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyTypes, setCompanyTypes] = useState([]);
  const [company, setCompany] = useState({
    name: '',
    abn: '',
    contact_email: '',
    contact_phone: '',
    company_type_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
  });
  const [admin, setAdmin] = useState({ email: '', password: '', name: '' });
  const [validation, setValidation] = useState({});

  useEffect(() => {
    api
      .getCompanyTypes()
      .then((r) => setCompanyTypes(r.data || []))
      .catch(() => setCompanyTypes([]));
  }, []);

  const validateStep1 = () => {
    const err = {};
    if (!company.name?.trim()) err.companyName = 'Company name is required';
    setValidation(err);
    return Object.keys(err).length === 0;
  };

  const validateStep2 = () => {
    const err = {};
    if (!admin.email?.trim()) err.adminEmail = 'Admin email is required';
    else if (!/^\S+@\S+\.\S+$/.test(admin.email)) err.adminEmail = 'Invalid email';
    if (!admin.password) err.adminPassword = 'Password is required (min 8 characters)';
    else if (admin.password.length < 8) err.adminPassword = 'Password must be at least 8 characters';
    if (!admin.name?.trim()) err.adminName = 'Admin name is required';
    setValidation(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    setError(null);
    setValidation({});
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setValidation({});
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        company: {
          ...company,
          company_type_id: company.company_type_id ? parseInt(company.company_type_id, 10) : null,
        },
        admin: { ...admin },
      };
      await api.createCompany(payload);
      navigate('/admin/companies', { replace: true });
    } catch (err) {
      if (err.status === 422 && err.body?.errors) {
        setValidation(err.body.errors);
      } else {
        setError(err.message || 'Failed to create company');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field) => setValidation((v) => ({ ...v, [field]: undefined }));

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <h2 style={{ color: '#1A7B7B', marginBottom: 8 }}>Add new company</h2>
      <p style={{ color: '#555', marginBottom: 24 }}>Create a new tenant and company admin account.</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= s.id ? '#1A7B7B' : '#E5E7EB',
            }}
            aria-hidden
          />
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: 'rgba(220,53,69,0.1)',
            color: '#c82333',
            borderRadius: 8,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Step 1: Company details */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Company name *</label>
            <input
              type="text"
              className={inputClass}
              value={company.name}
              onChange={(e) => {
                setCompany((c) => ({ ...c, name: e.target.value }));
                clearFieldError('companyName');
              }}
              placeholder="Acme Solar Pty Ltd"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {validation.companyName && (
              <p style={{ color: '#c82333', fontSize: 12, marginTop: 4 }}>{validation.companyName}</p>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>ABN</label>
              <input
                type="text"
                className={inputClass}
                value={company.abn}
                onChange={(e) => setCompany((c) => ({ ...c, abn: e.target.value }))}
                placeholder="12 345 678 901"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Company type</label>
              <select
                className={inputClass}
                value={company.company_type_id}
                onChange={(e) => setCompany((c) => ({ ...c, company_type_id: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">Select type</option>
                {companyTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact email</label>
              <input
                type="email"
                className={inputClass}
                value={company.contact_email}
                onChange={(e) => setCompany((c) => ({ ...c, contact_email: e.target.value }))}
                placeholder="admin@company.com"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact phone</label>
              <input
                type="tel"
                className={inputClass}
                value={company.contact_phone}
                onChange={(e) => setCompany((c) => ({ ...c, contact_phone: e.target.value }))}
                placeholder="+61 2 1234 5678"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address line 1</label>
            <input
              type="text"
              className={inputClass}
              value={company.address_line1}
              onChange={(e) => setCompany((c) => ({ ...c, address_line1: e.target.value }))}
              placeholder="123 Main St"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address line 2</label>
            <input
              type="text"
              className={inputClass}
              value={company.address_line2}
              onChange={(e) => setCompany((c) => ({ ...c, address_line2: e.target.value }))}
              placeholder="Suite 100"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>City</label>
              <input
                type="text"
                className={inputClass}
                value={company.city}
                onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))}
                placeholder="Sydney"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>State</label>
              <input
                type="text"
                className={inputClass}
                value={company.state}
                onChange={(e) => setCompany((c) => ({ ...c, state: e.target.value }))}
                placeholder="NSW"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Postcode</label>
              <input
                type="text"
                className={inputClass}
                value={company.postcode}
                onChange={(e) => setCompany((c) => ({ ...c, postcode: e.target.value }))}
                placeholder="2000"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Company admin */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin email *</label>
            <input
              type="email"
              className={inputClass}
              value={admin.email}
              onChange={(e) => {
                setAdmin((a) => ({ ...a, email: e.target.value }));
                clearFieldError('adminEmail');
              }}
              placeholder="admin@company.com"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {validation.adminEmail && (
              <p style={{ color: '#c82333', fontSize: 12, marginTop: 4 }}>{validation.adminEmail}</p>
            )}
          </div>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin name *</label>
            <input
              type="text"
              className={inputClass}
              value={admin.name}
              onChange={(e) => {
                setAdmin((a) => ({ ...a, name: e.target.value }));
                clearFieldError('adminName');
              }}
              placeholder="Jane Smith"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {validation.adminName && (
              <p style={{ color: '#c82333', fontSize: 12, marginTop: 4 }}>{validation.adminName}</p>
            )}
          </div>
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password * (min 8 characters)</label>
            <input
              type="password"
              className={inputClass}
              value={admin.password}
              onChange={(e) => {
                setAdmin((a) => ({ ...a, password: e.target.value }));
                clearFieldError('adminPassword');
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {validation.adminPassword && (
              <p style={{ color: '#c82333', fontSize: 12, marginTop: 4 }}>{validation.adminPassword}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1A7B7B' }}>Company</h4>
            <p style={{ margin: 0 }}><strong>{company.name}</strong></p>
            {company.abn && <p style={{ margin: 4 }}>ABN: {company.abn}</p>}
            {company.contact_email && <p style={{ margin: 4 }}>Contact: {company.contact_email}</p>}
            {company.company_type_id && (
              <p style={{ margin: 4 }}>
                Type: {companyTypes.find((t) => t.id === parseInt(company.company_type_id, 10))?.name?.replace(/_/g, ' ') || company.company_type_id}
              </p>
            )}
          </div>
          <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1A7B7B' }}>Company admin</h4>
            <p style={{ margin: 0 }}>{admin.name} &lt;{admin.email}&gt;</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Back
            </button>
          )}
        </div>
        <div>
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 10,
                background: '#1A7B7B',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 10,
                background: '#1A7B7B',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {loading ? 'Creating…' : 'Create company'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
