import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { money, Modal, Field, Pager, Spinner, useLoad, useToast, pname } from '../components/ui';

const empty: any = { nameSo: '', nameEn: '', sku: '', barcode: '', categoryId: '', unitId: '', brand: '', purchasePrice: '', sellingPrice: '', wholesalePrice: '', stock: '', minStock: '', description: '', imageUrl: '' };
export default function Products() {
  const { t, lang } = useI18n(); const toast = useToast(); const { can } = useAuth(); const [sp] = useSearchParams();
  const [search, setSearch] = useState(sp.get('search') || ''); const [cat, setCat] = useState(''); const [page, setPage] = useState(1); const [edit, setEdit] = useState<any>(null); const [lk, setLk] = useState<any>({ categories: [], units: [] });
  useEffect(() => { setSearch(sp.get('search') || ''); setPage(1); }, [sp]);
  useEffect(() => { api.get('/lookups').then(r => setLk(r.data)); }, []);
  const { data, loading, reload } = useLoad<any>(() => api.get('/products', { params: { search, categoryId: cat, page } }).then(r => r.data), [search, cat, page]);
  const set = (k: string, v: any) => setEdit((e: any) => ({ ...e, [k]: v }));
  const onFile = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 240 / Math.max(img.width, img.height)); c.width = img.width * s; c.height = img.height * s; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); set('imageUrl', c.toDataURL('image/jpeg', 0.7)); }; img.src = r.result as string; }; r.readAsDataURL(f); };
  const save = async () => {
    try { if (edit.id) await api.put('/products/' + edit.id, edit); else await api.post('/products', edit); toast.ok(t('saved')); setEdit(null); reload(); } catch (e) { toast.err(e); }
  };
  const del = async (p: any) => { if (!confirm(t('confirmDelete'))) return; try { await api.delete('/products/' + p.id); reload(); } catch (e) { toast.err(e); } };
  const I = (k: string, type = 'text') => <input className="input" type={type} step="any" value={edit[k] ?? ''} onChange={e => set(k, e.target.value)} />;
  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 mb-3">
        <input className="input !w-64" placeholder={t('search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input !w-48" value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}><option value="">{t('category')}</option>{lk.categories.map((c: any) => <option key={c.id} value={c.id}>{pname(c, lang)}</option>)}</select>
        <div className="flex-1" />{can('product.manage') && <button className="btn-primary" onClick={() => setEdit({ ...empty })}><Plus size={16} />{t('addProduct')}</button>}
      </div>
      {loading && !data ? <Spinner /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th></th><th>{t('name')}</th><th>{t('sku')}</th><th>{t('category')}</th><th>{t('unit')}</th><th>{t('cost')}</th><th>{t('price')}</th><th>{t('stock')}</th><th></th></tr></thead>
        <tbody>{data?.rows.map((p: any) => <tr key={p.id}>
          <td>{p.imageUrl ? <img src={p.imageUrl} className="w-9 h-9 object-cover rounded" /> : <div className="w-9 h-9 rounded bg-slate-100 dark:bg-slate-700" />}</td>
          <td className="font-medium">{pname(p, lang)}</td><td>{p.sku}</td><td>{pname(p.category, lang)}</td><td>{pname(p.unit, lang)}</td><td>{money(p.purchasePrice)}</td><td>{money(p.sellingPrice)}</td>
          <td className={p.stock <= Number(p.minStock) ? 'text-red-600 font-bold' : ''}>{p.stock}</td>
          <td className="text-right">{can('product.manage') && <><button className="p-1" onClick={() => setEdit({ ...p })}><Pencil size={16} /></button><button className="p-1 text-red-600" onClick={() => del(p)}><Trash2 size={16} /></button></>}</td></tr>)}</tbody></table></div>}
      <Pager page={page} total={data?.total || 0} onPage={setPage} />
      {edit && <Modal title={edit.id ? t('edit') : t('addProduct')} onClose={() => setEdit(null)} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('nameSo')}>{I('nameSo')}</Field><Field label={t('nameEn')}>{I('nameEn')}</Field>
          <Field label={t('sku')}>{I('sku')}</Field><Field label={t('barcode')}>{I('barcode')}</Field>
          <Field label={t('category')}><select className="input" value={edit.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="" />{lk.categories.map((c: any) => <option key={c.id} value={c.id}>{pname(c, lang)}</option>)}</select></Field>
          <Field label={t('unit')}><select className="input" value={edit.unitId} onChange={e => set('unitId', e.target.value)}><option value="" />{lk.units.map((c: any) => <option key={c.id} value={c.id}>{pname(c, lang)}</option>)}</select></Field>
          <Field label={t('brand')}>{I('brand')}</Field><Field label={t('minStock')}>{I('minStock', 'number')}</Field>
          <Field label={t('purchasePrice')}>{I('purchasePrice', 'number')}</Field><Field label={t('sellingPrice')}>{I('sellingPrice', 'number')}</Field>
          <Field label={t('wholesalePrice')}>{I('wholesalePrice', 'number')}</Field>{!edit.id && <Field label={t('openingStock')}>{I('stock', 'number')}</Field>}
          <Field label={t('image')}><input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0])} className="text-sm" /></Field>
          <div className="sm:col-span-2"><Field label={t('description')}><textarea className="input" rows={2} value={edit.description ?? ''} onChange={e => set('description', e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-4"><button className="btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></div>
      </Modal>}
    </div>);
}
