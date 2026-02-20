/**
 * Modal shown after successfully sending customer portal link (link only; OTP is sent when they open link and click Send OTP).
 */
import React from 'react';
import Modal from '../common/Modal.jsx';

export default function CredentialsSentModal({ open, onClose, email }) {
  return (
    <Modal title="Portal link sent" open={open} onClose={onClose} width={420}>
      <div style={{ padding: '0 18px 24px', fontSize: 15, color: '#334155', lineHeight: 1.5 }}>
        <p style={{ margin: '0 0 12px' }}>
          A sign-in link has been sent to <strong>{email}</strong>.
        </p>
        <p style={{ margin: 0 }}>
          The customer should open the link, then click <strong>Send OTP</strong> to receive a one-time code by email and sign in. The link is valid for 7 days.
        </p>
      </div>
    </Modal>
  );
}
