/**
 * Role management: list system + custom roles, create custom role with permissions.
 * Modern CRM-style layout.
 */
import { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api.js';
import { Plus, X, Check, Lock, Users } from 'lucide-react';

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
  surface: '#FAFBFC',
};

const card = {
  background: palette.white,
  border: `1px solid ${palette.border}`,
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,.04)',
};

// Group permissions by resource for matrix-style UI
function groupPermissionsByResource(permissions) {
  const list = (permissions || []).filter((p) => p.resource !== '*' || p.action !== '*');
  const byResource = {};
  list.forEach((p) => {
    if (!byResource[p.resource]) byResource[p.resource] = [];
    byResource[p.resource].push(p);
  });
  const resources = Object.keys(byResource).sort();
  return { byResource, resources };
}

export default function RolesPage() {
  const [roles, setRoles] = useState({ system: [], custom: [] });
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPermIds, setCreatePermIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const { byResource, resources } = useMemo(() => groupPermissionsByResource(permissions), [permissions]);

  useEffect(() => {
    Promise.all([api.getRoles(), api.getPermissions()])
      .then(([r, p]) => {
        setRoles(r.data || { system: [], custom: [] });
        setPermissions(p.data || []);
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createCustomRole({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        permissionIds: createPermIds,
      });
      const { data } = await api.getRoles();
      setRoles(data || { system: [], custom: [] });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreatePermIds([]);
    } catch (e) {
      setError(e.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (id) => {
    setCreatePermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleResource = (resourcePerms) => {
    const ids = resourcePerms.map((p) => p.id);
    const allSelected = ids.every((id) => createPermIds.includes(id));
    if (allSelected) {
      setCreatePermIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setCreatePermIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 0', color: palette.subtext, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 20, height: 20, border: `2px solid ${palette.border}`, borderTopColor: palette.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading roles…
      </div>
    );
  }

  if (error && !roles.system?.length) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: '#FFF2F2',
          border: `1px solid #FAD1D1`,
          color: palette.danger,
          fontWeight: 600,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: palette.text }}>
            Roles & Permissions
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: palette.subtext }}>
            Manage system and custom roles and their access permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(!showCreate); setError(null); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: showCreate ? palette.mutedBg : palette.brand,
            color: showCreate ? palette.text : palette.white,
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: showCreate ? 'none' : '0 2px 8px rgba(20,107,107,.25)',
          }}
        >
          {showCreate ? <X size={18} /> : <Plus size={18} />}
          {showCreate ? 'Cancel' : 'Create custom role'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#FFF2F2',
            border: '1px solid #FAD1D1',
            color: palette.danger,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* Create custom role form */}
      {showCreate && (
        <div style={{ ...card, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: palette.text }}>
            New custom role
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: palette.text, marginBottom: 8 }}>
                  Name <span style={{ color: palette.danger }}>*</span>
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Sales Lead"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${palette.border}`,
                    background: palette.surface,
                    fontSize: 14,
                    color: palette.text,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: palette.text, marginBottom: 8 }}>
                  Description
                </label>
                <input
                  type="text"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Optional"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${palette.border}`,
                    background: palette.surface,
                    fontSize: 14,
                    color: palette.text,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: palette.text, marginBottom: 12 }}>
                Permissions
              </label>
              <div
                style={{
                  border: `1px solid ${palette.border}`,
                  borderRadius: 10,
                  background: palette.surface,
                  overflow: 'hidden',
                }}
              >
                {resources.map((res) => {
                  const perms = byResource[res] || [];
                  const ids = perms.map((p) => p.id);
                  const allSelected = ids.length > 0 && ids.every((id) => createPermIds.includes(id));
                  return (
                    <div
                      key={res}
                      style={{
                        borderBottom: `1px solid ${palette.border}`,
                        padding: '12px 14px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleResource(perms)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: `2px solid ${allSelected ? palette.brand : palette.border}`,
                            background: allSelected ? palette.brand : palette.white,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          {allSelected && <Check size={12} color="#fff" />}
                        </button>
                        <span style={{ fontWeight: 700, fontSize: 13, color: palette.text, textTransform: 'capitalize' }}>
                          {res.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginLeft: 30 }}>
                        {perms.map((p) => {
                          const checked = createPermIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                fontSize: 13,
                                color: palette.subtext,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePerm(p.id)}
                                style={{ width: 16, height: 16, accentColor: palette.brand }}
                              />
                              <span>{p.action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: saving ? palette.mutedBg : palette.brand,
                  color: saving ? palette.subtext : palette.white,
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 2px 8px rgba(20,107,107,.25)',
                }}
              >
                {saving ? 'Creating…' : 'Create role'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(null); setCreateName(''); setCreateDesc(''); setCreatePermIds([]); }}
                style={{
                  padding: '10px 20px',
                  background: palette.white,
                  color: palette.text,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System roles */}
      <div style={{ ...card, marginBottom: 20, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${palette.border}`,
            background: palette.mutedBg,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Lock size={18} color={palette.subtext} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: palette.text }}>
            System roles
          </h3>
        </div>
        <p style={{ margin: 0, padding: '12px 20px', fontSize: 13, color: palette.subtext }}>
          Predefined roles with fixed permission sets. Cannot be edited.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: palette.surface }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                  Role
                </th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                  Description
                </th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {(roles.system || []).map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${palette.border}`,
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: palette.text }}>
                    {r.name?.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '14px 20px', color: palette.subtext }}>
                    {r.description || '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        background: '#EFF6F5',
                        color: palette.brand,
                      }}
                    >
                      System
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom roles */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${palette.border}`,
            background: palette.mutedBg,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Users size={18} color={palette.subtext} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: palette.text }}>
            Custom roles
          </h3>
        </div>
        <p style={{ margin: 0, padding: '12px 20px', fontSize: 13, color: palette.subtext }}>
          Company-specific roles with configurable permissions.
        </p>
        {(roles.custom || []).length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: palette.subtext,
              fontSize: 14,
              borderTop: `1px solid ${palette.border}`,
            }}
          >
            No custom roles yet. Create one using the button above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: palette.surface }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                    Role
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                    Description
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700, color: palette.subtext, borderBottom: `1px solid ${palette.border}` }}>
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.custom.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: `1px solid ${palette.border}`,
                    }}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: palette.text }}>
                      {r.name}
                    </td>
                    <td style={{ padding: '14px 20px', color: palette.subtext }}>
                      {r.description || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#E0F2FE',
                          color: '#0369A1',
                        }}
                      >
                        Custom
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
