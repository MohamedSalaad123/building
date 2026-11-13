import { useState } from 'react';
import { Plus, Pencil, FileText } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { money, fdate, Badge, Modal, Field, Pager, Spinner, useLoad, useToast } from '../components/ui';
import { PayModal } from '../components/Invoice';

export default function Parties({ kind }: { kind: 'customers' | 'suppliers' }) {
  const { t } = useI18n(); const toast = useToast(); const { can } = useAuth(); const isC = kind === 'customers';
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [f, setF] = useState<any>(null); const [st, setSt] = useState<any>(null); const [pay, setPay] = useState<any>(null);
  const { data, reload } = useLoad<any>(() => api.get('/' + kind, { params: { page, search } }).then(r => r.data), [kind, page, search]);
  const manage = can(isC ? 'customer.manage' : 'supplier.manage');
  const save = async () => { try { if (f.id) await api.put(`/${kind}/${f.id}`, f); else await api.post('/' + kind, f); toast.ok(t('saved')); setF(null); reload(); } catch (e) { toast.err(e); } };
  const openSt = async (id: number) => { const r = await api.get(`/${kind}/${id}/statement`); setSt(r.data); };
  const refreshSt = () => { setPay(null); reload(); if (st) openSt(st.customer.id); };
  const docKind = isC ? 'sales' : 'purchases';
  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 mb-3"><input className="input !w-64" placeholder={t('search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /><div className="flex-1" />
        {manage && <button className="btn-primary" onClick={() => setF(isC ? { fullName: '', phone: '', address: '', type: 'RETAIL' } : { name: '', phone: '', address: '', company: '' })}><Plus size={16} />{t(isC ? 'newCustomer' : 'newSupplier')}</button>}</div>
      {!data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('phone')}</th><th>{t('address')}</th><th>{t(isC ? 'customerType' : 'company')}</th><th>{t('purchasesCount')}</th><th>{t('total')}</th><th>{t('totalPaid')}</th><th>{t('balance')}</th><th></th></tr></thead>
        <tbody>{data.rows.map((c: any) => <tr key={c.id}><td className="font-medium">{c.fullName || c.name}</td><td>{c.phone}</td><td>{c.address}</td><td>{isC ? t(c.type) : c.company}</td><td>{c.purchases}</td><td>{money(c.totalAmount)}</td><td>{money(c.totalPaid)}</td>
          <td className={c.balance > 0 ? 'text-red-600 font-bold' : ''}>{money(c.balance)}</td>
          <td className="text-right whitespace-nowrap"><button className="p-1" title={t('statement')} onClick={() => openSt(c.id)}><FileText size={16} /></button>{manage && <button className="p-1" onClick={() => setF({ ...c })}><Pencil size={16} /></button>}</td></tr>)}</tbody></table></div>}
      <Pager page={page} total={data?.total || 0} onPage={setPage} />
      {f && <Modal title={t(isC ? 'customers' : 'suppliers')} onClose={() => setF(null)}><div className="space-y-3">
        <Field label={t('name')}><input className="input" value={(isC ? f.fullName : f.name) ?? ''} onChange={e => setF({ ...f, [isC ? 'fullName' : 'name']: e.target.value })} /></Field>
        <Field label={t('phone')}><input className="input" value={f.phone ?? ''} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label={t('address')}><input className="input" value={f.address ?? ''} onChange={e => setF({ ...f, address: e.target.value })} /></Field>
        {isC ? <Field label={t('customerType')}><select className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['RETAIL', 'WHOLESALE', 'CONTRACTOR'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></Field>
          : <Field label={t('company')}><input className="input" value={f.company ?? ''} onChange={e => setF({ ...f, company: e.target.value })} /></Field>}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></div></div></Modal>}
      {st && !pay && <Modal title={`${t('statement')}: ${st.customer.fullName}`} onClose={() => setSt(null)} wide>
        <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{isC ? t('invoiceNo') : t('poNumber')}</th><th>{t('date')}</th><th>{t('total')}</th><th>{t('paid')}</th><th>{t('balance')}</th><th>{t('status')}</th><th></th></tr></thead>
          <tbody>{st.docs.map((d: any) => { const b = Number(d.total) - Number(d.amountPaid); return <tr key={d.id}><td>{d.invoiceNo || d.poNumber}</td><td>{fdate(d.createdAt)}</td><td>{money(d.total)}</td><td>{money(d.amountPaid)}</td><td>{money(b)}</td><td><Badge v={d.status === 'CREDIT' || d.status === 'PARTIAL' || d.status === 'COMPLETED' ? d.status : d.payStatus} /></td>
            <td>{b > 0.005 && <button className="btn-ghost !py-1" onClick={() => setPay(d)}>{t('pay')}</button>}</td></tr>; })}</tbody></table></div>
        <div className="flex justify-end gap-2 mt-3"><button className="btn-ghost" onClick={() => window.print()}>{t('print')}</button><button className="btn-ghost" onClick={() => setSt(null)}>{t('close')}</button></div></Modal>}
      {pay && <PayModal kind={docKind} doc={pay} onClose={() => setPay(null)} onDone={refreshSt} />}
    </div>);
}
