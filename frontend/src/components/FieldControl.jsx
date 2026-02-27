// frontend/src/components/FieldControl.jsx
import React from 'react';

export default function FieldControl({ field, value, onChange, onPickFile }) {
  const common = { style: { border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', width: '100%' } };
  switch (field.type) {
    case 'text':
      return <input {...common} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'textarea':
      return <textarea {...common} style={{...common.style, minHeight: 64}} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'number':
      return <input {...common} type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
    case 'date':
      return <input {...common} type="date" value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'datetime':
      return <input {...common} type="datetime-local" value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'toggle':
      return (
        <select {...common} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select</option><option>Yes</option><option>No</option>
        </select>
      );
    case 'select':
      return (
        <select {...common} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'multiselect': {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (opt) => onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
      return (
        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
          {(field.options || []).map(opt => {
            const active = arr.includes(opt);
            return (
              <button type="button" key={opt} onClick={() => toggle(opt)}
                style={{padding:'8px 12px', borderRadius:12, border:'1px solid #cbd5e1',
                        background: active ? '#0FA5A5' : '#fff', color: active ? '#fff' : '#0F172A'}}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case 'photo':
    case 'file': {
      const isImg = value?.preview_data_url?.startsWith('data:image/');
      return (
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <button type="button" onClick={() => onPickFile(field)} style={{...common.style, width:'auto', cursor:'pointer'}}>Upload</button>
          {isImg && <img src={value.preview_data_url} alt={value?.filename || 'preview'} width={64} height={64} style={{borderRadius:10, objectFit:'cover'}} />}
          {value?.filename && <a href={value.storage_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration:'underline', fontSize:12 }}>{value.filename}</a>}
        </div>
      );
    }
    default:
      return <div>Unsupported field: {field.type}</div>;
  }
}