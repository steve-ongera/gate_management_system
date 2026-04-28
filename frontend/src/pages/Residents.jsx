import React, { useState, useEffect } from 'react';
import { residentsAPI, unitsAPI, formatDate } from '../utils/api.js';

const EMPTY_FORM = {
  full_name: '', national_id: '', phone: '', email: '',
  unit: '', is_primary: false, move_in_date: '', notes: '',
};

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [units, setUnits]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState(null); // null | 'add' | 'edit'
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => { unitsAPI.list().then(d => setUnits(d?.results || d || [])); }, []);
  useEffect(() => { fetchResidents(); }, [search, page]);

  async function fetchResidents() {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const data = await residentsAPI.list(params);
      setResidents(data?.results || data || []);
      setTotal(data?.count || 0);
    } finally { setLoading(false); }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError('');
    setModal('add');
  }

  function openEdit(r) {
    setForm({
      full_name: r.full_name, national_id: r.national_id,
      phone: r.phone, email: r.email || '',
      unit: r.unit || '', is_primary: r.is_primary,
      move_in_date: r.move_in_date || '', notes: r.notes || '',
    });
    setSelected(r);
    setError('');
    setModal('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal === 'add') {
        await residentsAPI.create(form);
      } else {
        await residentsAPI.update(selected.id, form);
      }
      setModal(null);
      fetchResidents();
    } catch (err) {
      const d = err?.data || {};
      setError(Object.values(d).flat().join(' ') || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDeactivate(r) {
    if (!confirm(`Deactivate ${r.full_name}?`)) return;
    await residentsAPI.update(r.id, { is_active: false });
    fetchResidents();
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Residents</h1>
          <p>{total.toLocaleString()} registered residents</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-person-plus-fill" /> Add Resident
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div className="search-bar" style={{ width: 300 }}>
            <i className="bi bi-search" />
            <input placeholder="Search name, ID, phone…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner" /> Loading…</div>
        ) : residents.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-people" />
            <p>No residents found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>National ID</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Vehicles</th>
                  <th>Move In</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {residents.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--primary-light)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}>
                          {r.full_name.split(' ').map(w => w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{r.unit_label || '—'}</td>
                    <td><code style={{ fontSize: 12 }}>{r.national_id}</code></td>
                    <td style={{ color: 'var(--text-2)' }}>{r.phone}</td>
                    <td>
                      <span className={`badge ${r.is_primary ? 'badge-blue' : 'badge-gray'}`}>
                        {r.is_primary ? 'Primary' : 'Member'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{r.vehicle_count}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{formatDate(r.move_in_date)}</td>
                    <td>
                      <span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailModal(r)} title="View">
                          <i className="bi bi-eye" />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        {r.is_active && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(r)} title="Deactivate">
                            <i className="bi bi-person-dash" style={{ color: 'var(--danger)' }} />
                          </button>
                        )}
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
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p-1)} disabled={page===1}>
              <i className="bi bi-chevron-left" />
            </button>
            <span style={{ padding: '5px 10px', fontSize: 13, color: 'var(--text-2)' }}>
              {page} / {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p+1)} disabled={page===totalPages}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                {modal === 'add' ? 'Add Resident' : `Edit – ${selected?.full_name}`}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>
                <i className="bi bi-x" />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle-fill" />{error}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Full Name</label>
                    <input className="form-control" required value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">National ID</label>
                    <input className="form-control" required value={form.national_id}
                      onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Phone</label>
                    <input className="form-control" required value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="form-control" value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      <option value="">Select unit…</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.block_name} – {u.unit_number}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Move In Date</label>
                    <input type="date" className="form-control" value={form.move_in_date}
                      onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_primary}
                      onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
                    <span className="form-label" style={{ margin: 0 }}>Primary tenant</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
                  {modal === 'add' ? 'Add Resident' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <ResidentDetailModal resident={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </>
  );
}

function ResidentDetailModal({ resident, onClose }) {
  const [history, setHistory] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    residentsAPI.history(resident.id).then(d => setHistory(d?.results || d || []));
    residentsAPI.vehicles(resident.id).then(d => setVehicles(d?.results || d || []));
  }, [resident.id]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <span className="modal-title">{resident.full_name}</span>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        </div>
        <div className="modal-body">
          <div className="form-row" style={{ marginBottom: 16 }}>
            {[
              { label: 'Unit',       val: resident.unit_label },
              { label: 'Phone',      val: resident.phone },
              { label: 'National ID',val: resident.national_id },
              { label: 'Email',      val: resident.email || '—' },
              { label: 'Move In',    val: formatDate(resident.move_in_date) },
              { label: 'Role',       val: resident.is_primary ? 'Primary Tenant' : 'Household Member' },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 500 }}>{val || '—'}</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 10 }}>Vehicles ({vehicles.length})</h3>
          {vehicles.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No vehicles registered</p> : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {vehicles.map(v => (
                <div key={v.id} style={{ padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <code>{v.plate_number}</code> · {v.make} {v.model} · <span style={{ color: 'var(--text-3)' }}>{v.color}</span>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginBottom: 10 }}>Recent Entries ({history.length})</h3>
          {history.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No entry history</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Direction</th><th>Gate</th><th>Check In</th><th>Check Out</th></tr></thead>
                <tbody>
                  {history.slice(0,8).map(e => (
                    <tr key={e.id}>
                      <td><span className={`badge ${e.direction === 'in' ? 'badge-green' : 'badge-gray'}`}>{e.direction}</span></td>
                      <td style={{ color: 'var(--text-2)' }}>{e.gate_name}</td>
                      <td style={{ fontSize: 12.5 }}>{formatDateTime(e.check_in_time)}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{e.check_out_time ? formatDateTime(e.check_out_time) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}