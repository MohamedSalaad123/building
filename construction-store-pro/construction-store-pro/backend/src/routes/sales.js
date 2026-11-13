const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, range, HttpError } = require('../utils/http');
const { createSale, addSalePayment } = require('../services/sales');
r.get('/', can('sale.view'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const { search, status } = q.query; const where = {};
  if (q.user.role === 'CASHIER') where.cashierId = q.user.id;
  if (status) where.status = status; const rg = range(q.query); if (rg) where.createdAt = rg;
  if (search) where.OR = [{ invoiceNo: { contains: search } }, { customer: { fullName: { contains: search } } }];
  const [rows, total] = await Promise.all([db.sale.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { customer: true, cashier: { select: { fullName: true } } } }), db.sale.count({ where })]);
  s.json({ total, rows });
}));
r.get('/:id', can('sale.view'), wrap(async (q, s) => {
  const x = await db.sale.findUnique({ where: { id: +q.params.id }, include: { items: { include: { product: true } }, payments: true, customer: true, cashier: { select: { fullName: true } } } });
  if (!x) throw new HttpError(404, 'Not found'); if (q.user.role === 'CASHIER' && x.cashierId !== q.user.id) throw new HttpError(403, 'Forbidden'); s.json(x);
}));
r.post('/', can('sale.create'), wrap(async (q, s) => s.status(201).json(await createSale(q.user.id, q.body))));
r.post('/:id/payments', can('sale.create'), wrap(async (q, s) => s.json(await addSalePayment(+q.params.id, q.user.id, q.body))));
module.exports = r;
