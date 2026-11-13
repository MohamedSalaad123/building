import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { ShoppingCart, Package, TrendingUp, Coins, AlertTriangle, CheckCircle2, Truck, FileText, Plus, Building2, ArrowUp, DollarSign } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Badge, useLoad, Spinner, pname } from '../components/ui';

const Kpi = ({ cls, icon: I, label, value, sub, delta }: any) => (
  <div className={`rounded-xl p-4 text-white shadow flex items-center gap-4 ${cls}`}>
    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0"><I size={28} /></div>
    <div className="min-w-0 flex-1"><div className="text-sm opacity-90">{label}</div><div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs mt-1 text-right opacity-90">{delta != null && <span className="font-bold mr-1"><ArrowUp size={12} className="inline" />{delta}%</span>}{sub}</div></div>
  </div>);
const Mini = ({ label, value }: any) => <div className="card !p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-lg font-bold">{value}</div></div>;

export default function Dashboard() {
  const { t, lang } = useI18n(); const [days, setDays] = useState(7);
  const { data: d } = useLoad<any>(() => api.get('/dashboard', { params: { days } }).then(r => r.data), [days]);
  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.top.map((x: any) => x.revenue));
  const fin = [[t('totalRevenue'), d.fin.revenue, DollarSign, 'text-green-600'], [t('cogs'), d.fin.cogs, ShoppingCart, 'text-blue-600'], [t('grossProfit'), d.fin.gross, TrendingUp, 'text-indigo-600'], [t('totalExpenses'), d.fin.expenses, Coins, 'text-orange-500'], [t('netProfit'), d.fin.net, TrendingUp, 'text-green-700']];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi cls="bg-gradient-to-br from-blue-600 to-blue-500" icon={ShoppingCart} label={t('totalSalesToday')} value={money(d.salesToday)} delta={d.salesChange} sub={t('vsYesterday')} />
        <Kpi cls="bg-gradient-to-br from-green-600 to-green-500" icon={Package} label={t('totalPurchases')} value={money(d.purchasesMonth)} sub={t('thisMonth')} />
        <Kpi cls="bg-gradient-to-br from-navy-800 to-navy-700" icon={TrendingUp} label={t('totalProfit')} value={money(d.profit)} sub={t('thisMonth')} />
        <Kpi cls="bg-gradient-to-br from-orange-500 to-amber-500" icon={Coins} label={t('totalExpenses')} value={money(d.expensesMonth)} sub={t('thisMonth')} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label={t('inventoryValue')} value={money(d.inventoryValue)} /><Mini label={t('totalProducts')} value={d.productCount} />
        <Mini label={t('customerDebts')} value={money(d.receivables)} /><Mini label={t('supplierPayables')} value={money(d.payables)} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card xl:col-span-3">
          <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-lg">{t('salesOverview')}</h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg text-xs">{[[7, 'days7'], [30, 'days30'], [365, 'months12']].map(([v, k]: any) => <button key={v} onClick={() => setDays(v)} className={`px-3 py-1.5 rounded-lg ${days === v ? 'bg-blue-600 text-white' : ''}`}>{t(k)}</button>)}</div></div>
          <div className="h-64"><ResponsiveContainer><LineChart data={d.chart}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
            <Line type="monotone" dataKey="sales" name={t('sales')} stroke="#2563eb" strokeWidth={2} /><Line type="monotone" dataKey="profit" name={t('profit')} stroke="#16a34a" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="card xl:col-span-1"><div className="flex justify-between mb-2"><h3 className="font-bold">{t('topSelling')}</h3><Link to="/reports" className="text-blue-600 text-xs">{t('viewAll')} →</Link></div>
          <div className="space-y-3">{d.top.length === 0 && <div className="text-sm text-slate-400">{t('noData')}</div>}{d.top.map((x: any, i: number) => (
            <div key={i}><div className="flex justify-between text-sm"><span className="font-medium truncate">{pname(x, lang)}</span><span className="font-bold">{money(x.revenue)}</span></div>
              <div className="text-xs text-slate-500">{x.qty} {x.unit}</div><div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded"><div className="h-1.5 bg-blue-500 rounded" style={{ width: (x.revenue / max * 100) + '%' }} /></div></div>))}</div></div>
        <div className="card xl:col-span-1"><div className="flex justify-between mb-2"><h3 className="font-bold">{t('stockAlerts')}</h3><Link to="/inventory" className="text-blue-600 text-xs">{t('viewAll')} →</Link></div>
          <div className="space-y-3">{d.alerts.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2">{a.level === 'ok' ? <CheckCircle2 className="text-green-500" /> : <AlertTriangle className={a.level === 'low' ? 'text-red-500' : 'text-amber-500'} />}
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{pname(a, lang)}</div><div className="text-xs text-slate-500">{a.level === 'ok' ? t('stockOk') : `${a.stock} ${t('onlyLeft')}`}</div></div><Badge v={a.level} /></div>))}</div></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card xl:col-span-3 overflow-x-auto"><h3 className="font-bold text-lg mb-2">{t('recentSales')}</h3>
          <table className="tbl"><thead><tr><th>{t('invoiceNo')}</th><th>{t('customer')}</th><th>{t('amount')}</th><th>{t('date')}</th><th>{t('status')}</th></tr></thead>
            <tbody>{d.recentSales.map((s: any) => <tr key={s.id}><td>{s.invoiceNo}</td><td>{s.customer?.fullName || t('walkIn')}</td><td>{money(s.total)}</td><td>{fdate(s.createdAt)}</td><td><Badge v={s.status} /></td></tr>)}</tbody></table></div>
        <div className="card xl:col-span-2"><div className="flex justify-between"><h3 className="font-bold text-lg">{t('financialSummary')}</h3><Link to="/reports" className="text-blue-600 text-xs">{t('viewReports')} →</Link></div>
          <div className="flex flex-wrap items-center gap-4 mt-2"><div className="flex-1 min-w-[180px] space-y-2 text-sm">{fin.map(([l, v, I, c]: any, i) => <div key={i} className="flex items-center justify-between"><span className="flex items-center gap-2"><I size={16} className={c} />{l}</span><b>{money(v)}</b></div>)}</div>
            <div className="relative w-36 h-36"><ResponsiveContainer><PieChart><Pie data={[{ v: Math.max(0, d.fin.margin) }, { v: Math.max(0, 100 - d.fin.margin) }]} dataKey="v" innerRadius={42} outerRadius={64} startAngle={90} endAngle={-270}><Cell fill="#16a34a" /><Cell fill="#bfdbfe" /></Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><b className="text-xl">{d.fin.margin}%</b><span className="text-[10px] text-slate-500">{t('profitMargin')}</span></div></div></div></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 rounded-xl p-6 text-white bg-gradient-to-r from-navy-900 to-blue-800 flex flex-wrap items-center justify-between gap-4">
          <div><h3 className="text-2xl font-extrabold text-amber-400">Construction Store Pro</h3><p className="font-semibold">{t('bannerSub')}</p>
            <ul className="text-sm mt-2 space-y-1"><li>✔ {t('trackInventory')}</li><li>✔ {t('manageSales')}</li><li>✔ {t('growBusiness')}</li></ul></div>
          <Link to="/pos" className="btn bg-amber-400 text-navy-900 font-bold hover:bg-amber-300">{t('getStarted')} →</Link></div>
        <div className="card xl:col-span-2"><h3 className="font-bold text-lg mb-2">{t('quickActions')}</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium">{[['/pos', ShoppingCart, 'newSale', 'bg-blue-50 text-blue-700'], ['/products', Plus, 'addProduct', 'bg-green-50 text-green-700'], ['/purchases', Truck, 'newPurchase', 'bg-indigo-50 text-indigo-700'], ['/reports', FileText, 'viewReports', 'bg-amber-50 text-amber-700']].map(([to, I, k, c]: any) => (
            <Link key={to} to={to} className={`rounded-xl p-3 flex flex-col items-center gap-1 ${c}`}><I size={26} />{t(k)}</Link>))}</div></div>
      </div>
    </div>);
}
