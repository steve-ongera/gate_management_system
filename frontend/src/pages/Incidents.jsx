import React, { useState, useEffect } from 'react';
import { incidentsAPI, gatesAPI, formatDateTime } from '../utils/api.js';

const SEV_BADGE = { low:'badge-gray', medium:'badge-yellow', high:'badge-red', critical:'badge-red' };
const EMPTY = { title:'', description:'', category:'security', severity:'low', gate:'', occurred_at:'' };

export default function Incidents() {
  const [items, setItems]   = useState([]);
  const [gates, setGates]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(false);
  const [resolveModal, setResolveModal] = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [resolveNote, setResolveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => { gatesAPI.list().then(d => setGates(d?.results || d || [])); }, []);
  useEffect(() => { fetch_(); }, [page, showResolved]);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await incidentsAPI.list({ page, ...(showResolved ? {} : { is_resolved: false }) });
      setItems(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await incidentsAPI.create(form);
      setModal(false); setForm(EMPTY); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleResolve() {
    setSaving(true);
    try {
      await incidentsAPI.resolve(resolveModal.id, { resolution_notes: resolveNote });
      setResolveModal(null); setResolveNote(''); fetch_();
    } finally { setSaving(false); }
  }

  const CATEGORIES = ['security','unauthorized','accident','theft','vandalism','disturbance','other'];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Incidents</h1>
          <p>{total} {showResolved ? 'total' : 'open'} incidents</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`btn ${showResolved ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowResolved(s => !s)}>
            <i className="bi bi-funnel" /> {showResolved ? 'Show Open Only' : 'Show All'}
          </button>
          <button className="btn btn-danger" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}>
            <i className="bi bi-exclamation-triangle-fill" /> Report Incident
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         items.length === 0 ? (
           <div className="empty-state">
             <i className="bi bi-check-circle" style={{ color:'var(--success)' }} />
             <p>No open incidents – all clear!</p>
           </div>
         ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Severity</th><th>Title</th><th>Category</th><th>Gate</th><th>Reported By</th><th>Occurred</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {items.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <span className={`badge ${SEV_BADGE[inc.severity]}`} style={{ textTransform:'uppercase', fontSize:10 }}>
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{inc.title}</div>
                      <div style={{ color:'var(--text-3)', fontSize:11.5, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {inc.description}
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{inc.category}</span></td>
                    <td style={{ color:'var(--text-2)' }}>{inc.gate_name || '—'}</td>
                    <td style={{ color:'var(--text-2)', fontSize:12.5 }}>{inc.reported_by_name}</td>
                    <td style={{ fontSize:12.5, color:'var(--text-2)' }}>{formatDateTime(inc.occurred_at)}</td>
                    <td>
                      <span className={`badge ${inc.is_resolved ? 'badge-green' : 'badge-red'}`}>
                        {inc.is_resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td>
                      {!inc.is_resolved && (
                        <button className="btn btn-success btn-sm" onClick={() => { setResolveModal(inc); setResolveNote(''); }}>
                          <i className="bi bi-check2" /> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Report Incident</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-group">
                  <label className="form-label required">Title</label>
                  <input className="form-control" required value={form.title}
                    onChange={e => setForm(f=>({...f, title: e.target.value}))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.category}
                      onChange={e => setForm(f=>({...f, category: e.target.value}))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select className="form-control" value={form.severity}
                      onChange={e => setForm(f=>({...f, severity: e.target.value}))}>
                      {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gate</label>
                    <select className="form-control" value={form.gate}
                      onChange={e => setForm(f=>({...f, gate: e.target.value}))}>
                      <option value="">Select gate…</option>
                      {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Occurred At</label>
                    <input type="datetime-local" className="form-control" value={form.occurred_at}
                      onChange={e => setForm(f=>({...f, occurred_at: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Description</label>
                  <textarea className="form-control" rows={4} required value={form.description}
                    onChange={e => setForm(f=>({...f, description: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : <i className="bi bi-exclamation-triangle-fill" />}
                  Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setResolveModal(null)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">Resolve Incident</span>
              <button className="modal-close" onClick={() => setResolveModal(null)}><i className="bi bi-x" /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom:12, color:'var(--text-2)' }}>
                Resolving: <strong>{resolveModal.title}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Resolution Notes</label>
                <textarea className="form-control" rows={4} value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  placeholder="Describe how the incident was resolved…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setResolveModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleResolve} disabled={saving}>
                <i className="bi bi-check2-circle" /> Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}