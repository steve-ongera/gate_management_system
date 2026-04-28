// pages/Blacklist.jsx
import React, { useState, useEffect } from 'react';
import { blacklistAPI, visitorsAPI, formatDateTime } from '../utils/api.js';

const EMPTY = { reason:'security_threat', description:'', national_id:'', vehicle_plate:'', visitor:'' };
const REASONS = ['security_threat','unauthorized_access','disturbance','theft','other'];

export default function Blacklist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkQuery, setCheckQuery] = useState({ national_id:'', plate:'' });
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => { fetch_(); }, []);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await blacklistAPI.list();
      setItems(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await blacklistAPI.create(form);
      setModal(false); setForm(EMPTY); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleCheck() {
    const params = {};
    if (checkQuery.national_id) params.national_id = checkQuery.national_id;
    if (checkQuery.plate) params.plate = checkQuery.plate;
    const r = await blacklistAPI.check(params);
    setCheckResult(r);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Blacklist</h1><p>{total} active entries</p></div>
        <button className="btn btn-danger" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}>
          <i className="bi bi-slash-circle-fill" /> Add to Blacklist
        </button>
      </div>

      {/* Quick check */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:12 }}>Quick Blacklist Check</h3>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="form-group" style={{ margin:0, flex:'1 1 160px' }}>
            <label className="form-label">National ID</label>
            <input className="form-control" placeholder="ID number" value={checkQuery.national_id}
              onChange={e => setCheckQuery(q=>({...q, national_id: e.target.value}))} />
          </div>
          <div className="form-group" style={{ margin:0, flex:'1 1 160px' }}>
            <label className="form-label">Vehicle Plate</label>
            <input className="form-control mono" placeholder="KCA 000A" value={checkQuery.plate}
              onChange={e => setCheckQuery(q=>({...q, plate: e.target.value.toUpperCase()}))} />
          </div>
          <button className="btn btn-outline" onClick={handleCheck}><i className="bi bi-search" /> Check</button>
        </div>
        {checkResult !== null && (
          <div className={`alert ${checkResult.blacklisted ? 'alert-danger' : 'alert-success'}`} style={{ marginTop:12, marginBottom:0 }}>
            <i className={`bi ${checkResult.blacklisted ? 'bi-slash-circle-fill' : 'bi-check-circle-fill'}`} />
            {checkResult.blacklisted ? 'BLACKLISTED – Access should be denied.' : 'Clear – Not on blacklist.'}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         items.length === 0 ? <div className="empty-state"><i className="bi bi-slash-circle" /><p>No blacklist entries</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person / Vehicle</th><th>National ID</th><th>Reason</th><th>Description</th><th>Added By</th><th>Added</th><th>Status</th></tr></thead>
              <tbody>
                {items.map(b => (
                  <tr key={b.id}>
                    <td><strong style={{ fontSize:13 }}>{b.visitor_name || b.vehicle_plate || '—'}</strong></td>
                    <td><code style={{ fontSize:12 }}>{b.national_id || '—'}</code></td>
                    <td><span className="badge badge-red">{b.reason?.replace('_',' ')}</span></td>
                    <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-2)', fontSize:12.5 }}>{b.description}</td>
                    <td style={{ color:'var(--text-2)', fontSize:12.5 }}>{b.added_by_name}</td>
                    <td style={{ fontSize:12.5, color:'var(--text-2)' }}>{formatDateTime(b.created_at)}</td>
                    <td><span className={`badge ${b.is_active ? 'badge-red' : 'badge-gray'}`}>{b.is_active ? 'Active' : 'Lifted'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add to Blacklist</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">National ID</label>
                    <input className="form-control" value={form.national_id}
                      onChange={e => setForm(f=>({...f, national_id: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Plate</label>
                    <input className="form-control mono" value={form.vehicle_plate}
                      onChange={e => setForm(f=>({...f, vehicle_plate: e.target.value.toUpperCase()}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Reason</label>
                  <select className="form-control" value={form.reason}
                    onChange={e => setForm(f=>({...f, reason: e.target.value}))}>
                    {REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Description</label>
                  <textarea className="form-control" rows={3} required value={form.description}
                    onChange={e => setForm(f=>({...f, description: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
                  Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}