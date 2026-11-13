import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Boxes, ShoppingCart, Truck, Users, Building2, Wallet, FileText, Search, Bell, Moon, LogOut, Menu, Calendar, HardHat } from 'lucide-react';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import api from '../api';

const NAV: any[] = [
  ['/', 'dashboard', LayoutDashboard, 'report.view'], ['/products', 'products', Package, 'product.view'], ['/inventory', 'inventory', Boxes, 'inventory.manage'],
  ['/pos', 'salesPos', ShoppingCart, 'sale.create'], ['/purchases', 'purchases', Truck, 'purchase.manage'], ['/customers', 'customers', Users, 'customer.view'],
  ['/suppliers', 'suppliers', Building2, 'supplier.manage'], ['/expenses', 'expenses', Wallet, 'expense.manage'], ['/reports', 'reports', FileText, 'report.view'],
];
export default function Layout() {
  const { user, logout, can } = useAuth(); const { t, lang, setLang } = useI18n(); const nav = useNavigate();
  const [open, setOpen] = useState(false); const [dark, setDark] = useState(localStorage.getItem('dark') === '1');
  const [now, setNow] = useState(new Date()); const [low, setLow] = useState(0); const [q, setQ] = useState(''); const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000);
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener('keydown', k);
    api.get('/products/alerts').then(r => setLow(r.data.low)).catch(() => {});
    return () => { clearInterval(i); window.removeEventListener('keydown', k); };
  }, []);
  const side = (
    <div className="h-full flex flex-col bg-navy-800 text-white w-64">
      <div className="p-5 border-b border-white/10"><div className="flex items-center gap-2"><HardHat className="text-amber-400" size={30} /><div className="text-xl font-extrabold leading-tight">Construction<br />Store <span className="text-amber-400">Pro</span></div></div><div className="text-xs text-slate-300 mt-1">{t('welcome')}</div></div>
      <nav className="flex-1 overflow-auto py-2">
        {NAV.filter(n => can(n[3])).map(([to, key, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-5 py-3 text-sm border-l-4 ${isActive ? 'bg-blue-600 border-amber-400 font-semibold' : 'border-transparent text-slate-200 hover:bg-white/10'}`}>
            <Icon size={20} />{t(key)}
          </NavLink>))}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-3">
        <label className="flex items-center justify-between text-sm cursor-pointer"><span className="flex items-center gap-2"><Moon size={18} />{t('darkMode')}</span>
          <input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} className="w-9 h-5 accent-blue-500" /></label>
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">{user.name[0]}</div><div className="text-sm"><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-300">{user.role}</div></div></div>
        <button onClick={() => { logout(); nav('/'); }} className="w-full btn bg-red-700 hover:bg-red-800 text-white"><LogOut size={16} />{t('logout')}</button>
      </div>
    </div>);
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">{side}</aside>
      {open && <div className="lg:hidden fixed inset-0 z-40 flex"><div>{side}</div><div className="flex-1 bg-black/50" onClick={() => setOpen(false)} /></div>}
      <div className="flex-1 lg:ml-64 min-w-0">
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-3 flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
          <form className="flex-1 max-w-xl relative" onSubmit={e => { e.preventDefault(); nav('/products?search=' + encodeURIComponent(q)); }}>
            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" /><input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')} className="input pl-10" />
          </form>
          <div className="flex-1" />
          <button className="relative" onClick={() => nav('/reports')}><Bell />{low > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{low}</span>}</button>
          <select value={lang} onChange={e => setLang(e.target.value)} className="input !w-auto" aria-label={t('lang')}><option value="so">Soomaali</option><option value="en">English</option></select>
          <div className="hidden md:flex items-center gap-2 text-xs"><Calendar size={18} /><div>{now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}<br />{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
        </header>
        <main className="p-3 sm:p-6"><Outlet /></main>
      </div>
    </div>);
}
