import { useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Modal, Field, Spinner, useLoad, useToast, METHODS, pname } from './ui';

export function InvoiceModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { data: s } = useLoad<any>(() => api.get('/sales/' + id).then(r => r.data), [id]);
  const { data: st } = useLoad<any>(() => api.get('/settings').then(r => r.data), []);
  return (
    <Modal title={t('invoice')} onClose={onClose} wide>
      {!s || !st ? <Spinner /> : <>
        <div className="print-area bg-white text-black p-6 text-sm">
          <div className="flex justify-between border-b pb-3 mb-3"><div><div className="text-2xl font-extrabold text-blue-900">{st.settings.storeName}</div><div>{st.settings.address}</div><div>{st.settings.phone}</div></div>
            <div className="text-right"><div className="text-xl font-bold">{s.invoiceNo}</div><div>{fdate(s.createdAt)}</div><div>{t('cashier')}: {s.cashier.fullName}</div></div></div>
          <div className="mb-3"><b>{t('customer')}:</b> {s.customer ? `${s.customer.fullName} ${s.customer.phone || ''}` : t('walkIn')}</div>
          <table className="w-full mb-3"><thead><tr className="border-b text-left"><th>{t('products')}</th><th>{t('quantity')}</th><th>{t('price')}</th><th>{t('discount')}</th><th className="text-right">{t('total')}</th></tr></thead>
            <tbody>{s.items.map((i: any) => <tr key={i.id} className="border-b"><td>{pname(i.product, lang)}</td><td>{Number(i.quantity)}</td><td>{money(i.unitPrice)}</td><td>{money(i.discount)}</td><td className="text-right">{money(i.lineTotal)}</td></tr>)}</tbody></table>
          <div className="ml-auto w-64 space-y-1"><div className="flex justify-between"><span>{t('subtotal')}</span><span>{money(s.subtotal)}</span></div><div className="flex justify-between"><span>{t('discount')}</span><span>-{money(s.discount)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>{t('invoiceTotal')}</span><span>{money(s.total)}</span></div>
            <div className="flex justify-between"><span>{t('paid')}</span><span>{money(s.amountPaid)}</span></div><div className="flex justify-between font-bold"><span>{t('balance')}</span><span>{money(Number(s.total) - Number(s.amountPaid))}</span></div></div>
          <div className="mt-3 text-xs">{t('method')}: {s.payments.map((p: any) => `${t(p.method)} ${Number(p.amount)} ${p.currency}`).join(' • ') || '-'}</div>
          <div className="text-center mt-6 text-xs text-slate-500">{t('thanks')}</div>
        </div>
        <div className="flex gap-2 mt-3"><button className="btn-primary" onClick={() => window.print()}>{t('printPdf')}</button><button className="btn-ghost" onClick={onClose}>{t('close')}</button></div></>}
    </Modal>);
}

// kind: 'sales' | 'purchases'
export function PayModal({ kind, doc, onClose, onDone }: any) {
  const { t } = useI18n(); const toast = useToast();
  const [m, setM] = useState('CASH_USD'); const [c, setC] = useState('USD'); const [a, setA] = useState('');
  const bal = Number(doc.total) - Number(doc.amountPaid);
  const go = async () => {
    try { await api.post(`/${kind}/${doc.id}/payments`, kind === 'sales' ? { method: m, currency: c, amount: +a } : { method: m, amountUsd: +a }); toast.ok(t('saved')); onDone(); } catch (e) { toast.err(e); }
  };
  return (
    <Modal title={`${t('payment')} — ${doc.invoiceNo || doc.poNumber}`} onClose={onClose}><div className="space-y-3">
      <div className="text-sm">{t('balance')}: <b>{money(bal)}</b></div>
      <Field label={t('method')}><select className="input" value={m} onChange={e => setM(e.target.value)}>{METHODS.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></Field>
      {kind === 'sales' && <Field label="USD / SOS"><select className="input" value={c} onChange={e => setC(e.target.value)}><option>USD</option><option>SOS</option></select></Field>}
      <Field label={t('amount')}><input className="input" type="number" step="any" value={a} onChange={e => setA(e.target.value)} /></Field>
      <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>{t('cancel')}</button><button className="btn-primary" onClick={go}>{t('pay')}</button></div></div></Modal>);
}
