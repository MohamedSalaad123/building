import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n';
import { AuthProvider } from './auth';
import { ToastProvider } from './components/ui';
import './index.css';
if (localStorage.getItem('dark') === '1') document.documentElement.classList.add('dark');
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><I18nProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></I18nProvider></BrowserRouter></React.StrictMode>
);
