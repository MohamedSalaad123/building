import { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Modal, Field, Pager, Spinner, useLoad, useToast, pname } from '../components/ui';

export default function Inventory() {
  const { t, lang } = useI18n(); const toast = useToast(); const [page, setPage] = useState(1); const [f, setF] = useState<any>(null);
  const { data, reload } = useLoad<any>(() => api.get('/inventory/movements', { params: { page } }).then(r => r.data), [page]);
  const { data: val } = useLoad<any>(() => api.get('/inventory/valuation').then(r => r.data), []);
  const { data: prods } = useLoad<any>(() => api.get('/products', { params: { pageSize: 500 } }).then(r => r.data), []);
  const save = async () => { try { await api.post('/inventory/movements', f); toast.ok(t('saved')); setF(null); reload(); } catch (e) { toast.err(e); } };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md"><div className="card !p-3"><div className="text-xs text-slate-500">{t('valuation')}</div><div className="text-xl font-bold">{money(val?.value)}</div></div></div>
      <div className="card">
        <div className="flex justify-between mb-3"><h3 className="font-bold text-lg">{t('movements')}</h3><button className="btn-primary" onClick={() => setF({ type: 'STOCK_IN', productId: '', quantity: '', notes: '' })}><Plus size={16} />{t('newMovement')}</button></div>
        {!data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('products')}</th><th>{t('type')}</th><th>{t('quantity')}</th><th>{t('reference')}</th><th>{t('user')}</th><th>{t('notes')}</th></tr></thead>
          <tbody>{data.rows.map((m: any) => <tr key={m.id}><td>{fdate(m.createdAt)}</td><td>{pname(m.product, lang)}</td><td>{t(m.type)}</td><td className={Number(m.quantity) < 0 ? 'text-red-600' : 'text-green-600'}>{Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity)}</td><td>{m.reference}</td><td>{m.user.fullName}</td><td>{m.notes}</td></tr>)}</tbody></table></div>}
        <Pager page={page} total={data?.total || 0} onPage={setPage} />
      </div>
      {f && <Modal title={t('newMovement')} onClose={() => setF(null)}><div className="space-y-3">
        <Field label={t('products')}><select className="input" value={f.productId} onChange={e => setF({ ...f, productId: e.target.value })}><option value="">{t('selectProduct')}</option>{prods?.rows.map((p: any) => <option key={p.id} value={p.id}>{pname(p, lang)} ({p.stock})</option>)}</select></Field>
        <Field label={t('type')}><select className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGED', 'RETURN_IN'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></Field>
        <Field label={t('quantity') + (f.type === 'ADJUSTMENT' ? ' (+/-)' : '')}><input className="input" type="number" step="any" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></Field>
        <Field label={t('notes')}><input className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <label className="text-sm flex gap-2"><input type="checkbox" checked={!!f.allowNegative} onChange={e => setF({ ...f, allowNegative: e.target.checked })} />{t('allowNegative')}</label>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></div></div></Modal>}
    </div>);
}
