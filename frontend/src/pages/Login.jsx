import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess(data.token);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-md border border-ink/25 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold';

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* Chalkboard panel */}
      <section className="bg-board text-chalk p-8 md:p-14 flex flex-col justify-between">
        <p className="font-display font-semibold text-lg">Tutor Class Manager</p>
        <div className="py-10">
          <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-tight">
            Every student.<br />Every month.<br />Paid and counted.
          </h1>
          <p className="mt-6 max-w-sm text-chalk/75">
            Register students, record monthly tuition fees and issue payment confirmations from one place.
          </p>
        </div>
        <p className="text-sm text-chalk/50 hidden md:block">DevOps Engineering · Group 93</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display font-extrabold text-3xl">Sign in</h2>
            <p className="text-ink/65 mt-1">Use your tutor or admin account.</p>
          </div>

          {error && (
            <div role="alert" className="rounded-md bg-red-50 border border-red-300 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium">Username</span>
            <input className={input + ' mt-1'} value={username} autoComplete="username"
              onChange={(e) => setUsername(e.target.value)} required />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input className={input + ' mt-1'} type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button disabled={loading}
            className="w-full rounded-md bg-board text-chalk font-semibold py-3 hover:bg-ink disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
