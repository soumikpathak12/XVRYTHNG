/**
 * User profile controller: GET/PUT /users/me, PUT /users/me/password.
 * Any authenticated user can access their own profile.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as profileService from '../services/profileService.js';
import * as permissionService from '../services/permissionService.js';
import * as authService from '../services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/profiles');

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

/** GET /api/users/me */
export async function getProfile(req, res) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error('getProfile error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/users/me/permissions */
export async function getMyPermissions(req, res) {
  try {
    const permissions = await permissionService.getPermissionsForUser(req.user.id);
    return res.json({ success: true, data: permissions });
  } catch (err) {
    console.error('getMyPermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** PUT /api/users/me (JSON for fields; multipart for profile photo) */
export async function updateProfile(req, res) {
  try {
    const body = req.body || {};
    const errors = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) errors.name = 'Name is required';
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim();
      if (!email) errors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Invalid email';
    }
    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      const phone = String(body.phone).trim();
      if (phone.length > 50) errors.phone = 'Phone too long';
    }
    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    let imageUrl;
    if (req.files?.photo) {
      const file = req.files.photo;
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return res.status(422).json({ success: false, errors: { photo: 'Only PNG, JPG or WebP allowed' } });
      }
      if (file.size > MAX_PHOTO_SIZE) {
        return res.status(422).json({ success: false, errors: { photo: 'Photo must be under 5MB' } });
      }
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      const filename = `profile_${req.user.id}_${Date.now()}.${ext}`;
      const savePath = path.join(UPLOAD_DIR, filename);
      await file.mv(savePath);
      imageUrl = `/uploads/profiles/${filename}`;
    }

    const toBool = (v) => v === true || v === '1' || v === 'true';
    const data = {
      name: body.name !== undefined ? body.name : undefined,
      email: body.email !== undefined ? body.email : undefined,
      phone: body.phone !== undefined ? body.phone : undefined,
      department: body.department !== undefined ? body.department : undefined,
      notify_email: body.notify_email !== undefined ? toBool(body.notify_email) : undefined,
      notify_sms: body.notify_sms !== undefined ? toBool(body.notify_sms) : undefined,
      image_url: imageUrl,
    };
    const profile = await profileService.updateProfile(req.user.id, data);
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error('updateProfile error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


export async function changePassword(req, res) {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body ?? {};
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await authService.changePassword(userId, currentPassword, newPassword); 
  //give new tokens
    const userRow = await authService.findUserById(userId);
    const { accessToken, expiresIn } = authService.createAccessToken(userRow);
    const { refreshToken, refreshExpiresIn } = await authService.createRefreshToken(userId);
    const permissions = await permissionService.getPermissionsForUser(userId);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role_name,
        roleId: userRow.role_id,
        companyId: userRow.company_id,
      },
      permissions,
      needsPasswordChange: false,
    });
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('incorrect')) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    if (msg.includes('at least 8')) {
      return res.status(422).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    console.error('changePassword error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}