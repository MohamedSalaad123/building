require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { createSale } = require('../src/services/sales');

const PERMS = ['product.view', 'product.manage', 'inventory.manage', 'sale.create', 'sale.view', 'purchase.manage', 'customer.view', 'customer.manage', 'supplier.manage', 'expense.manage', 'report.view', 'user.manage', 'settings.manage'];
const ROLE_PERMS = {
  ADMIN: PERMS,
  MANAGER: PERMS.filter(p => !['user.manage', 'settings.manage'].includes(p)),
  CASHIER: ['product.view', 'sale.create', 'sale.view', 'customer.view'],
};
const CATS = [['Sibidh', 'Cement'], ['Bir iyo Birta', 'Steel and Iron'], ['Ciid iyo Dhagax', 'Sand and Gravel'], ['Rinji', 'Paint'], ['Tuubooyin', 'Plumbing Materials'], ['Korontada', 'Electrical Materials'], ['Taayalo', 'Tiles and Ceramics'], ['Saqafka', 'Roofing Materials'], ['Alwaax', 'Wood and Timber'], ['Qalab', 'Tools and Equipment']];
const UNITS = [['Xabbo', 'Piece', 'pc'], ['Kiish', 'Bag', 'bag'], ['Kartoon', 'Box', 'box'], ['Mitir', 'Meter', 'm'], ['Mitir laba jibbaaran', 'Square Meter', 'm2'], ['Mitir saddex jibbaaran', 'Cubic Meter', 'm3'], ['Kiilo', 'Kilogram', 'kg'], ['Tan', 'Ton', 't'], ['Litir', 'Liter', 'L'], ['Duub', 'Roll', 'roll']];
const EXP = [['Kiro', 'Rent'], ['Mushaharka shaqaalaha', 'Employee Salaries'], ['Korontada', 'Electricity'], ['Gaadiid', 'Transportation'], ['Gaarsiin', 'Delivery'], ['Dayactir', 'Maintenance'], ['Internet', 'Internet'], ['Kale', 'Other Expenses']];
// nameSo, nameEn, catIdx(1-based), unitIdx(1-based), cost, sell, wholesale, stock, min
const PRODUCTS = [
  ['Sibidh Dangote 50kg', 'Cement Dangote 50kg', 1, 2, 7.5, 9, 8.5, 400, 50],
  ['Bir 12mm', 'Iron Rod 12mm', 2, 1, 7.2, 9, 8.5, 350, 40],
  ['Rinji 20L', 'Paint 20L', 4, 1, 9, 11, 10.5, 30, 15],
  ['Tuubo PVC 4 inji', 'PVC Pipe 4in', 5, 1, 8, 10, 9.5, 220, 30],
  ['Taayalo 60x60', 'Tiles 60x60', 7, 3, 8.5, 10.5, 10, 200, 30],
  ['Ciid', 'Sand', 3, 6, 18, 25, 22, 80, 20],
  ['Dhagaxyo', 'Gravel', 3, 6, 20, 28, 25, 60, 20],
  ['Alwaax 2x4', 'Timber 2x4', 9, 1, 3, 4.5, 4, 300, 50],
  ['Bir-saqaf', 'Roofing Sheet', 8, 1, 6, 8, 7.5, 150, 40],
  ['Fiilo korontada 2.5mm', 'Electric Cable 2.5mm', 6, 10, 28, 35, 33, 40, 10],
  ['Dubbe', 'Hammer', 10, 1, 4, 6, 5.5, 25, 5],
  ['Rinji gudcur 4L', 'Paint 4L', 4, 1, 4, 5.5, 5, 18, 15],
];

(async () => {
  console.log('Seeding...');
  for (const c of PERMS) await db.permission.upsert({ where: { code: c }, create: { code: c }, update: {} });
  const perms = await db.permission.findMany();
  for (const [name, list] of Object.entries(ROLE_PERMS)) {
    const role = await db.role.upsert({ where: { name }, create: { name }, update: {} });
    for (const p of perms.filter(p => list.includes(p.code)))
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, create: { roleId: role.id, permissionId: p.id }, update: {} });
  }
  const roles = Object.fromEntries((await db.role.findMany()).map(r => [r.name, r.id]));
  const users = [['Mohamed Ali', 'admin', 'admin123', 'ADMIN'], ['Hodan Warsame', 'manager', 'manager123', 'MANAGER'], ['Abdi Cashier', 'cashier', 'cashier123', 'CASHIER']];
  for (const [fullName, username, pw, role] of users)
    await db.user.upsert({ where: { username }, create: { fullName, username, passwordHash: await bcrypt.hash(pw, 10), roleId: roles[role] }, update: {} });
  const admin = await db.user.findUnique({ where: { username: 'admin' } });
  const cashier = await db.user.findUnique({ where: { username: 'cashier' } });

  if (await db.product.count()) { console.log('Demo data already exists - done.'); return; }
  await db.warehouse.create({ data: { id: 1, name: 'Main Warehouse', location: 'Muqdisho' } });
  for (const [nameSo, nameEn] of CATS) await db.category.create({ data: { nameSo, nameEn } });
  for (const [nameSo, nameEn, symbol] of UNITS) await db.unit.create({ data: { nameSo, nameEn, symbol } });
  for (const [nameSo, nameEn] of EXP) await db.expenseCategory.create({ data: { nameSo, nameEn } });
  await db.exchangeRate.create({ data: { sosPerUsd: 570, effectiveOn: new Date() } });
  for (const [key, value] of Object.entries({ storeName: 'Construction Store Pro', tagline: 'Build Better Together', address: 'Muqdisho, Soomaaliya', phone: '+252 61 0000000', taxPercent: '0', defaultCurrency: 'USD' }))
    await db.systemSetting.create({ data: { key, value } });

  let i = 0;
  for (const [nameSo, nameEn, c, u, cost, sell, wh, stock, min] of PRODUCTS) {
    i++;
    const p = await db.product.create({ data: { sku: 'PRD-' + String(i).padStart(5, '0'), barcode: '60010' + String(i).padStart(5, '0'), nameSo, nameEn, categoryId: c, unitId: u, purchasePrice: cost, avgCost: cost, sellingPrice: sell, wholesalePrice: wh, minStock: min } });
    await db.inventory.create({ data: { productId: p.id, warehouseId: 1, quantity: stock } });
    await db.stockMovement.create({ data: { productId: p.id, warehouseId: 1, type: 'STOCK_IN', quantity: stock, unitCost: cost, reference: 'OPEN-' + p.sku, notes: 'Opening stock', userId: admin.id } });
  }
  const cust = [];
  for (const [fullName, phone] of [['Ahmed Hassan', '615000001'], ['Fatima Nur', '615000002'], ['Abdirahman Ali', '615000003'], ['Saado Mohamed', '615000004']])
    cust.push(await db.customer.create({ data: { fullName, phone, address: 'Muqdisho' } }));
  await db.supplier.create({ data: { name: 'Dangote Somalia', phone: '612000001', company: 'Dangote Cement' } });
  await db.supplier.create({ data: { name: 'Bakaara Hardware', phone: '612000002', company: 'Bakaara Trading' } });

  // demo sales over the last 7 days (through the real service -> stock & profit are consistent)
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const prods = await db.product.findMany();
  for (let d = 6; d >= 0; d--) for (let k = 0; k < 3; k++) {
    const at = new Date(Date.now() - d * 864e5 - k * 36e5);
    const items = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({ productId: prods[Math.floor(rnd() * prods.length)].id, quantity: 1 + Math.floor(rnd() * 6) }));
    const total = items.reduce((a, it) => a + it.quantity * Number(prods.find(p => p.id === it.productId).sellingPrice), 0);
    const credit = k === 2 && d % 2 === 0;
    try {
      await createSale(cashier.id, { idempotencyKey: `seed-${d}-${k}`, customerId: cust[Math.floor(rnd() * 4)].id, items, payments: [{ method: ['CASH_USD', 'EVC_PLUS', 'ZAAD'][k], currency: 'USD', amount: credit ? +(total * 0.4).toFixed(2) : total }] }, { createdAt: at });
    } catch (e) { console.log('skip demo sale:', e.message); }
  }
  const cats = await db.expenseCategory.findMany();
  for (const [ci, amt] of [[0, 300], [2, 80], [3, 60], [6, 30]]) await db.expense.create({ data: { categoryId: cats[ci].id, userId: admin.id, amountUsd: amt, method: 'CASH_USD' } });
  console.log('Done. Logins: admin/admin123, manager/manager123, cashier/cashier123');
})().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
