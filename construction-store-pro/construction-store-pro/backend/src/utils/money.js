const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const toUsd = (a, cur, rate) => cur === 'SOS' ? r2(a / rate) : r2(a);
const payStatus = (t, p) => p >= t - 0.005 ? 'PAID' : p > 0 ? 'PARTIAL' : 'UNPAID';
const saleStatus = (t, p) => p >= t - 0.005 ? 'COMPLETED' : p > 0 ? 'PARTIAL' : 'CREDIT';
function computeTotals(lines, discount = 0) {
  const L = lines.map(l => ({ ...l, lineTotal: r2(l.quantity * l.unitPrice - (l.discount || 0)) }));
  const subtotal = r2(L.reduce((a, l) => a + l.lineTotal, 0));
  const cogs = r2(L.reduce((a, l) => a + l.quantity * l.unitCost, 0));
  return { lines: L, subtotal, cogs, total: r2(Math.max(0, subtotal - discount)) };
}
module.exports = { r2, toUsd, saleStatus, payStatus, computeTotals };
