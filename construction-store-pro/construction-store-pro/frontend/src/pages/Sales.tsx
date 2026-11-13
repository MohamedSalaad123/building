import { useState } from 'react';
import { Eye, Coins } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { money, fdate, Badge, Pager, Spinner, useLoad } from '../components/ui';
import { InvoiceModal, PayModal } from '../components/Invoice';

export default function Sales() {
  const { t } = useI18n(); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [view, setView] = useState<number | null>(null); const [pay, setPay] = useState<any>(null);
  const { data, reload } = useLoad<any>(() => api.get('/sales', { params: { page, search, status } }).then(r => r.data), [page, search, status]);
  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 mb-3"><input className="input !w-64" placeholder={t('search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input !w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{t('status')}</option>{['COMPLETED', 'PARTIAL', 'CREDIT'].map(s => <option key={s} value={s}>{t(s)}</option>)}</select></div>
      {!data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{t('invoiceNo')}</th><th>{t('date')}</th><th>{t('customer')}</th><th>{t('cashier')}</th><th>{t('total')}</th><th>{t('paid')}</th><th>{t('balance')}</th><th>{t('status')}</th><th></th></tr></thead>
        <tbody>{data.rows.map((s: any) => <tr key={s.id}><td>{s.invoiceNo}</td><td>{fdate(s.createdAt)}</td><td>{s.customer?.fullName || t('walkIn')}</td><td>{s.cashier.fullName}</td><td>{money(s.total)}</td><td>{money(s.amountPaid)}</td><td>{money(Number(s.total) - Number(s.amountPaid))}</td><td><Badge v={s.status} /></td>
          <td className="text-right"><button className="p-1" onClick={() => setView(s.id)}><Eye size={16} /></button>{s.status !== 'COMPLETED' && <button className="p-1 text-green-600" onClick={() => setPay(s)}><Coins size={16} /></button>}</td></tr>)}</tbody></table></div>}
      <Pager page={page} total={data?.total || 0} onPage={setPage} />
      {view && <InvoiceModal id={view} onClose={() => setView(null)} />}
      {pay && <PayModal kind="sales" doc={pay} onClose={() => setPay(null)} onDone={() => { setPay(null); reload(); }} />}
    </div>);
}
