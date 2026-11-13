class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const page = q => { const p = Math.max(1, +q.page || 1), size = Math.min(500, +q.pageSize || 20); return { skip: (p - 1) * size, take: size }; };
const range = q => { const w = {}; if (q.from) w.gte = new Date(q.from); if (q.to) { const d = new Date(q.to); d.setHours(23, 59, 59, 999); w.lte = d; } return Object.keys(w).length ? w : undefined; };
module.exports = { HttpError, wrap, page, range };
