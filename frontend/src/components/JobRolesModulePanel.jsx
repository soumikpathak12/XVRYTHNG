/**
 * JobRoleModulesPanel.jsx
 * Module assignment interface for each Job Role (filtered by the current company's company_type)
 */
import { useEffect, useState } from 'react';
import * as api from '../services/api';

const BRAND = '#146b6b';

export default function JobRoleModulesPanel() {
  const [jobRoles, setJobRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([api.getJobRoles(), api.getCompanyModules()])
      .then(([jr, ms]) => {
        setJobRoles(jr.data || []);
        setModules(ms.data || []);
      })
      .catch(e => setError(e.message || 'Failed to load modules'));
  }, []);

  const toggle = (roleId, key) => {
    setJobRoles(prev =>
      prev.map(r =>
        r.id === roleId
          ? {
              ...r,
              modules: r.modules.some(m => m.key === key)
                ? r.modules.filter(m => m.key !== key)
                : [
                    ...r.modules,
                    { key, name: modules.find(x => x.key_name === key)?.display_name || key },
                  ],
            }
          : r
      )
    );
  };

  const save = async roleId => {
    const role = jobRoles.find(r => r.id === roleId);
    const roleName = role?.name ?? 'this role';
    const ok = window.confirm(`Save module access changes for ${roleName}?`);
    if (!ok) return;

    setSavingId(roleId);
    setError(null);
    setToast('');
    const moduleKeys = (role?.modules ?? []).map(m => m.key);

    try {
      await api.setJobRoleModules(roleId, { moduleKeys });
      setToast('Saved successfully.');
      window.setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      {toast && (
        <div style={{
          marginBottom: 12,
          padding: '10px 14px',
          background: '#ECFDF5',
          color: '#047857',
          borderRadius: 8,
          fontWeight: 700,
          border: '1px solid #A7F3D0',
        }}>
          {toast}
        </div>
      )}
      {error && (
        <div style={{ 
          marginBottom: 12,
          padding: '10px 14px',
          background: '#FEE2E2',
          color: '#B91C1C',
          borderRadius: 8,
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      {jobRoles.map(r => (
        <div
          key={r.id}
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 18,
            marginBottom: 14,
            background: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: '#0f1a2b' }}>
            {r.name}{' '}
            <span style={{ color: '#6B7280', fontWeight: 500 }}>({r.code})</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {modules.map(m => {
              const checked = r.modules.some(x => x.key === m.key_name);
              return (
                <label
                  key={m.key_name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.id, m.key_name)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: BRAND,
                      cursor: 'pointer',
                    }}
                  />
                  <span>{m.display_name}</span>
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => save(r.id)}
              disabled={savingId === r.id}
              style={{
                background: savingId === r.id ? '#8fb3b3' : BRAND,
                color: '#fff',
                padding: '8px 16px',
                border: 'none',
                borderRadius: 8,
                cursor: savingId === r.id ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(20,107,107,0.25)',
              }}
            >
              {savingId === r.id ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}