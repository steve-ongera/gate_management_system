import React, { useState, useEffect } from 'react';
import { deliveriesAPI, unitsAPI, formatDateTime } from '../utils/api.js';

const EMPTY = { unit:'', courier_name:'', courier_company:'', tracking_number:'', item_description:'', notes:'' };
const STATUS_BADGE = { pending:'badge-yellow', collected:'badge-green', returned:'badge-red' };

export default function Deliveries() {
  const [items, setItems]   = useState([]);
  const [units, setUnits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { unitsAPI.list().then(d => setUnits(d?.results || d || [])); }, []);
  useEffect(() => { fetch_(); }, [page, statusFilter]);

  async function fetch_() {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      const d = await deliveriesAPI.list(params);
      setItems(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await deliveriesAPI.create(form);
      setModal(false); setForm(EMPTY); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleCollect(id) {
    await deliveriesAPI.collect(id, {});
    fetch_();
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Deliveries</h1>
          <p>{total.toLocaleString()} delivery records</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}>
          <i className="bi bi-box-seam-fill" /> Log Delivery
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', gap:8 }}>
            {['','pending','collected','returned'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter===s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setStatusFilter(s); setPage(1); }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         items.length === 0 ? <div className="empty-state"><i className="bi bi-box-seam" /><p>No deliveries found</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Unit</th><th>Courier</th><th>Company</th><th>Tracking</th><th>Received</th><th>Status</th><th>Collected</th><th></th></tr></thead>
              <tbody>
                {items.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight:600 }}>{d.unit_label}</td>
                    <td>{d.courier_name}</td>
                    <td style={{ color:'var(--text-2)' }}>{d.courier_company || '—'}</td>
                    <td><code style={{ fontSize:12 }}>{d.tracking_number || '—'}</code></td>
                    <td style={{ fontSize:12.5, color:'var(--text-2)' }}>{formatDateTime(d.received_at)}</td>
                    <td><span className={`badge ${STATUS_BADGE[d.status]}`}>{d.status}</span></td>
                    <td style={{ fontSize:12.5, color:'var(--text-2)' }}>{d.collected_at ? formatDateTime(d.collected_at) : '—'}</td>
                    <td>
                      {d.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleCollect(d.id)}>
                          <i className="bi bi-check2" /> Collected
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

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Log Delivery</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-group">
                  <label className="form-label required">Recipient Unit</label>
                  <select className="form-control" required value={form.unit}
                    onChange={e => setForm(f=>({...f, unit: e.target.value}))}>
                    <option value="">Select unit…</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.block_name} – {u.unit_number}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Courier Name</label>
                    <input className="form-control" required value={form.courier_name}
                      onChange={e => setForm(f=>({...f, courier_name: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Courier Company</label>
                    <input className="form-control" placeholder="DHL, Glovo…" value={form.courier_company}
                      onChange={e => setForm(f=>({...f, courier_company: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tracking Number</label>
                  <input className="form-control mono" value={form.tracking_number}
                    onChange={e => setForm(f=>({...f, tracking_number: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Description</label>
                  <textarea className="form-control" rows={2} value={form.item_description}
                    onChange={e => setForm(f=>({...f, item_description: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-control" value={form.notes}
                    onChange={e => setForm(f=>({...f, notes: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : <i className="bi bi-box-seam-fill" />}
                  Log Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}