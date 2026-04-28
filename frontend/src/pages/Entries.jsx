import React, { useState, useEffect } from 'react';
import { entriesAPI, gatesAPI, formatDateTime } from '../utils/api.js';

const DIRECTION_BADGE = { in: 'badge-green', out: 'badge-gray' };
const TYPE_BADGE = {
  resident: 'badge-blue', visitor: 'badge-yellow',
  delivery: 'badge-cyan', contractor: 'badge-gray', emergency: 'badge-red',
};

export default function Entries() {
  const [entries, setEntries]   = useState([]);
  const [gates, setGates]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 25;

  const [filters, setFilters] = useState({
    search: '', date: '', entry_type: '', direction: '', gate: '',
  });

  useEffect(() => {
    gatesAPI.list().then(d => setGates(d?.results || d || []));
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [filters, page]);

  async function fetchEntries() {
    setLoading(true);
    const params = { page };
    if (filters.search)     params.search     = filters.search;
    if (filters.date)       params.date       = filters.date;
    if (filters.entry_type) params.entry_type = filters.entry_type;
    if (filters.direction)  params.direction  = filters.direction;
    if (filters.gate)       params.gate       = filters.gate;
    try {
      const data = await entriesAPI.list(params);
      setEntries(data?.results || data || []);
      setTotal(data?.count || 0);
    } finally {
      setLoading(false);
    }
  }

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Entry Log</h1>
          <p>{total.toLocaleString()} total records</p>
        </div>
        <button className="btn btn-outline" onClick={fetchEntries}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 180 }}>
            <i className="bi bi-search" />
            <input
              placeholder="Search name, plate, badge…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>

          <input
            type="date"
            className="form-control"
            style={{ width: 160 }}
            value={filters.date}
            onChange={e => setFilter('date', e.target.value)}
          />

          <select className="form-control" style={{ width: 140 }}
            value={filters.direction} onChange={e => setFilter('direction', e.target.value)}>
            <option value="">All Directions</option>
            <option value="in">Check In</option>
            <option value="out">Check Out</option>
          </select>

          <select className="form-control" style={{ width: 150 }}
            value={filters.entry_type} onChange={e => setFilter('entry_type', e.target.value)}>
            <option value="">All Types</option>
            <option value="resident">Resident</option>
            <option value="visitor">Visitor</option>
            <option value="delivery">Delivery</option>
            <option value="contractor">Contractor</option>
            <option value="emergency">Emergency</option>
          </select>

          <select className="form-control" style={{ width: 150 }}
            value={filters.gate} onChange={e => setFilter('gate', e.target.value)}>
            <option value="">All Gates</option>
            {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {Object.values(filters).some(Boolean) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setFilters({ search:'',date:'',entry_type:'',direction:'',gate:'' }); setPage(1); }}>
              <i className="bi bi-x-circle" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><span className="spinner" /> Loading entries…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-journal-x" />
            <p>No entries found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Direction</th>
                    <th>Person</th>
                    <th>Type</th>
                    <th>Gate</th>
                    <th>Vehicle</th>
                    <th>Unit</th>
                    <th>Purpose</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Duration</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td>
                        <span className={`badge ${DIRECTION_BADGE[e.direction]}`}>
                          <i className={`bi bi-arrow-${e.direction === 'in' ? 'down' : 'up'}-circle`} />
                          {e.direction === 'in' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {e.resident_name || e.visitor_name || '—'}
                        </div>
                        {e.badge_number && (
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            #{e.badge_number}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${TYPE_BADGE[e.entry_type] || 'badge-gray'}`}>
                          {e.entry_type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{e.gate_name || '—'}</td>
                      <td>
                        <code style={{ fontSize: 12 }}>{e.vehicle_plate || '—'}</code>
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{e.host_unit_label || '—'}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)', fontSize: 12.5 }}>
                        {e.purpose || '—'}
                      </td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                        {formatDateTime(e.check_in_time)}
                      </td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                        {e.check_out_time ? formatDateTime(e.check_out_time) : (
                          e.direction === 'in'
                            ? <span className="badge badge-green">Inside</span>
                            : '—'
                        )}
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                        {e.duration_minutes != null ? `${e.duration_minutes}m` : '—'}
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        {e.recorded_by_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Page {page} of {totalPages} · {total.toLocaleString()} records
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPage(p)}>{p}</button>
                    );
                  })}
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}