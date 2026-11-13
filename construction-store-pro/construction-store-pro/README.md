# Construction Store Pro

Nidaamka maamulka dukaanka alaabta dhismaha — Soomaali + English. / Construction materials store management (Somali + English).

**Stack:** React + TypeScript + Tailwind + Recharts (frontend) · Node.js + Express + Prisma + MySQL (backend) · JWT + RBAC.

## Rakibid / Install

Requirements: Node.js 18+ and MySQL 8.

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env          # edit DATABASE_URL + JWT_SECRET
npx prisma migrate dev --name init
npm run seed                  # demo data
npm run dev                   # http://localhost:4000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Create the MySQL database first: `CREATE DATABASE construction_store;`

## Logins (demo)
| Role | Username | Password |
|---|---|---|
| ADMIN | admin | admin123 |
| MANAGER | manager | manager123 |
| CASHIER | cashier | cashier123 |

**Beddel erayada sirta ah ka hor inta aadan isticmaalin!**

## Tijaabo / Tests
`cd backend && npm test` (money, profit and payment-status calculations)

## What is implemented
- Auth (JWT, bcrypt), role permissions on every API route, audit log
- Dashboard (KPIs, sales/profit chart, top products, stock alerts, financial summary)
- Products (bilingual names, SKU auto-generation, barcode field, image upload, deactivate)
- Inventory (stock in/out/adjust/damaged/returned, history, valuation, no negative stock unless admin allows)
- POS (search by name/SKU/barcode + Enter, discounts, partial & credit sales, USD/SOS, 6 payment methods, printable invoice, duplicate-submit protection)
- Purchases (stock increases automatically, weighted-average cost, supplier balances & payments)
- Customers / Suppliers (statements, debt payments)
- Expenses, Reports (9 reports, CSV/Excel export, print/PDF), Somali/English switch, dark mode, responsive, PWA manifest

## Accounting rules
- Profit = sales total − cost snapshot (`SaleItem.unitCost`) − expenses. Revenue is not profit.
- Credit sales are receivables, not cash. Purchases go to stock, not expenses.
- Each payment stores its USD/SOS exchange rate.

## Not yet included (next stages)
Users & Settings screens (API for settings exists), unit-conversion UI, stock transfers, sale/purchase returns UI, tax calculation, camera barcode scanning, server-side PDF/XLSX, DB backup/restore UI, extra tests.
Barcode: USB scanners work in POS search (they type the code + Enter).
