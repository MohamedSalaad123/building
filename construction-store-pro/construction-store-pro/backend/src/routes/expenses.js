const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, range, HttpError } = require('../utils/http'); const audit = require('../utils/audit');
r.get('/', can('expense.manage'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const where = {}; const rg = range(q.query); if (rg) where.spentAt = rg;
  const [rows, total, agg] = await Promise.all([db.expense.findMany({ where, skip, take, orderBy: { spentAt: 'desc' }, include: { category: true, user: { select: { fullName: true } } } }), db.expense.count({ where }), db.expense.aggregate({ where, _sum: { amountUsd: true } })]);
  s.json({ total, rows, sum: Number(agg._sum.amountUsd || 0) });
}));
r.post('/', can('expense.manage'), wrap(async (q, s) => {
  const b = q.body; if (!b.categoryId || !(+b.amountUsd > 0)) throw new HttpError(400, 'Category and amount required');
  const e = await db.expense.create({ data: { categoryId: +b.categoryId, userId: q.user.id, amountUsd: +b.amountUsd, method: b.method || 'CASH_USD', notes: b.notes || null, spentAt: b.spentAt ? new Date(b.spentAt) : new Date() } });
  await audit(db, q.user.id, 'EXPENSE_CREATED', 'Expense', e.id, { amount: +b.amountUsd }); s.status(201).json(e);
}));
r.delete('/:id', can('expense.manage'), wrap(async (q, s) => { await db.expense.delete({ where: { id: +q.params.id } }); await audit(db, q.user.id, 'EXPENSE_DELETED', 'Expense', q.params.id); s.json({ ok: true }); }));
module.exports = r;
