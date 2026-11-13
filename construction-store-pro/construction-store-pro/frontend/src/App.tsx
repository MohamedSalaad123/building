import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Parties from './pages/Parties';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';

export default function App() {
  const { user } = useAuth();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  const home = user.role === 'CASHIER' ? '/pos' : '/';
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={user.role === 'CASHIER' ? <Navigate to="/pos" /> : <Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/customers" element={<Parties kind="customers" />} />
        <Route path="/suppliers" element={<Parties kind="suppliers" />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to={home} />} />
      </Route>
    </Routes>
  );
}
