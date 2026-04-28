import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, saveAuth } from '../utils/api.js';
import { useAuth } from '../App.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(form.username, form.password);
      saveAuth(data.access, data.refresh, data.user);
      setUser(data.user);
      setToken(data.access);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.data?.non_field_errors?.[0] || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(var(--border) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        opacity: 0.6,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--primary)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 14px rgba(26,86,219,.35)',
          }}>
            <i className="bi bi-shield-lock-fill" style={{ color: '#fff', fontSize: '1.6rem' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>GateOS</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4, fontSize: 14 }}>
            Apartment Gate Management System
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ marginBottom: 4 }}>Sign in</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
            Enter your credentials to access the system
          </p>

          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-circle-fill" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label required">Username</label>
              <div className="search-bar">
                <i className="bi bi-person" />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Password</label>
              <div className="search-bar">
                <i className="bi bi-lock" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in…
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, marginTop: 24 }}>
          © {new Date().getFullYear()} GateOS · Apartment Security System
        </p>
      </div>
    </div>
  );
}