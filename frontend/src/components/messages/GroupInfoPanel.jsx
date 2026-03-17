/**
 * T-351 Group info: member list, add/remove members.
 */
import { useState, useEffect } from 'react';
import { getChatConversation, addGroupParticipants, removeGroupParticipant } from '../../services/api.js';
import './GroupInfoPanel.css';

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function GroupInfoPanel({
  conversationId,
  companyId,
  currentUserId,
  companyUsers,
  onClose,
  onLeave,
  onParticipantsChange,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getChatConversation(conversationId, companyId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId, companyId]);

  const participantIds = new Set((detail?.participants ?? []).map((p) => p.id));
  const availableToAdd = companyUsers.filter((u) => !participantIds.has(u.id));

  const handleAdd = async (userId) => {
    if (!userId || adding) return;
    setAdding(true);
    try {
      await addGroupParticipants(conversationId, [userId], companyId);
      const updated = await getChatConversation(conversationId, companyId);
      setDetail(updated);
      onParticipantsChange?.();
    } finally {
      setAdding(false);
      setAddUserId(null);
    }
  };

  const handleRemove = async (userId) => {
    if (removing) return;
    setRemoving(userId);
    try {
      await removeGroupParticipant(conversationId, userId, companyId);
      if (userId === currentUserId) {
        onLeave?.();
        return;
      }
      const updated = await getChatConversation(conversationId, companyId);
      setDetail(updated);
      onParticipantsChange?.();
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div className="group-info-panel"><p className="group-info-loading">Loading…</p></div>;
  if (!detail) return <div className="group-info-panel"><p className="group-info-error">Could not load group.</p></div>;

  return (
    <div className="group-info-panel">
      <div className="group-info-header">
        <h4 className="group-info-title">{detail.name || 'Group'}</h4>
        <button type="button" className="group-info-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="group-info-section">
        <h5 className="group-info-section-title">Members ({detail.participants?.length ?? 0})</h5>
        <ul className="group-info-members">
          {(detail.participants ?? []).map((p) => (
            <li key={p.id} className="group-info-member">
              <span className="group-info-member-initials">{getInitials(p.name)}</span>
              <span className="group-info-member-name">{p.name}</span>
              <span className="group-info-member-role">{p.role?.replace('_', ' ') ?? ''}</span>
              <button
                type="button"
                className="group-info-member-remove"
                onClick={() => handleRemove(p.id)}
                disabled={removing !== null}
                aria-label={p.id === currentUserId ? 'Leave group' : `Remove ${p.name}`}
              >
                {p.id === currentUserId ? 'Leave' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {availableToAdd.length > 0 && (
        <div className="group-info-section">
          <h5 className="group-info-section-title">Add member</h5>
          <ul className="group-info-add-list">
            {availableToAdd.map((u) => (
              <li key={u.id} className="group-info-add-item">
                <span className="group-info-add-name">{u.name}</span>
                <span className="group-info-add-meta">{u.role?.replace('_', ' ') ?? ''}{u.companyName ? ` · ${u.companyName}` : ''}</span>
                <button type="button" className="group-info-add-btn" onClick={() => handleAdd(u.id)} disabled={adding}>Add</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
