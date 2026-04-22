import { useEffect, useMemo, useState } from 'react';
import {
  listResourceLibrary,
  createResourceLibraryItem,
  uploadResourceLibraryPhoto,
  deleteResourceLibraryItem,
} from '../services/api.js';

function resolveUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return v.startsWith('/') ? v : `/${v}`;
}

export default function ResourceLibraryPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [filterSection, setFilterSection] = useState('All');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sticker');
  const [resourceType, setResourceType] = useState('photo');
  const [sectionName, setSectionName] = useState('General');
  const [createNewSection, setCreateNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listResourceLibrary();
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sections = useMemo(() => {
    const set = new Set(['All']);
    for (const item of items) {
      const s = String(item?.section_name || '').trim();
      if (s) set.add(s);
    }
    if (set.size === 1) set.add('General');
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterSection === 'All') return items;
    return items.filter((i) => String(i?.section_name || 'General') === filterSection);
  }, [items, filterSection]);

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      const effectiveSection = createNewSection ? newSectionName.trim() : sectionName.trim();
      if (!effectiveSection) throw new Error('Section is required');
      if (!title.trim()) throw new Error('Title is required');

      let imageUrl = '';
      if (resourceType === 'photo') {
        if (!photoFile) throw new Error('Please choose a photo');
        const uploadRes = await uploadResourceLibraryPhoto(photoFile);
        imageUrl = uploadRes?.data?.image_url || '';
        if (!imageUrl) throw new Error('Photo upload did not return URL');
      } else {
        if (!linkUrl.trim()) throw new Error('Link URL is required');
      }

      await createResourceLibraryItem({
        title: title.trim(),
        category,
        section_name: effectiveSection,
        resource_type: resourceType,
        image_url: imageUrl || null,
        link_url: resourceType === 'link' ? linkUrl.trim() : null,
        notes: notes.trim() || null,
      });

      setTitle('');
      setCategory('sticker');
      setResourceType('photo');
      setSectionName('General');
      setCreateNewSection(false);
      setNewSectionName('');
      setLinkUrl('');
      setNotes('');
      setPhotoFile(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await deleteResourceLibraryItem(id);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to delete resource');
    }
  };

  const selectedPhotoPreview = useMemo(() => {
    if (!photoFile) return '';
    try {
      return URL.createObjectURL(photoFile);
    } catch (_) {
      return '';
    }
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview) URL.revokeObjectURL(selectedPhotoPreview);
    };
  }, [selectedPhotoPreview]);

  const toneByCategory = {
    sticker: { bg: '#EEF6FF', color: '#1D4ED8' },
    installation: { bg: '#ECFDF5', color: '#047857' },
    general: { bg: '#F5F3FF', color: '#6D28D9' },
  };

  return (
    <div style={{ padding: 20, background: '#F8FAFC', minHeight: '100%' }}>
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          background: '#fff',
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1A1A2E' }}>Resource Library</h2>
            <p style={{ margin: '6px 0 0', color: '#64748B' }}>
              Shared references for sticker samples, installation guides, and field links.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            style={{
              border: '1px solid #CBD5E1',
              background: '#fff',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          background: '#fff',
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 14, color: '#0F172A' }}>Add Resource</h3>
        {error ? (
          <div style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
          />

          <select
            value={createNewSection ? '__new__' : sectionName}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__new__') {
                setCreateNewSection(true);
              } else {
                setCreateNewSection(false);
                setSectionName(v);
              }
            }}
            style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
          >
            {sections.filter((s) => s !== 'All').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="__new__">Create new section</option>
          </select>

          {createNewSection ? (
            <input
              placeholder="New section name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
            />
          ) : null}

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
          >
            <option value="sticker">Sticker</option>
            <option value="installation">Installation</option>
            <option value="general">General</option>
          </select>

          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
          >
            <option value="photo">Photo</option>
            <option value="link">Link</option>
          </select>

          {resourceType === 'photo' ? (
            <div
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 40,
              }}
            >
              <label
                htmlFor="resource-photo-input"
                style={{
                  border: '1px solid #94A3B8',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                Choose photo
              </label>
              <input
                id="resource-photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {photoFile?.name || 'No file selected'}
              </span>
            </div>
          ) : (
            <input
              placeholder="Link URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px' }}
            />
          )}
        </div>

        <textarea
          rows={3}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%',
            marginTop: 10,
            border: '1px solid #CBD5E1',
            borderRadius: 10,
            padding: '10px 12px',
            boxSizing: 'border-box',
          }}
        />
        {resourceType === 'photo' && selectedPhotoPreview ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Selected photo preview</div>
            <button
              type="button"
              onClick={() => setViewerUrl(selectedPhotoPreview)}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                padding: 0,
                overflow: 'hidden',
                width: 220,
                height: 150,
                cursor: 'zoom-in',
                background: '#F8FAFC',
              }}
            >
              <img src={selectedPhotoPreview} alt="Selected preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          </div>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              border: 'none',
              background: '#0F766E',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Resource'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setFilterSection(section)}
            style={{
              borderRadius: 999,
              padding: '7px 14px',
              border: filterSection === section ? '1px solid #0F766E' : '1px solid #CBD5E1',
              background: filterSection === section ? '#0F766E' : '#fff',
              color: filterSection === section ? '#fff' : '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {section}
          </button>
        ))}
      </div>

      {loading ? <div>Loading...</div> : null}

      {!loading && filteredItems.length === 0 ? (
        <div
          style={{
            border: '1px dashed #CBD5E1',
            borderRadius: 14,
            background: '#fff',
            color: '#64748B',
            padding: 24,
            textAlign: 'center',
          }}
        >
          No resources in this section yet.
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filteredItems.map((item) => {
          const imageUrl = resolveUrl(item.image_url);
          const link = resolveUrl(item.link_url);
          const tone = toneByCategory[item.category] || toneByCategory.general;
          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
              }}
            >
              {item.resource_type === 'photo' ? (
                <div style={{ height: 200, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
                      onClick={() => setViewerUrl(imageUrl)}
                    />
                  ) : null}
                </div>
              ) : null}
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: tone.bg,
                      color: tone.color,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {item.section_name || 'General'} • {String(item.resource_type || '').toUpperCase()}
                </div>
                {item.notes ? <div style={{ marginTop: 8, fontSize: 13, color: '#334155' }}>{item.notes}</div> : null}
                {link ? (
                  <div style={{ marginTop: 8 }}>
                    <a href={link} target="_blank" rel="noreferrer" style={{ color: '#0F766E', fontWeight: 600 }}>
                      Open link
                    </a>
                  </div>
                ) : null}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      border: '1px solid #FECACA',
                      color: '#B91C1C',
                      background: '#fff',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewerUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setViewerUrl('')}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setViewerUrl('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <img
            src={viewerUrl}
            alt="Resource preview"
            style={{
              maxWidth: '92vw',
              maxHeight: '90vh',
              borderRadius: 12,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              background: '#fff',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
