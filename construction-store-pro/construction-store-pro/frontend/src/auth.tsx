import { createContext, useContext, useState, ReactNode } from 'react';
import api from './api';
const Ctx = createContext<any>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } });
  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user);
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  const can = (p?: string | null) => !p || user?.role === 'ADMIN' || user?.perms?.includes(p);
  return <Ctx.Provider value={{ user, login, logout, can }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
