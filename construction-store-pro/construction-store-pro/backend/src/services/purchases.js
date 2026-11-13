const db = require('../db');
const { HttpError } = require('../utils/http');
const { payStatus, r2 } = require('../utils/money');
const audit = require('../utils/audit');

async function createPurchase(userId, b, opts = {}) {
  const { supplierId, items, payments = [], supplierInvoiceNo } = b;
  if (!supplierId || !Array.isArray(items) || !items.length) throw new HttpError(400, 'Supplier and items required');
  const at = opts.createdAt || new Date();
  return db.$transaction(async tx => {
    let total = 0; const rows = [];
    for (const it of items) {
      const qty = Number(it.quantity), cost = Number(it.unitCost);
      if (!(qty > 0) || !(cost >= 0)) throw new HttpError(400, 'Invalid item');
      const p = await tx.product.findUnique({ where: { id: +it.productId } });
      if (!p) throw new HttpError(400, 'Product not found');
      const agg = await tx.inventory.aggregate({ where: { productId: p.id }, _sum: { quantity: true } });
      const oldQty = Math.max(0, Number(agg._sum.quantity || 0));
      const avg = (oldQty * Number(p.avgCost) + qty * cost) / (oldQty + qty); // weighted average cost
      await tx.product.update({ where: { id: p.id }, data: { avgCost: avg, purchasePrice: cost } });
      await tx.inventory.upsert({ where: { productId_warehouseId: { productId: p.id, warehouseId: 1 } }, create: { productId: p.id, warehouseId: 1, quantity: qty }, update: { quantity: { increment: qty } } });
      const lineTotal = r2(qty * cost); total += lineTotal;
      rows.push({ productId: p.id, quantity: qty, receivedQty: qty, unitCost: cost, lineTotal });
    }
    total = r2(total);
    const pays = payments.filter(p => Number(p.amountUsd) > 0);
    const paid = pays.reduce((a, p) => a + Number(p.amountUsd), 0);
    if (paid > total + 0.01) throw new HttpError(400, 'Payment exceeds total');
    const po = await tx.purchase.create({ data: { poNumber: 'TMP-' + Date.now() + Math.random(), supplierInvoiceNo: supplierInvoiceNo || null, supplierId: +supplierId, userId, status: 'RECEIVED', payStatus: payStatus(total, paid), total, amountPaid: Math.min(paid, total), createdAt: at,
      items: { create: rows }, payments: { create: pays.map(p => ({ method: p.method, amountUsd: Number(p.amountUsd), createdAt: at })) } } });
    const poNumber = 'PO-' + String(po.id).padStart(6, '0');
    await tx.purchase.update({ where: { id: po.id }, data: { poNumber } });
    await tx.stockMovement.createMany({ data: rows.map(r => ({ productId: r.productId, warehouseId: 1, type: 'PURCHASE', quantity: r.quantity, unitCost: r.unitCost, reference: poNumber, userId, createdAt: at })) });
    await audit(tx, userId, 'PURCHASE_CREATED', 'Purchase', po.id, { poNumber, total });
    return { ...po, poNumber };
  });
}

async function addPurchasePayment(id, userId, b) {
  return db.$transaction(async tx => {
    const p = await tx.purchase.findUnique({ where: { id } });
    if (!p) throw new HttpError(404, 'Not found');
    const amt = Number(b.amountUsd);
    if (!(amt > 0) || amt > Number(p.total) - Number(p.amountPaid) + 0.01) throw new HttpError(400, 'Invalid amount');
    await tx.purchasePayment.create({ data: { purchaseId: id, method: b.method, amountUsd: amt } });
    const paid = Number(p.amountPaid) + amt;
    const u = await tx.purchase.update({ where: { id }, data: { amountPaid: Math.min(paid, Number(p.total)), payStatus: payStatus(Number(p.total), paid) } });
    await audit(tx, userId, 'PURCHASE_PAYMENT', 'Purchase', id, { amt });
    return u;
  });
}
module.exports = { createPurchase, addPurchasePayment };
