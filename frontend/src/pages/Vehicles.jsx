import React, { useState, useEffect } from 'react';
import { vehiclesAPI, residentsAPI } from '../utils/api.js';

const EMPTY = { plate_number:'', vehicle_type:'car', make:'', model:'', color:'', year:'', resident:'', sticker_number:'' };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [resSearch, setResSearch] = useState('');

  useEffect(() => { fetch_(); }, [search, page]);

  useEffect(() => {
    if (resSearch.length > 1) {
      residentsAPI.list({ search: resSearch }).then(d => setResidents(d?.results || d || []));
    }
  }, [resSearch]);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await vehiclesAPI.list({ page, ...(search ? { search } : {}) });
      setVehicles(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  function openAdd() { setForm(EMPTY); setSelected(null); setError(''); setModal(true); }
  function openEdit(v) {
    setForm({ plate_number: v.plate_number, vehicle_type: v.vehicle_type, make: v.make,
      model: v.model, color: v.color, year: v.year || '', resident: v.resident || '', sticker_number: v.sticker_number });
    setSelected(v); setError(''); setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.year) delete payload.year;
      if (!payload.resident) delete payload.resident;
      selected ? await vehiclesAPI.update(selected.id, payload) : await vehiclesAPI.create(payload);
      setModal(false); fetch_();
    } catch (err) {
      setError(Object.values(err?.data || {}).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  const TYPE_ICONS = { car:'bi-car-front-fill', motorcycle:'bi-bicycle', truck:'bi-truck', van:'bi-minecart', bicycle:'bi-bicycle', other:'bi-question-circle' };
  const totalPages = Math.ceil(total / 25);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vehicles</h1>
          <p>{total.toLocaleString()} registered vehicles</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-circle-fill" /> Add Vehicle
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div className="search-bar" style={{ width: 280 }}>
            <i className="bi bi-search" />
            <input placeholder="Plate, make, model, resident…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         vehicles.length === 0 ? (
           <div className="empty-state"><i className="bi bi-car-front" /><p>No vehicles found</p></div>
         ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Plate</th><th>Type</th><th>Make / Model</th><th>Color</th><th>Year</th><th>Resident</th><th>Sticker</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><code style={{ fontWeight: 700, fontSize: 13 }}>{v.plate_number}</code></td>
                    <td>
                      <span className="badge badge-gray">
                        <i className={`bi ${TYPE_ICONS[v.vehicle_type] || 'bi-question-circle'}`} />
                        {v.vehicle_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{v.make} {v.model}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: v.color?.toLowerCase() || '#ccc', border: '1px solid var(--border)' }} />
                        {v.color || '—'}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{v.year || '—'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{v.resident_name || <span style={{ color: 'var(--text-3)' }}>Unregistered</span>}</td>
                    <td><code style={{ fontSize: 11.5 }}>{v.sticker_number || '—'}</code></td>
                    <td><span className={`badge ${v.is_active ? 'badge-green' : 'badge-red'}`}>{v.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}><i className="bi bi-pencil" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p-1)} disabled={page===1}><i className="bi bi-chevron-left" /></button>
            <span style={{ padding:'5px 10px', fontSize:13, color:'var(--text-2)' }}>{page}/{totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}><i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{selected ? 'Edit Vehicle' : 'Register Vehicle'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="bi bi-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Plate Number</label>
                    <input className="form-control mono" required value={form.plate_number}
                      onChange={e => setForm(f=>({...f, plate_number: e.target.value.toUpperCase()}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-control" value={form.vehicle_type}
                      onChange={e => setForm(f=>({...f, vehicle_type: e.target.value}))}>
                      {['car','motorcycle','truck','van','bicycle','other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Make</label>
                    <input className="form-control" placeholder="Toyota" value={form.make}
                      onChange={e => setForm(f=>({...f, make: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input className="form-control" placeholder="Corolla" value={form.model}
                      onChange={e => setForm(f=>({...f, model: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input className="form-control" placeholder="White" value={form.color}
                      onChange={e => setForm(f=>({...f, color: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input className="form-control" type="number" min="1990" max={new Date().getFullYear()+1}
                      value={form.year} onChange={e => setForm(f=>({...f, year: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Resident</label>
                  <div className="search-bar" style={{ marginBottom: 6 }}>
                    <i className="bi bi-search" />
                    <input placeholder="Type resident name…" value={resSearch}
                      onChange={e => setResSearch(e.target.value)} />
                  </div>
                  {residents.length > 0 && (
                    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden' }}>
                      {residents.map(r => (
                        <div key={r.id} onClick={() => { setForm(f=>({...f, resident: r.id})); setResSearch(r.full_name); setResidents([]); }}
                          style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                            background: form.resident===r.id ? 'var(--primary-light)' : 'var(--surface)' }}>
                          <strong style={{ fontSize:13 }}>{r.full_name}</strong>
                          <span style={{ color:'var(--text-2)', fontSize:12, marginLeft:8 }}>{r.unit_label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Sticker / Permit Number</label>
                  <input className="form-control mono" value={form.sticker_number}
                    onChange={e => setForm(f=>({...f, sticker_number: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
                  {selected ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}