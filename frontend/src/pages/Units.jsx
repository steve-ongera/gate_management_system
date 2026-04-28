// pages/Units.jsx
import React, { useState, useEffect } from 'react';
import { unitsAPI, blocksAPI } from '../utils/api.js';

const STATUS_BADGE = { occupied:'badge-green', vacant:'badge-yellow', maintenance:'badge-red' };
const EMPTY_UNIT = { block:'', unit_number:'', floor:1, status:'vacant' };

export default function Units() {
  const [units, setUnits]   = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [blockFilter, setBlockFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_UNIT);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { blocksAPI.list().then(d => setBlocks(d?.results || d || [])); }, []);
  useEffect(() => { fetch_(); }, [page, blockFilter, statusFilter]);

  async function fetch_() {
    setLoading(true);
    try {
      const params = { page };
      if (blockFilter) params.block = blockFilter;
      if (statusFilter) params.status = statusFilter;
      const d = await unitsAPI.list(params);
      setUnits(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  function openAdd() { setForm(EMPTY_UNIT); setSelected(null); setError(''); setModal(true); }
  function openEdit(u) {
    setForm({ block: u.block, unit_number: u.unit_number, floor: u.floor, status: u.status });
    setSelected(u); setError(''); setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      selected ? await unitsAPI.update(selected.id, form) : await unitsAPI.create(form);
      setModal(false); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Units & Blocks</h1><p>{total} units</p></div>
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-circle-fill" /> Add Unit</button>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <select className="form-control" style={{ width:160 }} value={blockFilter}
            onChange={e => { setBlockFilter(e.target.value); setPage(1); }}>
            <option value="">All Blocks</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="form-control" style={{ width:160 }} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         units.length === 0 ? <div className="empty-state"><i className="bi bi-building" /><p>No units found</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Unit</th><th>Block</th><th>Floor</th><th>Status</th><th>Residents</th><th></th></tr></thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id}>
                    <td><strong style={{ fontFamily:'DM Mono', fontSize:14 }}>{u.unit_number}</strong></td>
                    <td style={{ color:'var(--text-2)' }}>{u.block_name}</td>
                    <td style={{ color:'var(--text-2)' }}>Floor {u.floor}</td>
                    <td><span className={`badge ${STATUS_BADGE[u.status]}`}>{u.status}</span></td>
                    <td style={{ color:'var(--text-2)' }}>{u.resident_count}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                        <i className="bi bi-pencil" />
                      </button>
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
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <span className="modal-title">{selected ? 'Edit Unit' : 'Add Unit'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-group">
                  <label className="form-label required">Block</label>
                  <select className="form-control" required value={form.block}
                    onChange={e => setForm(f=>({...f, block: e.target.value}))}>
                    <option value="">Select block…</option>
                    {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Unit Number</label>
                    <input className="form-control mono" required value={form.unit_number}
                      onChange={e => setForm(f=>({...f, unit_number: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor</label>
                    <input type="number" className="form-control" min={0} value={form.floor}
                      onChange={e => setForm(f=>({...f, floor: parseInt(e.target.value)||1}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status}
                    onChange={e => setForm(f=>({...f, status: e.target.value}))}>
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
                  {selected ? 'Save' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}