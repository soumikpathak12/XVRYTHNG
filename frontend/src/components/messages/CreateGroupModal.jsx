/**
 * T-348 Create group modal: group name + multi-select members.
 */
import { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import './CreateGroupModal.css';

function normalized(s) {
  return (s ?? '').toLowerCase().trim();
}

export default function CreateGroupModal({ open, onClose, employees, onCreate, creating }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const listRef = useRef(null);

  const filtered = !search.trim()
    ? employees
    : employees.filter((u) => {
        const q = normalized(search);
        return (
          normalized(u.name).includes(q) ||
          normalized(u.email).includes(q) ||
          normalized(u.role).includes(q) ||
          normalized(u.companyName).includes(q)
        );
      });

  const selected = employees.filter((u) => selectedIds.has(u.id));

  useEffect(() => {
    if (!open) {
      setName('');
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open]);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = name.trim() || 'Group Chat';
    const userIds = [...selectedIds];
    if (userIds.length === 0) return;
    onCreate({ name: title, userIds });
  };

  return (
    <Modal title="Create group chat" open={open} onClose={onClose} width={420}>
      <form className="create-group-form" onSubmit={handleSubmit}>
        <label className="create-group-label" htmlFor="create-group-name">
          Group name
        </label>
        <input
          id="create-group-name"
          type="text"
          className="create-group-input"
          placeholder="e.g. Melbourne Project A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          autoComplete="off"
        />

        <label className="create-group-label">Members</label>
        <div className="create-group-members-wrap">
          <input
            type="text"
            className="create-group-search"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {selected.length > 0 && (
            <div className="create-group-selected">
              {selected.map((u) => (
                <span key={u.id} className="create-group-chip">
                  {u.name}
                  <button
                    type="button"
                    className="create-group-chip-remove"
                    onClick={() => toggle(u.id)}
                    aria-label={`Remove ${u.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <ul ref={listRef} className="create-group-list" role="listbox">
            {filtered.map((u) => (
              <li key={u.id} className="create-group-option">
                <label className="create-group-option-label">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="create-group-checkbox"
                  />
                  <span className="create-group-option-name">{u.name}</span>
                  <span className="create-group-option-meta">
                    {u.role?.replace('_', ' ') ?? ''}
                    {u.companyName ? ` · ${u.companyName}` : ''}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="create-group-actions">
          <button type="button" className="create-group-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="create-group-submit"
            disabled={creating || selectedIds.size === 0}
          >
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
