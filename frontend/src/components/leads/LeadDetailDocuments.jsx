// components/leads/LeadDetailDocuments.jsx – file list + upload
import React, { useState } from 'react';

export default function LeadDetailDocuments({ documents = [], leadId, onUpload }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      onUpload?.();
    }, 800);
  };

  return (
    <div className="lead-detail-documents">
      <div className="lead-detail-documents-upload">
        <label className="lead-detail-upload-btn">
          <input type="file" className="lead-detail-upload-input" onChange={handleFileSelect} disabled={uploading} />
          {uploading ? 'Uploading…' : 'Upload document'}
        </label>
      </div>
      <ul className="lead-detail-document-list">
        {documents.length === 0 ? (
          <li className="lead-detail-empty">No documents attached yet.</li>
        ) : (
          documents.map((doc) => (
            <li key={doc.id} className="lead-detail-document-item">
              <span className="lead-detail-doc-name">{doc.name || doc.filename || 'Document'}</span>
              {doc.created_at && (
                <span className="lead-detail-doc-date">{new Date(doc.created_at).toLocaleDateString()}</span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
