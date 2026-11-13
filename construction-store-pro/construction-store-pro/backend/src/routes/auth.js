const r = require('express').Router();
const bcrypt = require('bcryptjs'); const jwt = require('jsonwebtoken');
const db = require('../db'); const { SECRET } = require('../middleware/auth');
const { wrap, HttpError } = require('../utils/http'); const audit = require('../utils/audit');
r.post('/login', wrap(async (q, s) => {
  const u = await db.user.findUnique({ where: { username: String(q.body.username || '') }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  if (!u || !u.isActive || !(await bcrypt.compare(String(q.body.password || ''), u.passwordHash))) throw new HttpError(401, 'Invalid username or password');
  const perms = u.role.permissions.map(x => x.permission.code);
  const user = { id: u.id, name: u.fullName, role: u.role.name, perms, lang: u.language };
  await audit(db, u.id, 'LOGIN', 'User', u.id);
  s.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user });
}));
module.exports = r;
