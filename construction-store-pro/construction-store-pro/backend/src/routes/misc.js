const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, HttpError } = require('../utils/http'); const { getRate } = require('../utils/rate'); const audit = require('../utils/audit');
r.get('/lookups', wrap(async (q, s) => s.json({ categories: await db.category.findMany(), units: await db.unit.findMany(), expenseCategories: await db.expenseCategory.findMany() })));
r.get('/settings', wrap(async (q, s) => { const rows = await db.systemSetting.findMany(); s.json({ settings: Object.fromEntries(rows.map(x => [x.key, x.value])), rate: await getRate(db) }); }));
r.put('/settings', can('settings.manage'), wrap(async (q, s) => { for (const [key, value] of Object.entries(q.body)) await db.systemSetting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }); await audit(db, q.user.id, 'SETTINGS_UPDATED', 'Settings', ''); s.json({ ok: true }); }));
r.post('/settings/rate', can('settings.manage'), wrap(async (q, s) => { const v = +q.body.sosPerUsd; if (!(v > 0)) throw new HttpError(400, 'Invalid rate'); await db.exchangeRate.create({ data: { sosPerUsd: v, effectiveOn: new Date() } }); s.json({ ok: true }); }));
module.exports = r;
