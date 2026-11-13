const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, HttpError } = require('../utils/http'); const audit = require('../utils/audit');
const SIGN = { STOCK_IN: 1, RETURN_IN: 1, STOCK_OUT: -1, DAMAGED: -1, ADJUSTMENT: 0 };
r.get('/movements', can('inventory.manage'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const where = q.query.productId ? { productId: +q.query.productId } : {};
  const [rows, total] = await Promise.all([db.stockMovement.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { product: { select: { nameEn: true, nameSo: true, sku: true } }, user: { select: { fullName: true } } } }), db.stockMovement.count({ where })]);
  s.json({ total, rows });
}));
r.post('/movements', can('inventory.manage'), wrap(async (q, s) => {
  const b = q.body, type = b.type, productId = +b.productId;
  if (!(type in SIGN) || !productId) throw new HttpError(400, 'Invalid movement');
  const delta = type === 'ADJUSTMENT' ? +b.quantity : SIGN[type] * Math.abs(+b.quantity);
  if (!delta || isNaN(delta)) throw new HttpError(400, 'Invalid quantity');
  const key = { productId_warehouseId: { productId, warehouseId: 1 } };
  const mv = await db.$transaction(async tx => {
    await tx.inventory.upsert({ where: key, create: { productId, warehouseId: 1, quantity: 0 }, update: {} });
    if (delta < 0 && !(b.allowNegative && q.user.role === 'ADMIN')) {
      const u = await tx.inventory.updateMany({ where: { productId, warehouseId: 1, quantity: { gte: -delta } }, data: { quantity: { increment: delta } } });
      if (!u.count) throw new HttpError(400, 'Insufficient stock');
    } else await tx.inventory.update({ where: key, data: { quantity: { increment: delta } } });
    const m = await tx.stockMovement.create({ data: { productId, warehouseId: 1, type, quantity: delta, reference: b.reference || 'MOV-' + Date.now(), notes: b.notes || null, userId: q.user.id } });
    await audit(tx, q.user.id, 'STOCK_' + type, 'Product', productId, { delta }); return m;
  });
  s.status(201).json(mv);
}));
r.get('/valuation', can('inventory.manage', 'report.view'), wrap(async (q, s) => {
  const ps = await db.product.findMany({ where: { isActive: true } }); const g = await db.inventory.groupBy({ by: ['productId'], _sum: { quantity: true } });
  const m = new Map(g.map(x => [x.productId, Number(x._sum.quantity || 0)]));
  s.json({ value: +ps.reduce((a, p) => a + (m.get(p.id) || 0) * Number(p.avgCost), 0).toFixed(2) });
}));
module.exports = r;
