const test = require('node:test'); const assert = require('node:assert');
const { computeTotals, saleStatus, toUsd } = require('../src/utils/money');
test('totals & cogs', () => { const t = computeTotals([{ quantity: 2, unitPrice: 10, discount: 1, unitCost: 6 }], 2); assert.equal(t.subtotal, 19); assert.equal(t.total, 17); assert.equal(t.cogs, 12); });
test('sale status: debt is not cash', () => { assert.equal(saleStatus(100, 100), 'COMPLETED'); assert.equal(saleStatus(100, 40), 'PARTIAL'); assert.equal(saleStatus(100, 0), 'CREDIT'); });
test('SOS conversion', () => assert.equal(toUsd(5700, 'SOS', 570), 10));
