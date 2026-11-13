import { useState } from 'react';
import { HardHat } from 'lucide-react';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { errMsg } from '../api';

export default function Login() {
  const { login } = useAuth(); const { t, lang, setLang } = useI18n();
  const [u, setU] = useState('admin'); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (e: any) => { e.preventDefault(); setBusy(true); setErr(''); try { await login(u, p); } catch (x) { setErr(errMsg(x)); } setBusy(false); };
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-blue-700 flex items-center justify-center p-4">
      <form onSubmit={go} className="card w-full max-w-sm space-y-4">
        <div className="text-center"><HardHat className="mx-auto text-amber-500" size={44} /><h1 className="text-2xl font-extrabold text-navy-800 dark:text-white">Construction Store <span className="text-amber-500">Pro</span></h1><p className="text-sm text-slate-500">{t('welcome')}</p></div>
        <input className="input" value={u} onChange={e => setU(e.target.value)} placeholder={t('username')} autoFocus />
        <input className="input" type="password" value={p} onChange={e => setP(e.target.value)} placeholder={t('password')} />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>{t('login')}</button>
        <select value={lang} onChange={e => setLang(e.target.value)} className="input"><option value="so">Soomaali</option><option value="en">English</option></select>
      </form>
    </div>);
}
