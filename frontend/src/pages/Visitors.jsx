// pages/Visitors.jsx
import React, { useState, useEffect } from 'react';
import { visitorsAPI, formatDateTime } from '../utils/api.js';

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => { fetch_(); }, [search, page]);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await visitorsAPI.list({ page, ...(search ? { search } : {}) });
      setVisitors(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Visitors</h1>
          <p>{total.toLocaleString()} visitor records</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div className="search-bar" style={{ width: 280 }}>
            <i className="bi bi-search" />
            <input placeholder="Name, ID, phone…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         visitors.length === 0 ? <div className="empty-state"><i className="bi bi-person-badge" /><p>No visitors found</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>National ID</th><th>Phone</th><th>Blacklisted</th><th>First Visit</th></tr></thead>
              <tbody>
                {visitors.map(v => (
                  <tr key={v.id}>
                    <td><strong style={{ fontSize:13 }}>{v.full_name}</strong></td>
                    <td><code style={{ fontSize:12 }}>{v.national_id || '—'}</code></td>
                    <td style={{ color:'var(--text-2)' }}>{v.phone || '—'}</td>
                    <td>
                      {v.is_blacklisted
                        ? <span className="badge badge-red"><i className="bi bi-slash-circle" /> Blacklisted</span>
                        : <span className="badge badge-green">Clear</span>}
                    </td>
                    <td style={{ color:'var(--text-2)', fontSize:12.5 }}>{formatDateTime(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}