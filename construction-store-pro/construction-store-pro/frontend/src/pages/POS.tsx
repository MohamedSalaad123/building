import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, Spinner, useToast, METHODS, pname } from '../components/ui';
import { InvoiceModal } from '../components/Invoice';

export default function POS() {
  const { t, lang } = useI18n(); const toast = useToast();
  const [q, setQ] = useState(''); const [prods, setProds] = useState<any[]>([]); const [cart, setCart] = useState<any[]>([]); const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState(''); const [discount, setDiscount] = useState<any>(0); const [pays, setPays] = useState<any[]>([{ method: 'CASH_USD', currency: 'USD', amount: '' }]);
  const [key, setKey] = useState(crypto.randomUUID()); const [rate, setRate] = useState(570); const [done, setDone] = useState<number | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const h = setTimeout(() => api.get('/products', { params: { search: q, pageSize: 24 } }).then(r => setProds(r.data.rows)), 250); return () => clearTimeout(h); }, [q]);
  useEffect(() => { api.get('/customers', { params: { pageSize: 500 } }).then(r => setCustomers(r.data.rows)).catch(() => {}); api.get('/settings').then(r => setRate(r.data.rate)); }, []);
  const add = (p: any) => setCart(c => { const i = c.findIndex(x => x.p.id === p.id); if (i >= 0) { const n = [...c]; n[i] = { ...n[i], quantity: n[i].quantity + 1 }; return n; } return [...c, { p, quantity: 1, unitPrice: Number(p.sellingPrice), discount: 0 }]; });
  const onEnter = (e: any) => { if (e.key !== 'Enter') return; const m = prods.find(p => p.barcode === q || p.sku === q) || (prods.length === 1 ? prods[0] : null); if (m) { add(m); setQ(''); } };
  const upd = (i: number, k: string, v: any) => setCart(c => c.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const subtotal = cart.reduce((a, x) => a + x.quantity * x.unitPrice - Number(x.discount || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const paid = pays.reduce((a, p) => a + (Number(p.amount) || 0) / (p.currency === 'SOS' ? rate : 1), 0);
  const bal = total - paid;
  const setPay = (i: number, k: string, v: any) => setPays(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const payFull = () => setPays(p => p.map((x, j) => j === 0 ? { ...x, amount: x.currency === 'SOS' ? +(total * rate).toFixed(0) : +total.toFixed(2) } : { ...x, amount: '' }));
  const submit = async () => {
    if (!cart.length) return toast.err({ message: t('emptyCart') });
    if (bal > 0.005 && !customerId) return toast.err({ message: t('creditNote') });
    setBusy(true);
    try {
      const { data } = await api.post('/sales', { idempotencyKey: key, customerId: customerId || null, discount: +discount || 0, items: cart.map(x => ({ productId: x.p.id, quantity: +x.quantity, unitPrice: +x.unitPrice, discount: +x.discount || 0 })), payments: pays.filter(p => +p.amount > 0) });
      setDone(data.id); setCart([]); setPays([{ method: 'CASH_USD', currency: 'USD', amount: '' }]); setDiscount(0); setCustomerId(''); setKey(crypto.randomUUID());
      api.get('/products', { params: { search: q, pageSize: 24 } }).then(r => setProds(r.data.rows));
    } catch (e) { toast.err(e); }
    setBusy(false);
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 card">
        <div className="flex gap-2 mb-3"><input autoFocus className="input" placeholder={t('searchPh').split('(')[0]} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onEnter} /><Link to="/sales" className="btn-ghost whitespace-nowrap">{t('salesHistory')}</Link></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{prods.map(p => (
          <button key={p.id} onClick={() => add(p)} disabled={p.stock <= 0} className="text-left border rounded-lg p-2 hover:border-blue-500 disabled:opacity-40 dark:border-slate-600">
            {p.imageUrl && <img src={p.imageUrl} className="w-full h-20 object-cover rounded mb-1" />}<div className="text-sm font-semibold leading-tight">{pname(p, lang)}</div>
            <div className="text-blue-600 font-bold">{money(p.sellingPrice)}</div><div className={`text-xs ${p.stock <= Number(p.minStock) ? 'text-red-600' : 'text-slate-500'}`}>{t('stock')}: {p.stock}</div></button>))}</div>
      </div>
      <div className="lg:col-span-2 card space-y-3 h-fit">
        <h3 className="font-bold text-lg">{t('cart')}</h3>
        {!cart.length && <div className="text-sm text-slate-400">{t('emptyCart')}</div>}
        {cart.map((x, i) => (<div key={i} className="flex items-center gap-2 text-sm"><div className="flex-1 min-w-0"><div className="font-medium truncate">{pname(x.p, lang)}</div><div className="text-xs text-slate-500">{money(x.unitPrice)}</div></div>
          <input type="number" min="0" step="any" className="input !w-20" value={x.quantity} onChange={e => upd(i, 'quantity', e.target.value)} />
          <div className="w-20 text-right font-semibold">{money(x.quantity * x.unitPrice - Number(x.discount || 0))}</div><button onClick={() => setCart(c => c.filter((_, j) => j !== i))}><Trash2 size={16} className="text-red-600" /></button></div>))}
        <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">{t('walkIn')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.fullName} {c.balance > 0 ? `(${money(c.balance)})` : ''}</option>)}</select>
        <div className="flex items-center gap-2 text-sm"><span className="w-24">{t('discount')} $</span><input type="number" step="any" className="input" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
        <div className="border-t pt-2 space-y-1 text-sm dark:border-slate-600"><div className="flex justify-between"><span>{t('subtotal')}</span><b>{money(subtotal)}</b></div><div className="flex justify-between text-lg"><span>{t('total')}</span><b>{money(total)}</b></div></div>
        <div className="space-y-2">{pays.map((p, i) => (<div key={i} className="flex gap-1">
          <select className="input" value={p.method} onChange={e => setPay(i, 'method', e.target.value)}>{METHODS.map(m => <option key={m} value={m}>{t(m)}</option>)}</select>
          <select className="input !w-20" value={p.currency} onChange={e => setPay(i, 'currency', e.target.value)}><option>USD</option><option>SOS</option></select>
          <input type="number" step="any" className="input" placeholder="0" value={p.amount} onChange={e => setPay(i, 'amount', e.target.value)} /></div>))}
          <div className="flex gap-2"><button className="btn-ghost text-xs" onClick={payFull}>{t('payFull')}</button><button className="btn-ghost text-xs" onClick={() => setPays(p => [...p, { method: 'EVC_PLUS', currency: 'USD', amount: '' }])}><Plus size={12} />{t('addPayment')}</button></div></div>
        <div className="flex justify-between text-sm"><span>{t('paid')}: <b>{money(paid)}</b></span><span className={bal > 0.005 ? 'text-red-600' : 'text-green-600'}>{t('remaining')}: <b>{money(Math.max(0, bal))}</b></span></div>
        <button className="btn-primary w-full !py-3" onClick={submit} disabled={busy}>{busy ? <Spinner /> : t('completeSale')}</button>
      </div>
      {done && <InvoiceModal id={done} onClose={() => setDone(null)} />}
    </div>);
}
