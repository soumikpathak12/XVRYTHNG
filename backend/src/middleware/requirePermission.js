/**
 * API-level permission check. Use after requireAuth.
 * requirePermission('leads', 'view') -> 403 if user lacks permission.
 */
import * as permissionService from '../services/permissionService.js';

export function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    try {
      const allowed = await permissionService.userHasPermission(req.user.id, resource, action);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Access denied', code: 'FORBIDDEN' });
      }
      next();
    } catch (err) {
      console.error('requirePermission error', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
