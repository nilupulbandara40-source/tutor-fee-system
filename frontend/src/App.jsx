import { useState } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return token
    ? <Dashboard token={token} onLogout={logout} />
    : <Login onSuccess={(t) => { localStorage.setItem('token', t); setToken(t); }} />;
}
