'use client';

import { useState } from 'react';

export default function PasswordGate({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect password');
        return;
      }
      onSuccess();
    } catch (err) {
      setError('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border border-border rounded-lg p-6"
      >
        <h1 className="text-lg font-semibold mb-1">Script Image Generator</h1>
        <p className="text-sm text-muted mb-4">Enter the access password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full mb-3 px-3 py-2 rounded-md border border-border text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2 rounded-md bg-accent text-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
