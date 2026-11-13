const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth'); const { wrap, range, HttpError } = require('../utils/http');
const N = x => Number(x || 0), f2 = n => +N(n).toFixed(2), D = d => new Date(d).toISOString().slice(0, 16).replace('T', ' ');
const col = (...k) => k.map(key => ({ key }));
r.get('/:type', can('report.view'), wrap(async (q, s) => {
  const rg = range(q.query), ok = { status: { not: 'CANCELLED' } }, t = q.params.type;
  const stockOf = async () => { const g = await db.inventory.groupBy({ by: ['productId'], _sum: { quantity: true } }); return new Map(g.map(x => [x.productId, N(x._sum.quantity)])); };
  if (t === 'sales') { const rows = await db.sale.findMany({ where: { ...ok, ...(rg && { createdAt: rg }) }, include: { customer: true, payments: true }, orderBy: { id: 'desc' } });
    const method = q.query.method; const list = rows.filter(x => !method || x.payments.some(p => p.method === method));
    return s.json({ columns: col('invoiceNo', 'date', 'customer', 'total', 'paid', 'balance', 'status'), rows: list.map(x => ({ invoiceNo: x.invoiceNo, date: D(x.createdAt), customer: x.customer?.fullName || '-', total: f2(x.total), paid: f2(x.amountPaid), balance: f2(N(x.total) - N(x.amountPaid)), status: x.status })), summary: { total: f2(list.reduce((a, x) => a + N(x.total), 0)) } }); }
  if (t === 'purchases') { const rows = await db.purchase.findMany({ where: rg ? { createdAt: rg } : {}, include: { supplier: true }, orderBy: { id: 'desc' } });
    return s.json({ columns: col('poNumber', 'date', 'supplier', 'total', 'paid', 'balance'), rows: rows.map(x => ({ poNumber: x.poNumber, date: D(x.createdAt), supplier: x.supplier.name, total: f2(x.total), paid: f2(x.amountPaid), balance: f2(N(x.total) - N(x.amountPaid)) })), summary: { total: f2(rows.reduce((a, x) => a + N(x.total), 0)) } }); }
  if (t === 'inventory' || t === 'lowStock') { const m = await stockOf(); const ps = await db.product.findMany({ where: { isActive: true }, include: { category: true } });
    let rows = ps.map(p => ({ sku: p.sku, name: p.nameEn, category: p.category.nameEn, stock: m.get(p.id) || 0, minStock: N(p.minStock), cost: f2(p.avgCost), value: f2((m.get(p.id) || 0) * N(p.avgCost)) }));
    if (t === 'lowStock') rows = rows.filter(x => x.stock <= x.minStock);
    return s.json({ columns: col('sku', 'name', 'category', 'stock', 'minStock', 'cost', 'value'), rows, summary: { value: f2(rows.reduce((a, x) => a + x.value, 0)) } }); }
  if (t === 'expenses') { const rows = await db.expense.findMany({ where: rg ? { spentAt: rg } : {}, include: { category: true }, orderBy: { spentAt: 'desc' } });
    return s.json({ columns: col('date', 'category', 'amount', 'notes'), rows: rows.map(x => ({ date: D(x.spentAt), category: x.category.nameEn, amount: f2(x.amountUsd), notes: x.notes || '' })), summary: { total: f2(rows.reduce((a, x) => a + N(x.amountUsd), 0)) } }); }
  if (t === 'customerDebts') { const rows = await db.sale.findMany({ where: { ...ok, status: { in: ['PARTIAL', 'CREDIT'] } }, include: { customer: true }, orderBy: { id: 'desc' } });
    return s.json({ columns: col('customer', 'invoiceNo', 'date', 'total', 'paid', 'balance'), rows: rows.map(x => ({ customer: x.customer?.fullName || '-', invoiceNo: x.invoiceNo, date: D(x.createdAt), total: f2(x.total), paid: f2(x.amountPaid), balance: f2(N(x.total) - N(x.amountPaid)) })), summary: { balance: f2(rows.reduce((a, x) => a + N(x.total) - N(x.amountPaid), 0)) } }); }
  if (t === 'supplierBalances') { const rows = await db.purchase.findMany({ where: { payStatus: { not: 'PAID' } }, include: { supplier: true } });
    return s.json({ columns: col('supplier', 'poNumber', 'date', 'total', 'paid', 'balance'), rows: rows.map(x => ({ supplier: x.supplier.name, poNumber: x.poNumber, date: D(x.createdAt), total: f2(x.total), paid: f2(x.amountPaid), balance: f2(N(x.total) - N(x.amountPaid)) })), summary: { balance: f2(rows.reduce((a, x) => a + N(x.total) - N(x.amountPaid), 0)) } }); }
  if (t === 'bestSelling') { const g = await db.saleItem.groupBy({ by: ['productId'], where: { sale: { ...ok, ...(rg && { createdAt: rg }) } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 20 });
    const ps = await db.product.findMany({ where: { id: { in: g.map(x => x.productId) } } }); const pm = new Map(ps.map(p => [p.id, p]));
    return s.json({ columns: col('sku', 'name', 'qty', 'revenue'), rows: g.map(x => ({ sku: pm.get(x.productId).sku, name: pm.get(x.productId).nameEn, qty: N(x._sum.quantity), revenue: f2(x._sum.lineTotal) })) }); }
  if (t === 'pnl') { const [a, e, eg, c] = await Promise.all([db.sale.aggregate({ where: { ...ok, ...(rg && { createdAt: rg }) }, _sum: { total: true, cogs: true, discount: true } }), db.expense.aggregate({ where: rg ? { spentAt: rg } : {}, _sum: { amountUsd: true } }),
      db.expense.groupBy({ by: ['categoryId'], where: rg ? { spentAt: rg } : {}, _sum: { amountUsd: true } }), db.expenseCategory.findMany()]);
    const cm = new Map(c.map(x => [x.id, x.nameEn])); const rev = N(a._sum.total), cogs = N(a._sum.cogs), ex = N(e._sum.amountUsd);
    return s.json({ columns: col('item', 'amount'), rows: [{ item: 'Revenue', amount: f2(rev) }, { item: 'Cost of Goods Sold', amount: f2(-cogs) }, { item: 'Gross Profit', amount: f2(rev - cogs) }, ...eg.map(x => ({ item: '  ' + cm.get(x.categoryId), amount: f2(-N(x._sum.amountUsd)) })), { item: 'Operating Expenses', amount: f2(-ex) }, { item: 'Net Profit', amount: f2(rev - cogs - ex) }] }); }
  throw new HttpError(404, 'Unknown report');
}));
module.exports = r;
