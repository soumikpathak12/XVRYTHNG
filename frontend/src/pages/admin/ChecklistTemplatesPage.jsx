// pages/admin/ChecklistTemplatesPage.jsx
import { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, X, GripVertical } from 'lucide-react';

const UI = {
  colors: {
    teal: '#14B8A6',
    navy: '#1E3A8A',
    lightGray: '#F3F4F6',
    border: '#E5E7EB',
    text: '#1F2937',
    danger: '#EF4444',
  },
  pad: 16,
  gap: 12,
  radius: 8,
};

// ============ API Functions ============
async function getChecklistTemplates() {
  const res = await fetch('/api/site-inspection-checklists?showInactive=true');
  if (!res.ok) throw new Error('Failed to load templates');
  const json = await res.json();
  return json.data || [];
}

async function createTemplate(data) {
  const res = await fetch('/api/site-inspection-checklists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create template');
  }
  return res.json();
}

async function updateTemplate(id, data) {
  const res = await fetch(`/api/site-inspection-checklists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update template');
  }
  return res.json();
}

async function deleteTemplate(id) {
  const res = await fetch(`/api/site-inspection-checklists/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete template');
  }
  return res.json();
}

// ============ Template Form Component ============
function TemplateForm({ template, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    items: template?.items || [],
    is_active: template?.is_active !== undefined ? template.is_active : true,
  });
  const [errors, setErrors] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleToggleActive = () => {
    setForm(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { text: '', order: prev.items.length + 1 }],
    }));
  };

  const handleItemChange = (index, text) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, text } : item
      ),
    }));
  };

  const handleRemoveItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newItems = [...form.items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    // Update order
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setForm(prev => ({ ...prev, items: newItems }));
    setDraggedIndex(null);
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (form.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    const emptyItems = form.items.filter(item => !item.text.trim());
    if (emptyItems.length > 0) {
      newErrors.items = 'All items must have text';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      items: form.items
        .map(item => ({
          text: item.text.trim(),
          order: item.order,
        }))
        .filter(item => item.text),
      is_active: form.is_active,
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit}
      style={{
        background: 'white',
        padding: UI.pad * 2,
        borderRadius: UI.radius,
        border: `1px solid ${UI.colors.border}`,
      }}>
      <h3 style={{ marginTop: 0, marginBottom: UI.pad, color: UI.colors.navy }}>
        {template ? 'Edit Template' : 'Create New Template'}
      </h3>

      {/* Name */}
      <div style={{ marginBottom: UI.gap * 2 }}>
        <label style={{ display: 'block', marginBottom: UI.gap, fontWeight: 600, color: UI.colors.text }}>
          Template Name *
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleInputChange}
          placeholder="e.g., Solar Installation"
          style={{
            width: '100%',
            padding: UI.pad,
            border: `1px solid ${errors.name ? UI.colors.danger : UI.colors.border}`,
            borderRadius: UI.radius,
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        {errors.name && (
          <div style={{ color: UI.colors.danger, fontSize: 12, marginTop: 4 }}>
            {errors.name}
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: UI.gap * 2 }}>
        <label style={{ display: 'block', marginBottom: UI.gap, fontWeight: 600, color: UI.colors.text }}>
          Description
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleInputChange}
          placeholder="Optional description"
          rows={3}
          style={{
            width: '100%',
            padding: UI.pad,
            border: `1px solid ${UI.colors.border}`,
            borderRadius: UI.radius,
            fontSize: 14,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Active Toggle */}
      <div style={{ marginBottom: UI.gap * 2, display: 'flex', alignItems: 'center', gap: UI.gap }}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={handleToggleActive}
          style={{ cursor: 'pointer' }}
        />
        <label style={{ cursor: 'pointer' }}>
          Active
        </label>
      </div>

      {/* Items */}
      <div style={{ marginBottom: UI.gap * 2 }}>
        <div style={{ marginBottom: UI.gap, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, color: UI.colors.text }}>
            Checklist Items * (Drag to reorder)
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            style={{
              background: '#1A7B7B',
              color: 'white',
              border: 'none',
              padding: `${UI.gap}px ${UI.pad}px`,
              borderRadius: UI.radius,
              cursor: 'pointer',
              fontSize: 14,
            }}>
            <Plus size={16} style={{ display: 'inline', marginRight: 4 }} />
            Add Item
          </button>
        </div>

        {errors.items && (
          <div style={{ color: UI.colors.danger, fontSize: 12, marginBottom: UI.gap }}>
            {errors.items}
          </div>
        )}

        <div style={{ gap: UI.gap, display: 'flex', flexDirection: 'column' }}>
          {form.items.map((item, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              style={{
                display: 'flex',
                gap: UI.gap,
                alignItems: 'center',
                padding: UI.pad,
                background: draggedIndex === idx ? '#E0F2FE' : UI.colors.lightGray,
                borderRadius: UI.radius,
                border: `1px solid ${UI.colors.border}`,
                transition: 'background 0.2s',
              }}>
              <GripVertical size={18} style={{ cursor: 'grab', color: '#999', flexShrink: 0 }} />
              <span style={{ color: '#666', fontSize: 12, flexShrink: 0 }}>
                {idx + 1}
              </span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                placeholder="Item text"
                style={{
                  flex: 1,
                  padding: UI.gap,
                  border: `1px solid ${UI.colors.border}`,
                  borderRadius: UI.radius,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                style={{
                  background: UI.colors.danger,
                  color: 'white',
                  border: 'none',
                  padding: `${UI.gap}px ${UI.pad}px`,
                  borderRadius: UI.radius,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: UI.gap, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: `${UI.gap}px ${UI.pad}px`,
            border: `1px solid ${UI.colors.border}`,
            background: 'white',
            borderRadius: UI.radius,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: `${UI.gap}px ${UI.pad}px`,
            background: '#1A7B7B',
            color: 'white',
            border: 'none',
            borderRadius: UI.radius,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}>
          {isLoading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}

// ============ Notification Component ============
function Notification({ type, message, onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 4000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? '#E8F5E9' : '#FEF2F2';
  const borderColor = isSuccess ? '#28A745' : '#FECACA';
  const textColor = isSuccess ? '#28A745' : '#991B1B';
  const icon = isSuccess ? '✓' : '✕';

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        color: textColor,
        padding: `${UI.pad}px ${UI.pad * 1.5}px`,
        borderRadius: UI.radius,
        display: 'flex',
        alignItems: 'center',
        gap: UI.gap,
        zIndex: 2000,
        maxWidth: 400,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
      <span style={{ fontSize: 18, fontWeight: 'bold' }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: textColor,
          cursor: 'pointer',
          fontSize: 18,
          padding: 0,
          marginLeft: UI.gap,
        }}>
        ×
      </button>
    </div>
  );
}

// ============ Main Page ============
export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getChecklistTemplates();
      setTemplates(data);
    } catch (e) {
      setError(e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (payload) => {
    try {
      setSaveLoading(true);
      setError('');

      const isNewTemplate = !editingId;
      
      if (editingId) {
        await updateTemplate(editingId, payload);
      } else {
        await createTemplate(payload);
      }

      // Show success notification
      setNotification({
        type: 'success',
        message: isNewTemplate ? 'Template created successfully!' : 'Template updated successfully!',
      });

      // Reload templates after a short delay to show notification
      setTimeout(async () => {
        await loadTemplates();
        setEditingId(null);
        setIsCreating(false);
      }, 500);
    } catch (e) {
      setNotification({
        type: 'error',
        message: e.message || 'Failed to save template',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setError('');
      await deleteTemplate(deleteConfirm.id);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: 'Template deleted successfully!',
      });

      setDeleteConfirm(null);
      
      // Reload templates after a short delay to show notification
      setTimeout(async () => {
        await loadTemplates();
      }, 500);
    } catch (e) {
      setNotification({
        type: 'error',
        message: e.message || 'Failed to delete template',
      });
    }
  };

  if (isCreating || editingId) {
    const template = templates.find(t => t.id === editingId);
    return (
      <div style={{ padding: UI.pad * 2 }}>
        <h1 style={{ marginTop: 0, color: UI.colors.navy }}>Checklist Templates Manager</h1>
        <TemplateForm
          template={template}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditingId(null);
          }}
          isLoading={saveLoading}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: UI.pad * 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: UI.pad * 2 }}>
        <h1 style={{ marginTop: 0, color: UI.colors.navy }}>Checklist Templates Manager</h1>
        <button
          onClick={() => setIsCreating(true)}
          style={{
            background: '#1A7B7B',
            color: 'white',
            border: 'none',
            padding: `${UI.gap}px ${UI.pad}px`,
            borderRadius: UI.radius,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}>
          <Plus size={18} style={{ display: 'inline', marginRight: UI.gap }} />
          New Template
        </button>
      </div>

      {error && (
        <div style={{
          background: '#FEE2E2',
          color: UI.colors.danger,
          padding: UI.pad,
          borderRadius: UI.radius,
          marginBottom: UI.pad * 2,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: UI.pad * 2 }}>Loading...</div>
      ) : templates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: UI.pad * 2,
          background: 'white',
          borderRadius: UI.radius,
          border: `1px solid ${UI.colors.border}`,
        }}>
          No templates found. Create one to get started!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: UI.gap * 2 }}>
          {templates.map(template => (
            <div
              key={template.id}
              style={{
                background: 'white',
                padding: UI.pad,
                borderRadius: UI.radius,
                border: `1px solid ${UI.colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, marginBottom: UI.gap, color: UI.colors.text }}>
                  {template.name}
                </h4>
                {template.description && (
                  <p style={{ margin: 0, marginBottom: UI.gap, fontSize: 13, color: '#666', maxWidth: '70%' }}>
                    {template.description}
                  </p>
                )}
                <div style={{ fontSize: 12, color: '#999' }}>
                  {template.items.length} items • 
                  {template.is_active ? ' Active' : ' Inactive'}
                  {template.company_id && ' • Company-specific'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: UI.gap, flexShrink: 0 }}>
                <button
                  onClick={() => setEditingId(template.id)}
                  style={{
                    background: '#1A7B7B',
                    color: 'white',
                    border: 'none',
                    padding: `${UI.gap}px ${UI.pad}px`,
                    borderRadius: UI.radius,
                    cursor: 'pointer',
                  }}>
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(template)}
                  style={{
                    background: UI.colors.danger,
                    color: 'white',
                    border: 'none',
                    padding: `${UI.gap}px ${UI.pad}px`,
                    borderRadius: UI.radius,
                    cursor: 'pointer',
                  }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            padding: UI.pad * 2,
            borderRadius: UI.radius,
            maxWidth: 400,
          }}>
            <h3 style={{ marginTop: 0, color: UI.colors.navy }}>Delete Template?</h3>
            <p style={{ color: '#666', marginBottom: UI.pad * 2 }}>
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: UI.gap, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: `${UI.gap}px ${UI.pad}px`,
                  border: `1px solid ${UI.colors.border}`,
                  background: 'white',
                  borderRadius: UI.radius,
                  cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: `${UI.gap}px ${UI.pad}px`,
                  background: UI.colors.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: UI.radius,
                  cursor: 'pointer',
                }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
