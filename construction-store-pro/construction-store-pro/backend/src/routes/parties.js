const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, HttpError } = require('../utils/http'); const audit = require('../utils/audit');
const f2 = n => +Number(n || 0).toFixed(2);
// ---- customers
r.get('/customers', can('customer.view', 'customer.manage'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const sr = q.query.search;
  const where = sr ? { OR: [{ fullName: { contains: sr } }, { phone: { contains: sr } }] } : {};
  const [rows, total] = await Promise.all([db.customer.findMany({ where, skip, take, orderBy: { id: 'desc' } }), db.customer.count({ where })]);
  const g = await db.sale.groupBy({ by: ['customerId'], where: { customerId: { in: rows.map(x => x.id) }, status: { not: 'CANCELLED' } }, _sum: { total: true, amountPaid: true }, _count: true });
  const m = new Map(g.map(x => [x.customerId, x]));
  s.json({ total, rows: rows.map(c => { const x = m.get(c.id); const t = Number(x?._sum.total || 0), p = Number(x?._sum.amountPaid || 0); return { ...c, purchases: x?._count || 0, totalAmount: f2(t), totalPaid: f2(p), balance: f2(t - p) }; }) });
}));
r.post('/customers', can('customer.manage'), wrap(async (q, s) => { if (!q.body.fullName) throw new HttpError(400, 'Name required'); const { fullName, phone, address, type } = q.body; const c = await db.customer.create({ data: { fullName, phone: phone || null, address: address || null, type: type || 'RETAIL' } }); await audit(db, q.user.id, 'CUSTOMER_CREATED', 'Customer', c.id); s.status(201).json(c); }));
r.put('/customers/:id', can('customer.manage'), wrap(async (q, s) => { const { fullName, phone, address, type } = q.body; s.json(await db.customer.update({ where: { id: +q.params.id }, data: { fullName, phone: phone || null, address: address || null, type } })); }));
r.get('/customers/:id/statement', can('customer.view', 'customer.manage'), wrap(async (q, s) => {
  const customer = await db.customer.findUnique({ where: { id: +q.params.id } }); if (!customer) throw new HttpError(404, 'Not found');
  s.json({ customer, docs: await db.sale.findMany({ where: { customerId: customer.id, status: { not: 'CANCELLED' } }, orderBy: { id: 'desc' }, include: { payments: true } }) });
}));
// ---- suppliers
r.get('/suppliers', can('supplier.manage'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const sr = q.query.search;
  const where = sr ? { OR: [{ name: { contains: sr } }, { phone: { contains: sr } }] } : {};
  const [rows, total] = await Promise.all([db.supplier.findMany({ where, skip, take, orderBy: { id: 'desc' } }), db.supplier.count({ where })]);
  const g = await db.purchase.groupBy({ by: ['supplierId'], where: { supplierId: { in: rows.map(x => x.id) }, status: { not: 'CANCELLED' } }, _sum: { total: true, amountPaid: true }, _count: true });
  const m = new Map(g.map(x => [x.supplierId, x]));
  s.json({ total, rows: rows.map(c => { const x = m.get(c.id); const t = Number(x?._sum.total || 0), p = Number(x?._sum.amountPaid || 0); return { ...c, purchases: x?._count || 0, totalAmount: f2(t), totalPaid: f2(p), balance: f2(t - p) }; }) });
}));
r.post('/suppliers', can('supplier.manage'), wrap(async (q, s) => { if (!q.body.name) throw new HttpError(400, 'Name required'); const { name, phone, address, company } = q.body; const c = await db.supplier.create({ data: { name, phone: phone || null, address: address || null, company: company || null } }); s.status(201).json(c); }));
r.put('/suppliers/:id', can('supplier.manage'), wrap(async (q, s) => { const { name, phone, address, company } = q.body; s.json(await db.supplier.update({ where: { id: +q.params.id }, data: { name, phone: phone || null, address: address || null, company: company || null } })); }));
r.get('/suppliers/:id/statement', can('supplier.manage'), wrap(async (q, s) => {
  const customer = await db.supplier.findUnique({ where: { id: +q.params.id } }); if (!customer) throw new HttpError(404, 'Not found');
  s.json({ customer: { ...customer, fullName: customer.name }, docs: await db.purchase.findMany({ where: { supplierId: customer.id }, orderBy: { id: 'desc' }, include: { payments: true } }) });
}));
module.exports = r;
