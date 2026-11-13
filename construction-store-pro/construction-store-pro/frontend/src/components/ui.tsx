import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { errMsg } from '../api';

export const money = (n: any) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fdate = (d: any) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const pname = (p: any, lang: string) => (lang === 'so' ? p?.nameSo : p?.nameEn) || p?.nameEn || '';
export const METHODS = ['CASH_USD', 'CASH_SOS', 'EVC_PLUS', 'ZAAD', 'SAHAL', 'BANK_TRANSFER'];

export function useLoad<T = any>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null); const [loading, setL] = useState(true);
  const load = () => { setL(true); fn().then(setData).catch(() => {}).finally(() => setL(false)); };
  useEffect(load, deps);
  return { data, loading, reload: load };
}
export const Spinner = () => <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
      <div className={`card w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-auto`}>
        <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block text-sm"><span className="block mb-1 text-slate-500 dark:text-slate-400">{label}</span>{children}</label>;
export function Pager({ page, total, size = 20, onPage }: any) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (<div className="flex items-center justify-between mt-3 text-sm"><span className="text-slate-500">{total}</span>
    <div className="flex gap-2 items-center"><button className="btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button><span>{page}/{pages}</span><button className="btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button></div></div>);
}
const BC: any = { COMPLETED: 'bg-green-100 text-green-700', PAID: 'bg-green-100 text-green-700', PARTIAL: 'bg-amber-100 text-amber-700', CREDIT: 'bg-blue-100 text-blue-700', UNPAID: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-200 text-slate-600', low: 'bg-red-100 text-red-600', warning: 'bg-amber-100 text-amber-700', ok: 'bg-green-100 text-green-700' };
export function Badge({ v }: { v: string }) { const { t } = useI18n(); return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BC[v] || 'bg-slate-100'}`}>{t(v)}</span>; }

const TCtx = createContext<any>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [m, setM] = useState<any>(null);
  const show = (text: string, err = false) => { setM({ text, err }); setTimeout(() => setM(null), 3500); };
  return (<TCtx.Provider value={{ ok: (x: string) => show(x), err: (e: any) => show(errMsg(e), true) }}>{children}
    {m && <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${m.err ? 'bg-red-600' : 'bg-green-600'}`}>{m.text}</div>}</TCtx.Provider>);
}
export const useToast = () => useContext(TCtx);
