const db = require('../db');
const { HttpError } = require('../utils/http');
const { computeTotals, toUsd, saleStatus } = require('../utils/money');
const { getRate } = require('../utils/rate');
const audit = require('../utils/audit');

async function createSale(userId, body, opts = {}) {
  const { idempotencyKey, customerId, items, payments = [], discount = 0, currency = 'USD' } = body;
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Cart is empty');
  if (!idempotencyKey) throw new HttpError(400, 'idempotencyKey required');
  const dup = await db.sale.findUnique({ where: { idempotencyKey } });
  if (dup) return dup; // duplicate submit -> same sale
  const at = opts.createdAt || new Date();
  return db.$transaction(async tx => {
    const rate = await getRate(tx);
    const products = await tx.product.findMany({ where: { id: { in: items.map(i => +i.productId) }, isActive: true } });
    const pm = new Map(products.map(p => [p.id, p]));
    const lines = items.map(it => {
      const p = pm.get(+it.productId); const qty = Number(it.quantity);
      if (!p) throw new HttpError(400, 'Product not found');
      if (!(qty > 0)) throw new HttpError(400, 'Invalid quantity');
      return { productId: p.id, quantity: qty, unitPrice: it.unitPrice != null ? Number(it.unitPrice) : Number(p.sellingPrice), unitCost: Number(p.avgCost), discount: Number(it.discount || 0) };
    });
    const T = computeTotals(lines, Number(discount));
    const pays = payments.filter(p => Number(p.amount) > 0).map(p => ({ method: p.method, currency: p.currency || 'USD', amount: Number(p.amount), amountUsd: toUsd(p.amount, p.currency || 'USD', rate), exchangeRate: rate, createdAt: at }));
    const paid = pays.reduce((a, p) => a + p.amountUsd, 0);
    if (paid > T.total + 0.01) throw new HttpError(400, 'Payment exceeds total');
    const status = saleStatus(T.total, paid);
    if (status !== 'COMPLETED' && !customerId) throw new HttpError(400, 'Customer required for credit/partial sale');
    for (const l of T.lines) { // atomic stock decrement - never negative
      const u = await tx.inventory.updateMany({ where: { productId: l.productId, warehouseId: 1, quantity: { gte: l.quantity } }, data: { quantity: { decrement: l.quantity } } });
      if (!u.count) throw new HttpError(400, `Insufficient stock: ${pm.get(l.productId).nameEn}`);
    }
    const sale = await tx.sale.create({ data: {
      invoiceNo: 'TMP-' + String(idempotencyKey).slice(0, 100), idempotencyKey, customerId: customerId ? +customerId : null, cashierId: userId,
      currency, exchangeRate: rate, subtotal: T.subtotal, discount: Number(discount), total: T.total, cogs: T.cogs,
      amountPaid: Math.min(paid, T.total), status, createdAt: at,
      items: { create: T.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.unitCost, discount: l.discount, lineTotal: l.lineTotal })) },
      payments: { create: pays } } });
    const invoiceNo = 'INV-' + String(sale.id).padStart(6, '0');
    await tx.sale.update({ where: { id: sale.id }, data: { invoiceNo } });
    await tx.stockMovement.createMany({ data: T.lines.map(l => ({ productId: l.productId, warehouseId: 1, type: 'SALE', quantity: -l.quantity, unitCost: l.unitCost, reference: invoiceNo, userId, createdAt: at })) });
    await audit(tx, userId, 'SALE_CREATED', 'Sale', sale.id, { invoiceNo, total: T.total });
    return { ...sale, invoiceNo };
  });
}

async function addSalePayment(id, userId, b) {
  return db.$transaction(async tx => {
    const s = await tx.sale.findUnique({ where: { id } });
    if (!s || s.status === 'CANCELLED') throw new HttpError(404, 'Sale not found');
    const rate = await getRate(tx); const cur = b.currency || 'USD';
    const usd = toUsd(b.amount, cur, rate);
    if (!(usd > 0)) throw new HttpError(400, 'Invalid amount');
    if (usd > Number(s.total) - Number(s.amountPaid) + 0.01) throw new HttpError(400, 'Amount exceeds balance');
    await tx.salePayment.create({ data: { saleId: id, method: b.method, currency: cur, amount: Number(b.amount), amountUsd: usd, exchangeRate: rate } });
    const paid = Number(s.amountPaid) + usd;
    const u = await tx.sale.update({ where: { id }, data: { amountPaid: Math.min(paid, Number(s.total)), status: saleStatus(Number(s.total), paid) } });
    await audit(tx, userId, 'SALE_PAYMENT', 'Sale', id, { usd });
    return u;
  });
}
module.exports = { createSale, addSalePayment };
