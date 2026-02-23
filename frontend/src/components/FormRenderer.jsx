// frontend/src/components/FormRenderer.jsx
import React from 'react';
import FieldControl from './FieldControl.jsx';
import { isVisible } from '../utils/template.js';

export default function FormRenderer({ template, stepIndex, formData, setFormData, onPickFile }) {
  const steps = Array.isArray(template.steps) ? template.steps : JSON.parse(template.steps || '[]');
  const step = steps[stepIndex] || { sections: [] };
  return (
    <div style={{display:'grid', gap:12}}>
      {step.sections.map(section => (
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
      ))}
    </div>
  );
}