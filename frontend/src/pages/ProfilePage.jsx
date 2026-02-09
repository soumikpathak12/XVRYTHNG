import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api.js';
import '../styles/ProfilePage.css';

const BASE = import.meta.env.VITE_API_URL || '';
const MAX_RESIZE = 400;
const JPEG_QUALITY = 0.85;

function resizeImage(file, maxSize = MAX_RESIZE, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validation, setValidation] = useState({});
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    notify_email: true,
    notify_sms: false,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.getProfileMe();
      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
        notify_email: data.notify_email !== false,
        notify_sms: Boolean(data.notify_sms),
      });
      if (data.image_url) setPhotoPreview(data.image_url.startsWith('http') ? data.image_url : `${BASE}${data.image_url}`);
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const photoSrc = photoPreview || (profile?.image_url ? (profile.image_url.startsWith('http') ? profile.image_url : `${BASE}${profile.image_url}`) : null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidation((v) => ({ ...v, photo: 'Please choose an image (PNG, JPG or WebP)' }));
      return;
    }
    setValidation((v) => ({ ...v, photo: undefined }));
    try {
      const blob = await resizeImage(file);
      const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      setPhotoFile(resized);
      setPhotoPreview(URL.createObjectURL(resized));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const validateForm = () => {
    const err = {};
    if (!form.name?.trim()) err.name = 'Name is required';
    if (!form.email?.trim()) err.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Invalid email';
    if (form.phone?.length > 50) err.phone = 'Phone too long';
    setValidation(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!validateForm()) return;
    setSaving(true);
    try {
      const { data } = await api.updateProfileMe({
        ...form,
        photoFile: photoFile || undefined,
      });
      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
        notify_email: data.notify_email !== false,
        notify_sms: Boolean(data.notify_sms),
      });
      setPhotoFile(null);
      if (data.image_url) setPhotoPreview(data.image_url.startsWith('http') ? data.image_url : `${BASE}${data.image_url}`);
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (e) {
      if (e.status === 422 && e.body?.errors) setValidation(e.body.errors);
      else setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword) {
      setPasswordError('Current and new password are required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePasswordMe({ currentPassword, newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError(null);
      setSuccess('Password changed successfully.');
    } catch (e) {
      setPasswordError(e.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="profile-container" style={{ color: '#6B7280', marginTop: 40 }}>Loading profile...</div>;
  if (error && !profile) return <div className="profile-container"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="profile-container">
      <h1 className="profile-header-title">My Profile</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="profile-content">
        {/* Left Column: User Card */}
        <div className="profile-card user-info-card">
          <div className="profile-avatar-wrapper">
            {photoSrc ? (
              <img src={photoSrc} alt="Profile" className="profile-avatar" />
            ) : (
              <div className="profile-initials">
                {(profile?.name || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="user-name">{profile.name}</h2>
          <p className="user-role">{(profile.role_name || profile.role || '').replace(/_/g, ' ')}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="edit-photo-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Change Photo
          </button>

          {validation.photo && <p className="form-error">{validation.photo}</p>}
        </div>

        {/* Right Column: Forms */}
        <div className="profile-main-column">

          {/* Personal Information */}
          <div className="profile-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Personal Information</h3>
              {!editing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="card-body">
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Your name"
                      />
                      {validation.name && <p className="form-error">{validation.name}</p>}
                    </div>
                    <div>
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                      />
                      {validation.email && <p className="form-error">{validation.email}</p>}
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                      {validation.phone && <p className="form-error">{validation.phone}</p>}
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.department}
                        onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                        placeholder="e.g. Engineering"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Notification Preferences</label>
                    <div className="notification-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={form.notify_email}
                          onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.checked }))}
                        />
                        <span>Email notifications</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={form.notify_sms}
                          onChange={(e) => setForm((f) => ({ ...f, notify_sms: e.target.checked }))}
                        />
                        <span>SMS notifications</span>
                      </label>
                    </div>
                  </div>

                  <div className="btn-group">
                    <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditing(false);
                        setValidation({});
                        setPhotoFile(null);
                        // Reset photo preview
                        if (profile?.image_url) {
                          setPhotoPreview(profile.image_url.startsWith('http') ? profile.image_url : `${BASE}${profile.image_url}`);
                        } else {
                          setPhotoPreview(null);
                        }
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="view-details">
                  <div className="detail-item">
                    <span className="detail-label">Full Name</span>
                    <p className="detail-value">{profile.name}</p>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email Address</span>
                    <p className="detail-value">{profile.email}</p>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone Number</span>
                    <p className="detail-value">{profile.phone || '—'}</p>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Department</span>
                    <p className="detail-value">{profile.department || '—'}</p>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Role</span>
                    <p className="detail-value">{(profile.role_name || profile.role || '').replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="profile-card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Security & Password</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '600px' }}>
                  <div>
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Minimum 8 chars"
                      />
                    </div>
                    <div>
                      <label className="form-label">Confirm Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  {passwordError && <p className="form-error">{passwordError}</p>}

                  <div style={{ marginTop: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                      {changingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
