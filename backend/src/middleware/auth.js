
export function requireAuth(req, res, next) {
  const idHeader = req.headers['x-dev-user-id'];
  const userId = idHeader ? parseInt(idHeader, 10) : 3; 
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.user = { id: userId };
  next();
}
