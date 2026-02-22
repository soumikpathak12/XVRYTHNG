/**
 * Modal shown after successfully sending customer portal link (link only; OTP is sent when they open link and click Send OTP).
 * Shows loginUrl when provided so staff can copy the link for testing.
 */
import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';

export default function CredentialsSentModal({ open, onClose, email, loginUrl, isTestLink }) {
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    if (!loginUrl) return;
    navigator.clipboard.writeText(loginUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Modal title={isTestLink ? 'Customer portal test link' : 'Portal link sent'} open={open} onClose={onClose} width={420}>
      <div style={{ padding: '0 18px 24px', fontSize: 15, color: '#334155', lineHeight: 1.5 }}>
        {isTestLink ? (
          <>
            <p style={{ margin: '0 0 12px' }}>
              Use the link below to test the customer portal for <strong>{email}</strong>. No email was sent.
            </p>
            <p style={{ margin: '0 0 12px' }}>The link is valid for 7 days. Open it, then click <strong>Send OTP</strong> to receive a code and sign in.</p>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 12px' }}>
              A sign-in link has been sent to <strong>{email}</strong>.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              The customer should open the link, then click <strong>Send OTP</strong> to receive a one-time code by email and sign in. The link is valid for 7 days.
            </p>
          </>
        )}
        {loginUrl && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>Copy link for testing</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={loginUrl}
                style={{ flex: 1, padding: '8px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
              <button type="button" onClick={copyLink} style={{ padding: '8px 12px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
