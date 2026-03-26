// frontend/src/components/FieldControl.jsx
import React from 'react';
import { resolveUploadUrl } from '../utils/resolveUploadUrl.js';
import { openInspectionMediaInNewTab } from '../utils/openInspectionMedia.js';

function isFileLikeObject(x) {
  return x && typeof x === 'object' && !Array.isArray(x) &&
    ('storage_url' in x || 'filename' in x || 'preview_data_url' in x);
}

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
      {
        const opts = Array.isArray(field.options) ? field.options : [];
        const hasOther = Boolean(field.allowOther);
        const OTHER_SENTINEL = '__OTHER__';
        const isOtherSentinel = value === OTHER_SENTINEL;
        const isKnown = value != null && value !== '' && opts.includes(value) && !isOtherSentinel;
        const inOtherMode = hasOther && !isKnown && (isOtherSentinel || (value != null && value !== ''));
        const selectVal = hasOther
          ? (isKnown ? value : (inOtherMode ? '__other__' : ''))
          : (value || '');
        const otherText = hasOther && inOtherMode
          ? (isOtherSentinel ? '' : (value || ''))
          : '';

        return (
          <div style={{display:'grid', gap:8}}>
            <select
              {...common}
              value={selectVal}
              onChange={(e) => {
                const v = e.target.value;
                if (hasOther && v === '__other__') {
                  // enter "other" mode – use sentinel so textarea shows,
                  // but real custom text will be stored from the textarea.
                  if (!inOtherMode) onChange(OTHER_SENTINEL);
                  return;
                }
                onChange(v);
              }}
            >
              <option value="">Select</option>
              {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              {hasOther && <option value="__other__">Other</option>}
            </select>

            {hasOther && selectVal === '__other__' && (
              <textarea
                style={{...common.style, minHeight: 64}}
                value={otherText}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          </div>
        );
      }
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
      let fileValue = value;
      if (Array.isArray(fileValue)) {
        const files = fileValue.filter(isFileLikeObject);
        fileValue = files[0] || (fileValue[0] && typeof fileValue[0] === 'object' ? fileValue[0] : null);
      }
      if (!fileValue || typeof fileValue !== 'object') fileValue = {};
      const rawSrc = fileValue.preview_data_url || fileValue.storage_url || '';
      const src = resolveUploadUrl(rawSrc);
      const isImg =
        (rawSrc && rawSrc.startsWith('data:image/')) ||
        (rawSrc && /\.(png|jpe?g|gif|webp|bmp)$/i.test(rawSrc.split('?')[0] || ''));

      const handleRename = (e) => {
        const nextName = e.target.value;
        onChange({ ...fileValue, filename: nextName });
      };

      const handleClear = () => {
        onChange(null);
      };

      return (
        <div style={{display:'grid', gap:6}}>
          <div style={{display:'flex', flexWrap:'wrap', alignItems:'center', gap:10}}>
            <button
              type="button"
              onClick={() => onPickFile(field)}
              style={{...common.style, width:'auto', cursor:'pointer'}}
            >
              Upload
            </button>
            {src && (
              <button
                type="button"
                onClick={() => openInspectionMediaInNewTab(rawSrc)}
                style={{
                  padding:'6px 10px',
                  borderRadius:999,
                  border:'1px solid #cbd5e1',
                  background:'#F9FAFB',
                  fontSize:11,
                  cursor:'pointer',
                  color:'#111827',
                }}
              >
                View
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding:'6px 10px',
                  borderRadius:999,
                  border:'1px solid #fecaca',
                  background:'#fef2f2',
                  fontSize:11,
                  cursor:'pointer',
                  color:'#b91c1c'
                }}
              >
                Remove
              </button>
            )}
          </div>
          {isImg && src && (
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <img
                src={src}
                alt={fileValue.filename || 'preview'}
                width={72}
                height={72}
                style={{borderRadius:10, objectFit:'cover', border:'1px solid #e5e7eb'}}
              />
            </div>
          )}
          {!isImg && fileValue.storage_url && (
            <div style={{fontSize:12}}>
              <button
                type="button"
                onClick={() => openInspectionMediaInNewTab(fileValue.storage_url)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#2563EB',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Download file
              </button>
            </div>
          )}
          <input
            {...common}
            placeholder="File name"
            value={fileValue.filename || ''}
            onChange={handleRename}
          />
        </div>
      );
    }
    default:
      return <div>Unsupported field: {field.type}</div>;
  }
}