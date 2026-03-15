// frontend/src/components/FormRenderer.jsx
import React from 'react';
import FieldControl from './FieldControl.jsx';
import { isVisible } from '../utils/template.js';

export default function FormRenderer({ template, stepIndex, formData, setFormData, onPickFile }) {
  const steps = Array.isArray(template.steps) ? template.steps : JSON.parse(template.steps || '[]');
  const step = steps[stepIndex] || { sections: [] };

  // Collect all media items (photos/files) across the entire template for Media Summary.
  const allMediaItems = React.useMemo(() => {
    const items = [];
    for (const st of steps) {
      for (const sec of st.sections || []) {
        for (const f of sec.fields || []) {
          if (f.type !== 'photo' && f.type !== 'file') continue;
          const v = formData?.[f.key];
          if (!v) continue;
          const pushItem = (obj) => {
            if (!obj) return;
            const src = obj.preview_data_url || obj.storage_url;
            if (!src) return;
            items.push({
              sectionLabel: sec.label,
              fieldLabel: f.label,
              src,
              filename: obj.filename || '',
            });
          };
          if (Array.isArray(v)) {
            v.forEach(pushItem);
          } else {
            pushItem(v);
          }
        }
      }
    }
    return items;
  }, [steps, formData]);

  return (
    <div style={{display:'grid', gap:12}}>
      {step.sections.map(section => {
        const isMediaSummary = section.id === 'mediaSummary';
        if (isMediaSummary) {
          return (
            <div key={section.id} style={{display:'grid', gap:10}}>
              <div style={{fontWeight:800, fontSize:16}}>{section.label}</div>
              <div style={{fontSize:12, color:'#6B7280'}}>
                Thumbnails of all uploaded photos/files across this inspection.
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                  padding: 8,
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  background: '#F9FAFB',
                }}
              >
                {allMediaItems.length === 0 ? (
                  <div style={{fontSize:12, color:'#9CA3AF'}}>No media uploaded yet.</div>
                ) : (
                  allMediaItems.map((m, idx) => (
                    <div
                      key={`${m.sectionLabel}-${m.fieldLabel}-${idx}`}
                      style={{
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid #E5E7EB',
                        background: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{width: '100%', paddingTop: '70%', position: 'relative', overflow: 'hidden'}}>
                        <img
                          src={m.src}
                          alt={m.fieldLabel}
                          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
                        />
                      </div>
                      <div style={{padding: '6px 8px', fontSize: 11}}>
                        <div style={{fontWeight:700}}>{m.sectionLabel}</div>
                        <div style={{color:'#4B5563'}}>{m.fieldLabel}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={section.id} style={{display:'grid', gap:10}}>
            <div style={{fontWeight:800, fontSize:16}}>{section.label}</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {section.fields.filter(f => isVisible(f, formData)).map(field => (
                <div key={field.key} style={{display:'grid', gap:6}}>
                  <div style={{fontSize:12, fontWeight:700}}>
                    {field.label}{field.required ? ' *' : ''}
                  </div>
                  <FieldControl
                    field={field}
                    value={formData[field.key]}
                    onChange={(v) => setFormData(prev => ({ ...prev, [field.key]: v }))}
                    onPickFile={onPickFile}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}