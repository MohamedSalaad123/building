import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Modal, Field, Pager, Spinner, useLoad, useToast, METHODS, pname } from '../components/ui';

export default function Expenses() {
  const { t, lang } = useI18n(); const toast = useToast(); const [page, setPage] = useState(1); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [f, setF] = useState<any>(null);
  const { data, reload } = useLoad<any>(() => api.get('/expenses', { params: { page, from, to } }).then(r => r.data), [page, from, to]);
  const { data: lk } = useLoad<any>(() => api.get('/lookups').then(r => r.data), []);
  const save = async () => { try { await api.post('/expenses', f); toast.ok(t('saved')); setF(null); reload(); } catch (e) { toast.err(e); } };
  const del = async (id: number) => { if (!confirm(t('confirmDelete'))) return; try { await api.delete('/expenses/' + id); reload(); } catch (e) { toast.err(e); } };
  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 items-center mb-3"><input type="date" className="input !w-40" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /><input type="date" className="input !w-40" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        <div className="text-sm">{t('total')}: <b>{money(data?.sum)}</b></div><div className="flex-1" /><button className="btn-primary" onClick={() => setF({ categoryId: '', amountUsd: '', method: 'CASH_USD', notes: '' })}><Plus size={16} />{t('newExpense')}</button></div>
      {!data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('expenseCategory')}</th><th>{t('amount')}</th><th>{t('method')}</th><th>{t('notes')}</th><th>{t('user')}</th><th></th></tr></thead>
        <tbody>{data.rows.map((e: any) => <tr key={e.id}><td>{fdate(e.spentAt)}</td><td>{pname(e.category, lang)}</td><td>{money(e.amountUsd)}</td><td>{t(e.method)}</td><td>{e.notes}</td><td>{e.user.fullName}</td><td><button className="p-1 text-red-600" onClick={() => del(e.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
      <Pager page={page} total={data?.total || 0} onPage={setPage} />
      {f && <Modal title={t('newExpense')} onClose={() => setF(null)}><div className="space-y-3">
        <Field label={t('expenseCategory')}><select className="input" value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}><option value="" />{lk?.expenseCategories.map((c: any) => <option key={c.id} value={c.id}>{pname(c, lang)}</option>)}</select></Field>
        <Field label={t('amount') + ' (USD)'}><input className="input" type="number" step="any" value={f.amountUsd} onChange={e => setF({ ...f, amountUsd: e.target.value })} /></Field>
        <Field label={t('method')}><select className="input" value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{METHODS.map(m => <option key={m} value={m}>{t(m)}</option>)}</select></Field>
        <Field label={t('notes')}><input className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></div></div></Modal>}
    </div>);
}
