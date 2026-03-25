import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import {
  getCompanyModuleSettings,
  patchCompanyModuleSettings,
} from '../../services/api.js';
import { useAuth, useSidebar } from '../../context/AuthContext.jsx';

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
  coreBg: '#EFF6F5',
};

const card = {
  background: palette.white,
  border: `1px solid ${palette.border}`,
  borderRadius: 16,
};

const helpStyle = {
  fontSize: 12,
  color: palette.subtext,
  marginTop: 6,
  lineHeight: 1.45,
};

function ToggleRow({ id, label, description, enabled, disabled, busy, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        background: palette.white,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: palette.text }}>{label}</div>
        <div style={{ ...helpStyle, marginTop: 4 }}>{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled || busy}
        onClick={() => onChange(id, !enabled)}
        style={{
          flexShrink: 0,
          width: 48,
          height: 28,
          borderRadius: 999,
          border: 'none',
          cursor: disabled || busy ? 'not-allowed' : 'pointer',
          background: enabled ? palette.brand : '#D1D5DB',
          position: 'relative',
          transition: 'background 0.15s ease',
          opacity: disabled || busy ? 0.55 : 1,
        }}
        title={enabled ? 'Enabled' : 'Disabled'}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 22 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
    </div>
  );
}

export default function ModuleManagementSection() {
  const { user } = useAuth();
  const { bumpSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);
  const [toggles, setToggles] = useState({});
  const [definitions, setDefinitions] = useState([]);
  const [coreDescription, setCoreDescription] = useState('');

  const companyId = user?.companyId ?? null;
  const roleLower = String(user?.role || '').toLowerCase();
  const roleOk = ['company_admin', 'manager', 'super_admin'].includes(roleLower);
  const needsCompanyId = roleLower !== 'super_admin';

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const body = await getCompanyModuleSettings();
      const d = body?.data ?? body;
      setToggles(d.toggles ?? {});
      setDefinitions(Array.isArray(d.definitions) ? d.definitions : []);
      setCoreDescription(d.coreDescription ?? '');
    } catch (e) {
      setErr(e.message || 'Failed to load module settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleOk && (!needsCompanyId || companyId != null)) load();
    else setLoading(false);
  }, [companyId, roleOk, needsCompanyId, load]);

  const onToggle = async (id, enabled) => {
    setErr(null);
    setBusyId(id);
    const prev = { ...toggles };
    setToggles((t) => ({ ...t, [id]: enabled }));
    try {
      const body = await patchCompanyModuleSettings({ [id]: enabled });
      const d = body?.data ?? body;
      if (d.toggles) setToggles(d.toggles);
      bumpSidebar();
    } catch (e) {
      setToggles(prev);
      setErr(e.message || 'Could not update module.');
    } finally {
      setBusyId(null);
    }
  };

  if (!roleOk || (needsCompanyId && companyId == null)) {
    return (
      <div style={{ ...card, padding: 18 }}>
        <h2 style={{ margin: 0, color: palette.text }}>Module Management</h2>
        <p style={{ ...helpStyle, marginTop: 8 }}>
          Module toggles are only available when you are signed in as a company administrator or manager with a company
          assigned.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 8, color: palette.subtext }}>
        Loading module settings…
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0, color: palette.text }}>Module Management</h2>
        <div style={{ ...helpStyle, marginTop: 6 }}>
          Turn features on or off for your organisation. Changes apply immediately for everyone in your company.
        </div>
      </div>

      {err && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#FFF2F2',
            color: palette.danger,
            border: '1px solid #FAD1D1',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} />
          {err}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: palette.coreBg,
          border: `1px solid #CDEFD9`,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <ShieldCheck size={22} color={palette.brand} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: palette.text }}>Core modules</div>
          <div style={{ ...helpStyle, marginTop: 4 }}>{coreDescription}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {definitions.map((def) => (
          <ToggleRow
            key={def.id}
            id={def.id}
            label={def.label}
            description={def.description}
            enabled={toggles[def.id] !== false}
            busy={busyId === def.id}
            disabled={false}
            onChange={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
