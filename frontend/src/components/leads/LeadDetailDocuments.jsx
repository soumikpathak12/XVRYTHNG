// components/leads/LeadDetailDocuments.jsx – simple load + upload + save to DB
import React, { useEffect, useState } from 'react';

export default function LeadDetailDocuments({ documents = [], leadId }) {
  const [docs, setDocs] = useState(documents || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('xvrythng_token');

  const loadDocs = async () => {
    try {
      setError('');
      const res = await fetch(`/api/leads/${leadId}/documents`, {
        headers: {
          Authorization: `Bearer ${getToken()}`, // <-- QUAN TRỌNG
        },
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message);
      setDocs(j.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    }
  };

  useEffect(() => {
    if (leadId) loadDocs();
  }, [leadId]);

  // Upload file
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`/api/leads/${leadId}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`, // <-- QUAN TRỌNG
        },
        body: fd, 
      });

      const j = await res.json();
      if (!j.success) throw new Error(j.message);

      await loadDocs();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="lead-detail-documents">
      <div className="lead-detail-documents-upload">
        <label className="lead-detail-upload-btn">
          <input
            type="file"
            className="lead-detail-upload-input"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'Uploading…' : 'Upload document'}
        </label>
      </div>

      {error && (
        <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 6 }}>
          {error}
        </div>
      )}

      <ul className="lead-detail-document-list">
        {docs.length === 0 ? (
          <li className="lead-detail-empty">No documents attached yet.</li>
        ) : (
          docs.map((doc) => (
            <li key={doc.id} className="lead-detail-document-item">
              <span className="lead-detail-doc-name">{doc.filename}</span>
              {doc.created_at && (
                <span className="lead-detail-doc-date">
                  {new Date(doc.created_at).toLocaleString()}
                </span>
              )}
              {doc.storage_url && (
                <a href={doc.storage_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>
                  Open
                </a>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}