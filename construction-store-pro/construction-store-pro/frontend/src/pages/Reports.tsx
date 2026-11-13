import { useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import { Spinner, useToast, METHODS } from '../components/ui';

const TYPES = ['sales', 'purchases', 'inventory', 'lowStock', 'pnl', 'expenses', 'customerDebts', 'supplierBalances', 'bestSelling'];
export default function Reports() {
  const { t } = useI18n(); const toast = useToast();
  const [type, setType] = useState('sales'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [method, setMethod] = useState(''); const [d, setD] = useState<any>(null); const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setD((await api.get('/reports/' + type, { params: { from, to, method } })).data); } catch (e) { toast.err(e); } setBusy(false); };
  const csv = () => {
    const lines = [d.columns.map((c: any) => t(c.key)).join(','), ...d.rows.map((r: any) => d.columns.map((c: any) => JSON.stringify(r[c.key] ?? '')).join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv' })); a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 mb-3 items-end">
        <select className="input !w-56" value={type} onChange={e => { setType(e.target.value); setD(null); }}>{TYPES.map(x => <option key={x} value={x}>{t('r_' + x)}</option>)}</select>
        <input type="date" className="input !w-40" value={from} onChange={e => setFrom(e.target.value)} /><input type="date" className="input !w-40" value={to} onChange={e => setTo(e.target.value)} />
        {type === 'sales' && <select className="input !w-44" value={method} onChange={e => setMethod(e.target.value)}><option value="">{t('method')}</option>{METHODS.map(m => <option key={m} value={m}>{t(m)}</option>)}</select>}
        <button className="btn-primary" onClick={load}>{t('load')}</button>
        {d && <><button className="btn-ghost" onClick={csv}>{t('exportExcel')}</button><button className="btn-ghost" onClick={() => window.print()}>{t('print')}</button></>}
      </div>
      {busy && <Spinner />}
      {d && <div className="print-area overflow-x-auto"><h3 className="font-bold text-lg mb-2">{t('r_' + type)}</h3>
        <table className="tbl"><thead><tr>{d.columns.map((c: any) => <th key={c.key}>{t(c.key)}</th>)}</tr></thead>
          <tbody>{d.rows.map((r: any, i: number) => <tr key={i}>{d.columns.map((c: any) => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody></table>
        {!d.rows.length && <div className="text-slate-400 p-3">{t('noData')}</div>}
        {d.summary && <div className="mt-3 font-bold">{Object.entries(d.summary).map(([k, v]: any) => <span key={k} className="mr-6">{t(k)}: ${v}</span>)}</div>}</div>}
    </div>);
}
