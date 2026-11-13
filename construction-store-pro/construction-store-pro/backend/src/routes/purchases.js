const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, range, HttpError } = require('../utils/http');
const { createPurchase, addPurchasePayment } = require('../services/purchases');
r.get('/', can('purchase.manage'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const where = {}; const rg = range(q.query); if (rg) where.createdAt = rg;
  const [rows, total] = await Promise.all([db.purchase.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { supplier: true } }), db.purchase.count({ where })]);
  s.json({ total, rows });
}));
r.post('/', can('purchase.manage'), wrap(async (q, s) => s.status(201).json(await createPurchase(q.user.id, q.body))));
r.post('/:id/payments', can('purchase.manage'), wrap(async (q, s) => s.json(await addPurchasePayment(+q.params.id, q.user.id, q.body))));
module.exports = r;
