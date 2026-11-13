const r = require('express').Router();
const db = require('../db'); const { can } = require('../middleware/auth'); const { wrap } = require('../utils/http');
const N = x => Number(x || 0); const f2 = n => +Number(n || 0).toFixed(2);
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
r.get('/', can('report.view'), wrap(async (q, s) => {
  const now = new Date(), sd = new Date(now.getFullYear(), now.getMonth(), now.getDate()), sy = new Date(+sd - 864e5), sm = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = [7, 30, 365].includes(+q.query.days) ? +q.query.days : 7; const ok = { status: { not: 'CANCELLED' } };
  const sum = (m, w, f) => db[m].aggregate({ where: w, _sum: f });
  const [today, yest, mon, purM, expM, recv, pay, prods, inv, recent, recentP, topG] = await Promise.all([
    sum('sale', { ...ok, createdAt: { gte: sd } }, { total: true }), sum('sale', { ...ok, createdAt: { gte: sy, lt: sd } }, { total: true }),
    sum('sale', { ...ok, createdAt: { gte: sm } }, { total: true, cogs: true }), sum('purchase', { createdAt: { gte: sm } }, { total: true }),
    sum('expense', { spentAt: { gte: sm } }, { amountUsd: true }), db.sale.findMany({ where: { ...ok, status: { in: ['PARTIAL', 'CREDIT'] } }, select: { total: true, amountPaid: true } }),
    db.purchase.findMany({ where: { payStatus: { not: 'PAID' } }, select: { total: true, amountPaid: true } }),
    db.product.findMany({ where: { isActive: true }, include: { unit: true } }), db.inventory.groupBy({ by: ['productId'], _sum: { quantity: true } }),
    db.sale.findMany({ take: 5, orderBy: { id: 'desc' }, include: { customer: true } }), db.purchase.findMany({ take: 5, orderBy: { id: 'desc' }, include: { supplier: true } }),
    db.saleItem.groupBy({ by: ['productId'], where: { sale: { ...ok, createdAt: { gte: sm } } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 5 })]);
  const stock = new Map(inv.map(x => [x.productId, N(x._sum.quantity)]));
  const revenue = N(mon._sum.total), cogs = N(mon._sum.cogs), expenses = N(expM._sum.amountUsd), gross = revenue - cogs, net = gross - expenses;
  // chart
  const start = new Date(sd); start.setDate(start.getDate() - (days === 365 ? 364 : days - 1));
  const sales = await db.sale.findMany({ where: { ...ok, createdAt: { gte: days === 365 ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : start } }, select: { createdAt: true, total: true, cogs: true } });
  const buckets = new Map();
  if (days === 365) for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.set(key(d).slice(0, 7), { label: d.toLocaleString('en', { month: 'short' }), sales: 0, profit: 0 }); }
  else for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(d.getDate() + i); buckets.set(key(d), { label: days === 7 ? d.toLocaleString('en', { weekday: 'short' }) : key(d).slice(5), sales: 0, profit: 0 }); }
  sales.forEach(x => { const b = buckets.get(days === 365 ? key(x.createdAt).slice(0, 7) : key(x.createdAt)); if (b) { b.sales += N(x.total); b.profit += N(x.total) - N(x.cogs); } });
  const pm = new Map(prods.map(p => [p.id, p]));
  const alerts = prods.map(p => { const st = stock.get(p.id) || 0, mn = N(p.minStock); return { id: p.id, nameEn: p.nameEn, nameSo: p.nameSo, unit: p.unit.nameEn, stock: st, min: mn, level: st <= mn ? 'low' : st <= mn * 1.5 ? 'warning' : 'ok' }; });
  const order = { low: 0, warning: 1, ok: 2 };
  s.json({
    salesToday: f2(today._sum.total), salesChange: N(yest._sum.total) ? f2((N(today._sum.total) / N(yest._sum.total) - 1) * 100) : null,
    purchasesMonth: f2(purM._sum.total), profit: f2(net), expensesMonth: f2(expenses),
    fin: { revenue: f2(revenue), cogs: f2(cogs), gross: f2(gross), expenses: f2(expenses), net: f2(net), margin: revenue ? f2(net / revenue * 100) : 0 },
    chart: [...buckets.values()].map(b => ({ ...b, sales: f2(b.sales), profit: f2(b.profit) })),
    top: topG.map(x => ({ nameEn: pm.get(x.productId)?.nameEn, nameSo: pm.get(x.productId)?.nameSo, qty: N(x._sum.quantity), revenue: f2(x._sum.lineTotal), unit: pm.get(x.productId)?.unit.nameEn })),
    alerts: alerts.sort((a, b) => order[a.level] - order[b.level]).slice(0, 5), lowCount: alerts.filter(a => a.level === 'low').length,
    recentSales: recent, recentPurchases: recentP, productCount: prods.length,
    inventoryValue: f2(prods.reduce((a, p) => a + (stock.get(p.id) || 0) * N(p.avgCost), 0)),
    receivables: f2(recv.reduce((a, x) => a + N(x.total) - N(x.amountPaid), 0)), payables: f2(pay.reduce((a, x) => a + N(x.total) - N(x.amountPaid), 0))
  });
}));
module.exports = r;
