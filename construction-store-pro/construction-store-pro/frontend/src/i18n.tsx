import { createContext, useContext, useState, ReactNode } from 'react';
import so from './translations/so.json';
import en from './translations/en.json';
const D: any = { so, en };
const Ctx = createContext<any>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState(localStorage.getItem('lang') || 'so');
  const setLang = (l: string) => { localStorage.setItem('lang', l); set(l); };
  const t = (k: string) => D[lang]?.[k] ?? D.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
