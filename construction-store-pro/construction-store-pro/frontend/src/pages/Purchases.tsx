import { useState } from 'react';
import { Plus, Coins, Trash2 } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Badge, Modal, Field, Pager, Spinner, useLoad, useToast, METHODS, pname } from '../components/ui';
import { PayModal } from '../components/Invoice';

export default function Purchases() {
  const { t, lang } = useI18n(); const toast = useToast(); const [page, setPage] = useState(1); const [f, setF] = useState<any>(null); const [pay, setPay] = useState<any>(null);
  const { data, reload } = useLoad<any>(() => api.get('/purchases', { params: { page } }).then(r => r.data), [page]);
  const { data: sup } = useLoad<any>(() => api.get('/suppliers', { params: { pageSize: 500 } }).then(r => r.data), []);
  const { data: prods } = useLoad<any>(() => api.get('/products', { params: { pageSize: 500 } }).then(r => r.data), []);
  const row = (i: number, k: string, v: any) => setF((x: any) => ({ ...x, items: x.items.map((r: any, j: number) => j === i ? { ...r, [k]: v } : r) }));
  const pick = (i: number, id: string) => { const p = prods.rows.find((x: any) => String(x.id) === id); setF((x: any) => ({ ...x, items: x.items.map((r: any, j: number) => j === i ? { ...r, productId: id, unitCost: p ? Number(p.purchasePrice) : '' } : r) })); };
  const total = f ? f.items.reduce((a: number, r: any) => a + (+r.quantity || 0) * (+r.unitCost || 0), 0) : 0;
  const save = async () => {
    try { await api.post('/purchases', { supplierId: f.supplierId, supplierInvoiceNo: f.invoice, items: f.items.filter((r: any) => r.productId).map((r: any) => ({ productId: r.productId, quantity: +r.quantity, unitCost: +r.unitCost })), payments: +f.paid > 0 ? [{ method: f.method, amountUsd: +f.paid }] : [] });
      toast.ok(t('saved')); setF(null); reload(); } catch (e) { toast.err(e); }
  };
  return (
    <div className="card">
      <div className="flex justify-end mb-3"><button className="btn-primary" onClick={() => setF({ supplierId: '', invoice: '', paid: '', method: 'CASH_USD', items: [{ productId: '', quantity: 1, unitCost: '' }] })}><Plus size={16} />{t('newPurchase')}</button></div>
      {!data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{t('poNumber')}</th><th>{t('date')}</th><th>{t('supplier')}</th><th>{t('total')}</th><th>{t('paid')}</th><th>{t('balance')}</th><th>{t('status')}</th><th></th></tr></thead>
        <tbody>{data.rows.map((p: any) => <tr key={p.id}><td>{p.poNumber}</td><td>{fdate(p.createdAt)}</td><td>{p.supplier.name}</td><td>{money(p.total)}</td><td>{money(p.amountPaid)}</td><td>{money(Number(p.total) - Number(p.amountPaid))}</td><td><Badge v={p.payStatus} /></td>
          <td>{p.payStatus !== 'PAID' && <button className="p-1 text-green-600" onClick={() => setPay(p)}><Coins size={16} /></button>}</td></tr>)}</tbody></table></div>}
      <Pager page={page} total={data?.total || 0} onPage={setPage} />
      {pay && <PayModal kind="purchases" doc={pay} onClose={() => setPay(null)} onDone={() => { setPay(null); reload(); }} />}
      {f && <Modal title={t('newPurchase')} onClose={() => setF(null)} wide><div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3"><Field label={t('supplier')}><select className="input" value={f.supplierId} onChange={e => setF({ ...f, supplierId: e.target.value })}><option value="" />{sup?.rows.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label={t('supplierInvoice')}><input className="input" value={f.invoice} onChange={e => setF({ ...f, invoice: e.target.value })} /></Field></div>
        {f.items.map((r: any, i: number) => <div key={i} className="flex gap-2 items-end">
          <div className="flex-1"><select className="input" value={r.productId} onChange={e => pick(i, e.target.value)}><option value="">{t('selectProduct')}</option>{prods?.rows.map((p: any) => <option key={p.id} value={p.id}>{pname(p, lang)}</option>)}</select></div>
          <input className="input !w-24" type="number" step="any" placeholder={t('qty')} value={r.quantity} onChange={e => row(i, 'quantity', e.target.value)} />
          <input className="input !w-28" type="number" step="any" placeholder={t('unitCost')} value={r.unitCost} onChange={e => row(i, 'unitCost', e.target.value)} />
          <button onClick={() => setF({ ...f, items: f.items.filter((_: any, j: number) => j !== i) })}><Trash2 size={16} className="text-red-600" /></button></div>)}
        <button className="btn-ghost" onClick={() => setF({ ...f, items: [...f.items, { productId: '', quantity: 1, unitCost: '' }] })}>{t('addRow')}</button>
        <div className="grid sm:grid-cols-3 gap-3 items-end"><div className="text-lg">{t('total')}: <b>{money(total)}</b></div>
          <Field label={t('paid') + ' $'}><input className="input" type="number" step="any" value={f.paid} onChange={e => setF({ ...f, paid: e.target.value })} /></Field>
          <Field label={t('method')}><select className="input" value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{METHODS.map(m => <option key={m} value={m}>{t(m)}</option>)}</select></Field></div>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></div></div></Modal>}
    </div>);
}
