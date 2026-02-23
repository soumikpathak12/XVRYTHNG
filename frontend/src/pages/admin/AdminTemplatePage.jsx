// frontend/src/pages/admin/AdminTemplatesPage.jsx
import React, { useEffect, useState } from 'react';
import { getCompanyInspectionTemplates, saveInspectionTemplate, publishInspectionTemplate, deleteInspectionTemplate } from '../../services/api.js';
import { SECTION_KEYS } from '../../templates/sectionCatalog.js';

const emptyTemplate = {
  key: '', name: '', version: 1, status: 'draft',
  appliesTo: [],
  steps: [], // steps will be built from meta.enabledSections at runtime
  validation: { requiredFields: ['inspected_at','inspector_name','meter_phase','inverter_location','msb_condition','roof_type'] },
  meta: {
    enabledSections: [...SECTION_KEYS],
    stepGuards: [] 
  }
};

export default function AdminTemplatesPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyTemplate);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await getCompanyInspectionTemplates(); // uses authFetch now
      setList(r.data || []);
    } catch (e) { setMsg(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function pick(tpl) {
    const meta = tpl.meta ? (typeof tpl.meta === 'string' ? JSON.parse(tpl.meta) : tpl.meta) : {};
    const appliesTo = Array.isArray(tpl.appliesTo) ? tpl.appliesTo : (tpl.applies_to ? JSON.parse(tpl.applies_to) : []);
    const stepGuards = Array.isArray(meta.stepGuards) ? meta.stepGuards : [];
    setForm({
      id: tpl.id, key: tpl.key, name: tpl.name, version: tpl.version, status: tpl.status,
      appliesTo, steps: [],
      validation: tpl.validation ? (typeof tpl.validation === 'string' ? JSON.parse(tpl.validation) : tpl.validation) : emptyTemplate.validation,
      meta: {
        enabledSections: meta.enabledSections && meta.enabledSections.length ? meta.enabledSections : [...SECTION_KEYS],
        stepGuards
      }
    });
  }

  function toggleSection(secKey) {
    const enabled = new Set(form.meta?.enabledSections || []);
    if (enabled.has(secKey)) enabled.delete(secKey); else enabled.add(secKey);
    setForm(f => ({ ...f, meta: { ...f.meta, enabledSections: [...enabled] } }));
  }

  function toggleSelfieGuardJob() {
    const guards = Array.isArray(form.meta?.stepGuards) ? [...form.meta.stepGuards] : [];
    const idx = guards.findIndex(g => g.stepId === 'job');
    const jobRule = { stepId: 'job', fields: ['jobDetails.licenseSelfie'] };
    if (idx >= 0) {
      const same = JSON.stringify(guards[idx]) === JSON.stringify(jobRule);
      if (same) guards.splice(idx, 1);
      else guards[idx] = jobRule;
    } else {
      guards.push(jobRule);
    }
    setForm(f => ({ ...f, meta: { ...f.meta, stepGuards: guards } }));
  }

  function hasSelfieGuardJob() {
    return Array.isArray(form.meta?.stepGuards)
      && form.meta.stepGuards.some(g => g.stepId === 'job' && Array.isArray(g.fields) && g.fields.includes('jobDetails.licenseSelfie'));
  }

  async function onSave() {
    try {
      setMsg('');
      const payload = {
        id: form.id,
        key: form.key,
        name: form.name,
        version: form.version,
        status: form.status,
        appliesTo: form.appliesTo || [],
        steps: [], // not persisted; built at runtime from catalog
        validation: form.validation,
        meta: {
          enabledSections: form.meta?.enabledSections || [],
          stepGuards: form.meta?.stepGuards || []
        }
      };
      const r = await saveInspectionTemplate(payload);
      if (!form.id) setForm(f => ({ ...f, id: r.id }));
      setMsg('Saved');
      load();
    } catch (e) { setMsg(e.message || 'Save failed'); }
  }

  async function onPublish() {
    try {
      if (!form.id) return setMsg('Save before publish');
      await publishInspectionTemplate(form.id);
      setMsg('Published'); load();
    } catch (e) { setMsg(e.message || 'Publish failed'); }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    try { await deleteInspectionTemplate(id); load(); } catch (e) { setMsg(e.message || 'Delete failed'); }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      {/* Left: list */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
        <div style={{ fontWeight:800 }}>Templates</div>
        <button onClick={() => setForm({ ...emptyTemplate })} style={{margin:'8px 0'}}>+ New</button>
        {loading ? <div>Loading...</div> : (list || []).map(t => (
          <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #eee' }}>
            <div>
              <div style={{ fontWeight:700 }}>{t.name}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{t.key} • v{t.version} • {t.status}</div>
            </div>
            <div>
              <button onClick={() => pick(t)}>Edit</button>
              <button onClick={() => onDelete(t.id)} style={{ marginLeft:8, color:'#b91c1c' }}>Del</button>
            </div>
          </div>
        ))}
      </div>

      {/* Right: editor */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
        {msg && <div style={{ marginBottom:8, color:'#065F46', background:'#ECFDF5', padding:8, borderRadius:8 }}>{msg}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <label>Key <input value={form.key} onChange={e=>setForm(f=>({...f, key:e.target.value}))} /></label>
          <label>Name <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} /></label>
          <label>Version <input type="number" value={form.version} onChange={e=>setForm(f=>({...f, version:Number(e.target.value)}))} /></label>
          <label>Status
            <select value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label>Applies To (comma separated)
            <input
              value={(form.appliesTo||[]).join(',')}
              onChange={e=>setForm(f=>({...f, appliesTo: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}
            />
          </label>
        </div>

        <hr style={{margin:'12px 0'}} />

        <div>
          <div style={{ fontWeight:700, marginBottom:8 }}>Sections to show</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:8 }}>
            {SECTION_KEYS.map(k => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px' }}>
                <input
                  type="checkbox"
                  checked={(form.meta?.enabledSections || []).includes(k)}
                  onChange={() => toggleSection(k)}
                />
                <span style={{ textTransform:'capitalize' }}>
                  {k === 'subBoard' ? 'Sub-Board' :
                   k === 'mudmap' ? 'Mud Map' :
                   k === 'monitor' ? 'Monitoring & Existing' :
                   k === 'final' ? 'Final Checks' :
                   k === 'core' ? 'Core Details' :
                   k === 'job' ? 'Job Details' :
                   k === 'inverter' ? 'Inverter Location' :
                   k === 'roof' ? 'Roof Profile' :
                   k === 'switchboard' ? 'Switchboard' : k}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop:12, border:'1px solid #e5e7eb', borderRadius:8, padding:10 }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>Step Guards</div>
          <label style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" checked={hasSelfieGuardJob()} onChange={toggleSelfieGuardJob} />
            Require License Selfie before leaving <b>Job Details</b> step
          </label>
        </div>

        <hr style={{margin:'12px 0'}} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onSave}>Save draft</button>
          <button onClick={onPublish}>Publish</button>
        </div>
      </div>
    </div>
  );
}