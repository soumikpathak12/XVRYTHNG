// src/controllers/userController.js
import { createUser } from '../services/userService.js';

export async function postUser(req, res) {
  console.log('[CTRL postUser] start');
  try {
    const ctx = { companyId: req.user?.companyId ?? null, requesterRole: req.user?.role ?? null };
    const user = await createUser(req.body, ctx);

    if (!user || !user.id) {
      // Chặn "success ảo": service không trả user hợp lệ thì báo lỗi
      throw Object.assign(new Error('Create user failed: service returned no user'), { status: 500 });
    }

    console.log('[CTRL postUser] created id=', user.id);
    if (user.password_hash) delete user.password_hash;
    return res.status(201).json({ success: true, data: user });
  } catch (e) {
    console.error('[CTRL postUser] error', e);
    if (e.status === 422) {
      return res.status(422).json({ success: false, errors: e.details ?? { message: e.message } });
    }
    return res.status(e.status ?? 500).json({ success: false, error: e.message });
  }
}