import { useCallback, useEffect, useState } from 'react';
import { GripVertical, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  getCompanyWorkflowSettings,
  patchCompanyWorkflowSettings,
} from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const palette = {
  brand: '#146b6b',
  text: '#0f1a2b',
  subtext: '#6B7280',
  border: '#E5E7EB',
  white: '#ffffff',
  danger: '#D14343',
  mutedBg: '#F3F4F6',
};

const helpStyle = {
  fontSize: 12,
  color: palette.subtext,
  marginTop: 6,
  lineHeight: 1.45,
};

function newCustomKey() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function PipelineEditor({
  pipeline,
  title,
  description,
  stages,
  onAfterSave,
  busy,
  setBusy,
  setErr,
}) {
  const [dragIdx, setDragIdx] = useState(null);
  const [newName, setNewName] = useState('');

  const save = async (nextStages) => {
    setBusy(true);
    setErr(null);
    try {
      const body = await patchCompanyWorkflowSettings({ pipeline, stages: nextStages });
      const d = body?.data ?? body;
      onAfterSave(d);
    } catch (e) {
      setErr(e.message || 'Failed to save workflow.');
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = (idx) => {
    const next = stages.map((s, i) =>
      i === idx ? { ...s, enabled: s.enabled === false } : s
    );
    save(next);
  };

  const updateLabel = (idx, label) => {
    const trimmed = String(label).slice(0, 80);
    if (stages[idx]?.label === trimmed) return;
    const next = stages.map((s, i) => (i === idx ? { ...s, label: trimmed } : s));
    save(next);
  };

  const removeAt = (idx) => {
    const row = stages[idx];
    if (row?.builtin) return;
    save(stages.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName('');
    save([
      ...stages,
      { key: newCustomKey(), label: name.slice(0, 80), enabled: true, builtin: false },
    ]);
  };

  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, dropIdx) => {
    e.preventDefault();
    const from = dragIdx != null ? dragIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
    setDragIdx(null);
    if (Number.isNaN(from) || from === dropIdx) return;
    const next = [...stages];
    const [row] = next.splice(from, 1);
    next.splice(dropIdx, 0, row);
    save(next);
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: palette.text }}>{title}</h3>
      <p style={{ ...helpStyle, marginTop: 0 }}>{description}</p>

      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {stages.map((row, idx) => (
          <div
            key={row.key}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, idx)}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr auto auto',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              background: row.enabled === false ? palette.mutedBg : palette.white,
              opacity: busy ? 0.65 : 1,
            }}
          >
            <div
              style={{ color: palette.subtext, cursor: 'grab', display: 'flex', justifyContent: 'center' }}
              title="Drag to reorder"
            >
              <GripVertical size={20} />
            </div>
            <input
              type="text"
              key={`${row.key}-${row.label}`}
              defaultValue={row.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  e.target.value = row.label;
                  return;
                }
                if (v !== row.label) updateLabel(idx, v);
              }}
              disabled={busy}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${palette.border}`,
                fontSize: 14,
                fontWeight: 600,
                color: palette.text,
              }}
            />
            <button
              type="button"
              role="switch"
              aria-checked={row.enabled !== false}
              disabled={busy}
              onClick={() => toggleEnabled(idx)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 999,
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                background: row.enabled !== false ? palette.brand : '#D1D5DB',
                position: 'relative',
              }}
              title={row.enabled !== false ? 'Enabled' : 'Disabled'}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: row.enabled !== false ? 22 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.15s ease',
                }}
              />
            </button>
            {!row.builtin ? (
              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={busy}
                title="Remove custom stage"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  color: palette.danger,
                  padding: 6,
                }}
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <span style={{ width: 30 }} />
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 12,
          border: `1px dashed ${palette.border}`,
          background: '#FAFAFA',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: palette.text, marginBottom: 8 }}>
          <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Add custom stage
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Stage name"
            style={{
              flex: '1 1 200px',
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              fontSize: 14,
            }}
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={addCustom}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: busy || !newName.trim() ? '#9EC9C9' : palette.brand,
              color: '#fff',
              fontWeight: 700,
              cursor: busy || !newName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Add
          </button>
        </div>
        <p style={{ ...helpStyle, marginBottom: 0 }}>
          Disabled stages are hidden from the Kanban. Leads or projects in an inactive stage appear in the first active
          column until someone moves them.
        </p>
      </div>
    </div>
  );
}

export default function WorkflowConfigurationSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(null);

  const companyId = user?.companyId ?? null;
  const roleOk = ['company_admin', 'manager'].includes(String(user?.role || '').toLowerCase());

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const body = await getCompanyWorkflowSettings();
      setFull(body?.data ?? body);
    } catch (e) {
      setErr(e.message || 'Failed to load workflow.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyId != null && roleOk) load();
    else setLoading(false);
  }, [companyId, roleOk, load]);

  if (companyId == null || !roleOk) {
    return (
      <div style={{ padding: 8 }}>
        <h2 style={{ margin: 0, color: palette.text }}>Workflow Configuration</h2>
        <p style={helpStyle}>
          Workflow settings are available for company administrators and managers with a company assigned.
        </p>
      </div>
    );
  }

  if (loading || !full) {
    return <div style={{ padding: 8, color: palette.subtext }}>Loading workflow…</div>;
  }

  const salesStages = full.sales?.stages ?? [];
  const pmStages = full.project_management?.stages ?? [];

  return (
    <div>
      <h2 style={{ margin: 0, color: palette.text }}>Workflow Configuration</h2>
      <p style={{ ...helpStyle, marginTop: 6 }}>
        Customise sales and project pipelines. Drag the handle to reorder. Toggles save immediately.
      </p>

      {err && (
        <div
          role="alert"
          style={{
            marginTop: 12,
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

      <PipelineEditor
        pipeline="sales"
        title="Sales pipeline"
        description="Stages for the Leads Kanban board, table, and new lead form."
        stages={salesStages}
        onAfterSave={setFull}
        busy={busy}
        setBusy={setBusy}
        setErr={setErr}
      />

      <div style={{ height: 1, background: palette.border, margin: '28px 0' }} />

      <PipelineEditor
        pipeline="project_management"
        title="Project management pipeline"
        description="Stages for in-house projects (Projects Kanban and table)."
        stages={pmStages}
        onAfterSave={setFull}
        busy={busy}
        setBusy={setBusy}
        setErr={setErr}
      />
    </div>
  );
}
