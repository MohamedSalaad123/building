const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth');
const { wrap, page, HttpError } = require('../utils/http'); const audit = require('../utils/audit');
const stockMap = async ids => { const g = await db.inventory.groupBy({ by: ['productId'], where: ids ? { productId: { in: ids } } : {}, _sum: { quantity: true } }); return new Map(g.map(x => [x.productId, Number(x._sum.quantity || 0)])); };
r.get('/alerts', wrap(async (q, s) => { const ps = await db.product.findMany({ where: { isActive: true } }); const m = await stockMap(); s.json({ low: ps.filter(p => (m.get(p.id) || 0) <= Number(p.minStock)).length }); }));
r.get('/', can('product.view'), wrap(async (q, s) => {
  const { skip, take } = page(q.query); const { search, categoryId } = q.query; const where = { isActive: true };
  if (categoryId) where.categoryId = +categoryId;
  if (search) where.OR = [{ nameEn: { contains: search } }, { nameSo: { contains: search } }, { sku: { contains: search } }, { barcode: { contains: search } }];
  const [rows, total] = await Promise.all([db.product.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { category: true, unit: true } }), db.product.count({ where })]);
  const m = await stockMap(rows.map(x => x.id));
  s.json({ total, rows: rows.map(p => ({ ...p, stock: m.get(p.id) || 0 })) });
}));
r.post('/', can('product.manage'), wrap(async (q, s) => {
  const b = q.body; if (!b.nameEn || !b.nameSo || !b.categoryId || !b.unitId) throw new HttpError(400, 'Missing required fields');
  const p = await db.$transaction(async tx => {
    const last = await tx.product.findFirst({ orderBy: { id: 'desc' } });
    const sku = b.sku || 'PRD-' + String((last?.id || 0) + 1).padStart(5, '0');
    const pr = await tx.product.create({ data: { sku, barcode: b.barcode || null, nameSo: b.nameSo, nameEn: b.nameEn, categoryId: +b.categoryId, unitId: +b.unitId, brand: b.brand || null, purchasePrice: +b.purchasePrice || 0, avgCost: +b.purchasePrice || 0, sellingPrice: +b.sellingPrice || 0, wholesalePrice: +b.wholesalePrice || 0, minStock: +b.minStock || 0, imageUrl: b.imageUrl || null, description: b.description || null } });
    const qty = +b.stock || 0;
    await tx.inventory.create({ data: { productId: pr.id, warehouseId: 1, quantity: qty } });
    if (qty > 0) await tx.stockMovement.create({ data: { productId: pr.id, warehouseId: 1, type: 'STOCK_IN', quantity: qty, unitCost: pr.avgCost, reference: 'OPEN-' + sku, notes: 'Opening stock', userId: q.user.id } });
    await audit(tx, q.user.id, 'PRODUCT_CREATED', 'Product', pr.id, { sku }); return pr;
  });
  s.status(201).json(p);
}));
r.put('/:id', can('product.manage'), wrap(async (q, s) => {
  const b = q.body, d = {};
  ['nameSo', 'nameEn'].forEach(k => { if (b[k]) d[k] = b[k]; });
  ['brand', 'description', 'imageUrl', 'barcode'].forEach(k => { if (k in b) d[k] = b[k] || null; });
  ['purchasePrice', 'sellingPrice', 'wholesalePrice', 'minStock'].forEach(k => { if (k in b) d[k] = +b[k] || 0; });
  ['categoryId', 'unitId'].forEach(k => { if (b[k]) d[k] = +b[k]; });
  if (b.sku) d.sku = b.sku;
  const p = await db.product.update({ where: { id: +q.params.id }, data: d });
  await audit(db, q.user.id, 'PRODUCT_UPDATED', 'Product', p.id, { fields: Object.keys(d) }); s.json(p);
}));
r.delete('/:id', can('product.manage'), wrap(async (q, s) => { await db.product.update({ where: { id: +q.params.id }, data: { isActive: false } }); await audit(db, q.user.id, 'PRODUCT_DEACTIVATED', 'Product', q.params.id); s.json({ ok: true }); }));
module.exports = r;
