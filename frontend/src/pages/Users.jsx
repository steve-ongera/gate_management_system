import React, { useState, useEffect } from 'react';
import { usersAPI, formatDateTime } from '../utils/api.js';

const EMPTY = { username:'', email:'', first_name:'', last_name:'', password:'', role:'security', phone:'' };

export default function Users() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw]   = useState('');

  useEffect(() => { fetch_(); }, [page]);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await usersAPI.list({ page });
      setUsers(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  function openAdd() { setForm(EMPTY); setSelected(null); setError(''); setModal(true); }
  function openEdit(u) {
    setForm({ username:u.username, email:u.email, first_name:u.first_name,
      last_name:u.last_name, password:'', role:u.role, phone:u.phone });
    setSelected(u); setError(''); setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      selected ? await usersAPI.update(selected.id, payload) : await usersAPI.create(payload);
      setModal(false); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleToggle(u) {
    await usersAPI.toggleActive(u.id);
    fetch_();
  }

  async function handlePwReset() {
    if (!newPw || newPw.length < 8) { alert('Password must be at least 8 characters.'); return; }
    setSaving(true);
    await usersAPI.resetPassword(pwModal.id, { password: newPw });
    setPwModal(null); setNewPw(''); setSaving(false);
    alert('Password reset successfully.');
  }

  const ROLE_BADGE = { admin:'badge-blue', security:'badge-green', resident:'badge-gray' };
  const totalPages = Math.ceil(total / 25);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Staff Users</h1><p>{total} users</p></div>
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-person-plus-fill" /> Add User</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         users.length === 0 ? <div className="empty-state"><i className="bi bi-person-x" /><p>No users found</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--primary-light)', color:'var(--primary)',
                          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                          {(u.first_name?.[0]||'') + (u.last_name?.[0]||'')||u.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{u.first_name} {u.last_name}</div>
                          <div style={{ fontSize:11.5, color:'var(--text-3)' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                    <td style={{ color:'var(--text-2)' }}>{u.phone || '—'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td style={{ fontSize:12.5, color:'var(--text-2)' }}>{formatDateTime(u.created_at)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setPwModal(u); setNewPw(''); }} title="Reset password">
                          <i className="bi bi-key" />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(u)}
                          title={u.is_active ? 'Disable' : 'Enable'}>
                          <i className={`bi ${u.is_active ? 'bi-toggle-on' : 'bi-toggle-off'}`}
                            style={{ color: u.is_active ? 'var(--success)' : 'var(--text-3)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p-1)} disabled={page===1}><i className="bi bi-chevron-left" /></button>
            <span style={{ padding:'5px 10px', fontSize:13, color:'var(--text-2)' }}>{page}/{totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}><i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{selected ? `Edit – ${selected.username}` : 'Add Staff User'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">First Name</label>
                    <input className="form-control" required value={form.first_name}
                      onChange={e => setForm(f=>({...f, first_name: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Last Name</label>
                    <input className="form-control" required value={form.last_name}
                      onChange={e => setForm(f=>({...f, last_name: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Username</label>
                    <input className="form-control mono" required value={form.username}
                      onChange={e => setForm(f=>({...f, username: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Role</label>
                    <select className="form-control" value={form.role}
                      onChange={e => setForm(f=>({...f, role: e.target.value}))}>
                      <option value="security">Security Guard</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email}
                      onChange={e => setForm(f=>({...f, email: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-control" value={form.phone}
                      onChange={e => setForm(f=>({...f, phone: e.target.value}))} />
                  </div>
                </div>
                {!selected && (
                  <div className="form-group">
                    <label className="form-label required">Password</label>
                    <input type="password" className="form-control" required={!selected} minLength={8} value={form.password}
                      onChange={e => setForm(f=>({...f, password: e.target.value}))} />
                    <span className="form-hint">Minimum 8 characters</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
                  {selected ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {pwModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setPwModal(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title">Reset Password – {pwModal.username}</span>
              <button className="modal-close" onClick={() => setPwModal(null)}><i className="bi bi-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <input type="password" className="form-control" minLength={8} value={newPw}
                  onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPwModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePwReset} disabled={saving}>
                <i className="bi bi-key" /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}