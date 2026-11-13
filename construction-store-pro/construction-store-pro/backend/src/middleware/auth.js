const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(t, SECRET); next(); } catch { res.status(401).json({ error: 'Invalid token' }); }
}
const can = (...codes) => (req, res, next) =>
  req.user.role === 'ADMIN' || codes.some(c => req.user.perms.includes(c)) ? next() : res.status(403).json({ error: 'Forbidden' });
module.exports = { auth, can, SECRET };
