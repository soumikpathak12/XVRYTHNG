// src/pages/admin/SettingsPage.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Building2,
  Boxes,
  Workflow,
  UsersRound,
  Share2,
  PlugZap,
  Bell,
  ImagePlus,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import RequirePermission from '../../components/RequirePermission.jsx';
import RolesPage from './RolesPage.jsx';
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

const ALL_SECTIONS = [
  { key: 'company', label: 'Company Profile', icon: Building2 },
  { key: 'modules', label: 'Module Management', icon: Boxes },
  { key: 'workflow', label: 'Workflow Configuration', icon: Workflow },
  { key: 'roles', label: 'Roles & Permissions', icon: Shield, permission: { resource: 'roles', action: 'view' } },
  { key: 'referrals', label: 'Referral Program', icon: Share2 },
  { key: 'integrations', label: 'Integrations', icon: PlugZap },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const [active, setActive] = useState('company');
  const { can } = useAuth();
  const sections = useMemo(() => {
    return ALL_SECTIONS.filter((s) => !s.permission || can(s.permission.resource, s.permission.action));
  }, [can]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ ...card, padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          <SettingsNav active={active} onChange={setActive} sections={sections} />

          <div style={{ padding: 12 }}>
            {active === 'company' && <CompanyProfileForm />}
            {active === 'roles' && (
              <RequirePermission resource="roles" action="view">
                <RolesPage />
              </RequirePermission>
            )}
            {active !== 'company' && active !== 'roles' && (
              <PlaceholderSection
                title={ALL_SECTIONS.find((s) => s.key === active)?.label || 'Settings'}
                message="This section will be available in the next phase."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNav({ active, onChange, sections }) {
  const navSections = sections || ALL_SECTIONS;
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
        {navSections.map((s) => {
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

  const [serverErrors, setServerErrors] = useState({}); // { field: message }
  const [serverMessage, setServerMessage] = useState(null); // success or general error

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

  // Load current profile on mount (no frontend validation)
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
        setServerMessage('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPickLogo = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // No client-side validation; just preview and send to server
    const url = URL.createObjectURL(f);
    setLogo({ url, file: f });
  };

  const onChangeField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    // Clear server error for this field when user edits
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerErrors({});
    setServerMessage(null);

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

      setServerMessage('Saved successfully!');
    } catch (err) {
      // Show server-provided errors (422) or general error
      if (err?.status === 422 && err.body?.errors) {
        setServerErrors(err.body.errors);
        setServerMessage('Please fix the errors and try again.');
      } else {
        console.error(err);
        setServerMessage(err.message || 'Failed to save.');
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

      {/* Global message (success or generic error) */}
      {serverMessage && (
        <div
          role="status"
          style={{
            marginTop: 10,
            marginBottom: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: serverErrors && Object.keys(serverErrors).length ? '#FFF2F2' : '#E9F7F1',
            color: serverErrors && Object.keys(serverErrors).length ? palette.danger : palette.success,
            border: `1px solid ${
              serverErrors && Object.keys(serverErrors).length ? '#FAD1D1' : '#CDEFD9'
            }`,
            fontWeight: 700,
          }}
        >
          {serverMessage}
        </div>
      )}

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
              // no accept restriction; server will validate
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
            {serverErrors.logo && (
              <div style={{ ...helpStyle, color: palette.danger, marginTop: 8 }}>
                {serverErrors.logo}
              </div>
            )}
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
              aria-invalid={!!serverErrors.companyName}
            />
            {serverErrors.companyName && (
              <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.companyName}</div>
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
              aria-invalid={!!serverErrors.abn}
              inputMode="numeric"
            />
            {serverErrors.abn && <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.abn}</div>}
          </div>

          <div>
            <label style={labelStyle}>Business Email</label>
            <input
              type="email"
              value={form.email}
              onChange={onChangeField('email')}
              style={inputStyle}
              placeholder="admin@company.com"
              aria-invalid={!!serverErrors.email}
            />
            {serverErrors.email && <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.email}</div>}
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={onChangeField('phone')}
              style={inputStyle}
              placeholder="1300 000 000"
              aria-invalid={!!serverErrors.phone}
              inputMode="tel"
            />
            {serverErrors.phone && <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.phone}</div>}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button
          type="submit"
          disabled={saving} // only disabled while saving, not on validity
          style={{
            background: saving ? '#9EC9C9' : palette.brand,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            padding: '10px 16px',
            borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(20,107,107,.2)',
          }}
          onMouseOver={(e) => {
            if (!saving) e.currentTarget.style.background = palette.brandHover;
          }}
          onMouseOut={(e) => {
            if (!saving) e.currentTarget.style.background = palette.brand;
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
