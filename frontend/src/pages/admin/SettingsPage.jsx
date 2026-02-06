// src/pages/admin/SettingsPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Boxes,
  Workflow,
  UsersRound,
  Share2,
  PlugZap,
  Bell,
  ImagePlus,
} from 'lucide-react';

// ⬇️ Use a relative import (no alias) to your API client
import { getAdminMe, updateAdminMe } from '../../services/api.js';

const palette = {
  brand: '#146b6b',
  brandHover: '#0f5858',
  text: '#0f1a2b',
  subtext: '#6B7280',
  border: '#E5E7EB',
  mutedBg: '#F3F4F6',
  white: '#ffffff',
  success: '#2BB673',
  danger: '#D14343',
};

const card = {
  background: palette.white,
  border: `1px solid ${palette.border}`,
  borderRadius: 16,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${palette.border}`,
  background: '#F9FAFB',
  outline: 'none',
  fontSize: 14,
  color: palette.text,
};

const labelStyle = {
  display: 'block',
  fontWeight: 700,
  color: palette.text,
  marginBottom: 8,
  fontSize: 13,
};

const helpStyle = {
  fontSize: 12,
  color: palette.subtext,
  marginTop: 6,
};

const sections = [
  { key: 'company', label: 'Company Profile', icon: Building2 },
  { key: 'modules', label: 'Module Management', icon: Boxes },
  { key: 'workflow', label: 'Workflow Configuration', icon: Workflow },
  { key: 'roles', label: 'Employee Roles', icon: UsersRound },
  { key: 'referrals', label: 'Referral Program', icon: Share2 },
  { key: 'integrations', label: 'Integrations', icon: PlugZap },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const [active, setActive] = useState('company');

  return (
    <div style={{ padding: 16 }}>
      <div style={{ ...card, padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Left nav */}
          <SettingsNav active={active} onChange={setActive} />

          {/* Right content */}
          <div style={{ padding: 12 }}>
            {active === 'company' && <CompanyProfileForm />}
            {active !== 'company' && (
              <PlaceholderSection
                title={sections.find((s) => s.key === active)?.label || 'Settings'}
                message="This section will be available in the next phase."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNav({ active, onChange }) {
  return (
    <aside
      style={{
        padding: 8,
        borderRight: `1px dashed ${palette.border}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: palette.subtext,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        SETTINGS
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => onChange(s.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${isActive ? palette.brand : palette.white}`,
                background: isActive ? '#DDF1F0' : '#ffffff',
                color: isActive ? palette.brand : palette.text,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon size={18} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function CompanyProfileForm() {
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});
  const [logo, setLogo] = useState(null); // { url?:string, file?:File }

  const [form, setForm] = useState({
    companyName: '',
    abn: '',
    email: '',
    phone: '',
  });

  // Build absolute URL for logo if server returns relative path
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const logoSrc =
    logo?.url
      ? (logo.url.startsWith('http') ? logo.url : `${API_BASE}${logo.url}`)
      : null;

  // Load current profile on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAdminMe();
        setForm({
          companyName: data.name || '',
          abn: data.abn || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        if (data.image_url) setLogo({ url: data.image_url });
      } catch (e) {
        console.error(e);
        alert('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Simple validation
  const computeErrors = (f) => {
    const e = {};
    if (!f.companyName?.trim()) e.companyName = 'Company name is required.';
    if (f.abn && !/^\d[\d\s]*$/.test(f.abn)) e.abn = 'ABN should contain digits and spaces only.';
    if (!/^\S+@\S+\.\S+$/.test(f.email || '')) e.email = 'Invalid email address.';
    if (!f.phone?.trim()) e.phone = 'Phone number is required.';
    return e;
  };

  // Recompute errors on form changes
  useEffect(() => {
    setErrors(computeErrors(form));
  }, [form]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const onPickLogo = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/image\/(png|jpeg|jpg)/i.test(f.type)) {
      alert('Please upload a PNG or JPG image.');
      e.target.value = '';
      return;
    }

    const url = URL.createObjectURL(f);
    setLogo({ url, file: f });
  };

  const onChangeField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const newErrors = computeErrors(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setSaving(true);

      const { data } = await updateAdminMe({
        companyName: form.companyName,
        abn: form.abn,
        email: form.email,
        phone: form.phone,
        logoFile: logo?.file, // only sent if user chose a new file
      });

      // Reflect server values
      setForm({
        companyName: data.name || '',
        abn: data.abn || '',
        email: data.email || '',
        phone: data.phone || '',
      });
      if (data.image_url) setLogo({ url: data.image_url, file: undefined });

      alert('Saved successfully!');
    } catch (err) {
      // Validation from server (422)
      if (err?.status === 422 && err.body?.errors) {
        setErrors((prev) => ({ ...prev, ...err.body.errors }));
      } else {
        console.error(err);
        alert(err.message || 'Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 8, color: palette.subtext }}>
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0, color: palette.text }}>Company Profile</h2>
        <div style={{ ...helpStyle, marginTop: 6 }}>
          Configure your organization’s company profile preferences.
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginTop: 16 }}>
        {/* Logo uploader */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 16,
              border: `2px dashed ${palette.border}`,
              background: '#FAFAFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Organization Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: palette.subtext }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: '#EFF6F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: palette.brand,
                    marginBottom: 6,
                  }}
                >
                  <ImagePlus size={20} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>LOGO</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, color: palette.text }}>Organization Logo</div>
            <div style={{ ...helpStyle }}>Recommended size: 512×512px, PNG or JPG.</div>

            <button
              type="button"
              onClick={onPickLogo}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: 'none',
                color: palette.brand,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Upload new photo
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/png, image/jpeg"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Grid fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={onChangeField('companyName')}
              style={inputStyle}
              placeholder="Your company name"
              aria-invalid={!!errors.companyName}
            />
            {errors.companyName && (
              <div style={{ ...helpStyle, color: palette.danger }}>{errors.companyName}</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>ABN</label>
            <input
              type="text"
              value={form.abn}
              onChange={onChangeField('abn')}
              style={inputStyle}
              placeholder="12 345 678 910"
              aria-invalid={!!errors.abn}
              inputMode="numeric"
            />
            {errors.abn && <div style={{ ...helpStyle, color: palette.danger }}>{errors.abn}</div>}
          </div>

          <div>
            <label style={labelStyle}>Business Email</label>
            <input
              type="email"
              value={form.email}
              onChange={onChangeField('email')}
              style={inputStyle}
              placeholder="admin@company.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <div style={{ ...helpStyle, color: palette.danger }}>{errors.email}</div>}
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={onChangeField('phone')}
              style={inputStyle}
              placeholder="1300 000 000"
              aria-invalid={!!errors.phone}
              inputMode="tel"
            />
            {errors.phone && <div style={{ ...helpStyle, color: palette.danger }}>{errors.phone}</div>}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button
          type="submit"
          disabled={saving || !isValid}
          style={{
            background: !isValid || saving ? '#9EC9C9' : palette.brand,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            padding: '10px 16px',
            borderRadius: 10,
            cursor: saving || !isValid ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(20,107,107,.2)',
          }}
          onMouseOver={(e) => {
            if (!saving && isValid) e.currentTarget.style.background = palette.brandHover;
          }}
          onMouseOut={(e) => {
            if (!saving && isValid) e.currentTarget.style.background = palette.brand;
          }}
          aria-busy={saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function PlaceholderSection({ title, message }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <h2 style={{ margin: 0, color: palette.text }}>{title}</h2>
      <p style={{ color: palette.subtext, marginTop: 6 }}>{message}</p>
    </div>
  );
}