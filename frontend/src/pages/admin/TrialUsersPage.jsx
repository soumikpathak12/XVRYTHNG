import React, { useEffect, useMemo, useState } from 'react';
import {
  getTrialUsers,
  createTrialUser,
  sendTrialLinks,
  updateTrialUser,
  deleteTrialUser,
} from '../../services/api.js';
import Modal from '../../components/common/Modal.jsx';
import TrialUserForm from '../../components/trial/TrialUserForm.jsx';

/**
 * Trial Users Page:
 * - List, create (modal), edit (modal), delete (confirm)
 * - Send Trial Link to all users
 */
export default function TrialUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sendingLinks, setSendingLinks] = useState(false);

  // Edit modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm state
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast (with variant)
  const [toast, setToast] = useState('');
  const [toastVariant, setToastVariant] = useState('success'); // 'success' | 'error'

  // Brand-based toast styles
  const toastStyles = toastVariant === 'success'
    ? { background: '#ECF9F0', color: '#1A1A2E', border: '1px solid #BDE8CD' } // Success
    : { background: '#FDECEE', color: '#DC3545', border: '1px solid #F5C2C7' }; // Danger

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await getTrialUsers(); // { success, data }
        const arr = Array.isArray(res?.data) ? res.data : [];
        if (alive) setUsers(arr);
      } catch (e) {
        if (alive) setErr(e?.message ?? 'Failed to load trial users');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      const hay = [u.name, u.email, u.phone].map(v => (v ?? '').toString().toLowerCase());
      return hay.some(s => s.includes(q));
    });
  }, [users, search]);

  // --- Create ---
  async function handleCreate(payload) {
    try {
      setSubmitting(true);
      const res = await createTrialUser(payload); // { success, data }
      const created = res?.data;
      if (created) {
        setUsers(prev => [created, ...prev]);
        setOpenAdd(false);
        setToastVariant('success');
        setToast('Trial user created');
        setTimeout(() => setToast(''), 2500);
      }
    } catch (e) {
      setToastVariant('error');
      setToast(e?.message ?? 'Failed to create trial user');
      setTimeout(() => setToast(''), 3500);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Edit ---
  function openEditModal(user) {
    setEditingUser(user);
    setOpenEdit(true);
  }

  async function handleUpdate(payload) {
    if (!editingUser) return;
    try {
      setSavingEdit(true);
      const res = await updateTrialUser(editingUser.id, payload); // { success, data }
      const updated = res?.data;
      if (updated) {
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? updated : u)));
        setOpenEdit(false);
        setEditingUser(null);
        setToastVariant('success');
        setToast('Trial user updated');
        setTimeout(() => setToast(''), 2500);
      }
    } catch (e) {
      setToastVariant('error');
      setToast(e?.message ?? 'Failed to update trial user');
      setTimeout(() => setToast(''), 3500);
    } finally {
      setSavingEdit(false);
    }
  }

  // --- Delete ---
  function openDeleteConfirm(user) {
    setDeletingUser(user);
    setOpenDelete(true);
  }

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      await deleteTrialUser(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setOpenDelete(false);
      setDeletingUser(null);
      setToastVariant('success');
      setToast('Trial user deleted');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToastVariant('error');
      setToast(e?.message ?? 'Failed to delete trial user');
      setTimeout(() => setToast(''), 3500);
    } finally {
      setDeleting(false);
    }
  }

  // --- Send Trial Links ---
  async function handleSendTrialLinks() {
    try {
      setSendingLinks(true);
      const res = await sendTrialLinks(); // { success, total, sent, failed, errors, trialLinkUrl }
      const msg =
        `Sent ${res.sent}/${res.total} trial emails` +
        (res.failed ? `, ${res.failed} failed` : '');
      setToastVariant(res.failed ? 'error' : 'success');
      setToast(msg);
      setTimeout(() => setToast(''), 5000);
    } catch (e) {
      setToastVariant('error');
      setToast(e?.message ?? 'Failed to send trial links');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setSendingLinks(false);
    }
  }

  return (
    <div className="page-wrap" style={{ padding: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 10, ...toastStyles }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Trial Users</h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
            List of users want to try the application.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleSendTrialLinks}
            disabled={sendingLinks}
            title="Send trial link emails to all trial users"
            style={{
              background: sendingLinks ? '#9ca3af' : '#1A7B7B', // Primary Teal
              color: '#fff', border: 'none', padding: '8px 14px',
              borderRadius: 10, fontWeight: 700,
              cursor: sendingLinks ? 'not-allowed' : 'pointer',
              boxShadow: sendingLinks ? 'none' : '0 4px 14px rgba(26,123,123,.25)'
            }}
          >
            {sendingLinks ? 'Sending…' : 'Send Trial Link'}
          </button>

          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            style={{
              background: '#1A7B7B', color: '#fff', border: 'none',
              padding: '8px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(26,123,123,.25)'
            }}
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '0 0 320px' }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            aria-label="Search trial users"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', outline: 'none'
            }}
          />
        </div>
        <div style={{ color: '#6b7280', fontSize: 14 }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 20 }}>Loading trial users…</div>
      ) : err ? (
        <div
          style={{ padding: 12, background: '#FDECEE', color: '#DC3545', border: '1px solid #F5C2C7', borderRadius: 10, marginBottom: 10 }}
        >
          {err}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#F5F5F5', color: '#1A1A2E' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={{ ...thStyle, width: 160, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.phone || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        title="Edit trial user"
                        style={{
                          background: '#1A7B7B',  // Info
                          color: '#fff',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(u)}
                        title="Delete trial user"
                        style={{
                          background: '#DC3545', 
                          color: '#fff',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 18, color: '#64748b', textAlign: 'center' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User modal */}
      <Modal open={openAdd} onClose={() => !submitting && setOpenAdd(false)} title="Add Trial User" width={520}>
        <TrialUserForm
          submitting={submitting}
          onCancel={() => !submitting && setOpenAdd(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      {/* Edit User modal */}
      <Modal open={openEdit} onClose={() => !savingEdit && setOpenEdit(false)} title="Edit Trial User" width={520}>
        <TrialUserForm
          initial={editingUser}
          submitting={savingEdit}
          onCancel={() => !savingEdit && setOpenEdit(false)}
          onSubmit={handleUpdate}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={openDelete} onClose={() => !deleting && setOpenDelete(false)} title="Delete Trial User" width={420}>
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: '#1A1A2E' }}>
            Are you sure you want to delete <strong>{deletingUser?.name}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => !deleting && setOpenDelete(false)}
              style={{
                background: '#F5F5F5', border: '1px solid #e5e7eb',
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: '#1A1A2E'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: '#DC3545', color: '#fff', border: 'none',
                padding: '8px 12px', borderRadius: 8, cursor: deleting ? 'not-allowed' : 'pointer'
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 700,
  fontSize: 13,
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 14,
};
