import React, { useState, useEffect } from 'react';
import { auditAPI, formatDateTime } from '../utils/api.js';

const ACTION_BADGE = {
  create:'badge-green', update:'badge-blue', delete:'badge-red',
  login:'badge-cyan', logout:'badge-gray', approve:'badge-green', deny:'badge-red',
};

export default function AuditLog() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => { fetch_(); }, [page]);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await auditAPI.list({ page });
      setLogs(d?.results || d || []);
      setTotal(d?.count || 0);
    } finally { setLoading(false); }
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Log</h1>
          <p>{total.toLocaleString()} recorded actions</p>
        </div>
        <button className="btn btn-outline" onClick={fetch_}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><span className="spinner" /></div> :
         logs.length === 0 ? <div className="empty-state"><i className="bi bi-journal-x" /><p>No audit logs</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Description</th><th>IP</th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize:12.5, whiteSpace:'nowrap', color:'var(--text-2)', fontFamily:'DM Mono' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <span style={{ fontWeight:600, fontSize:13 }}>{log.user_name || '—'}</span>
                    </td>
                    <td>
                      <span className={`badge ${ACTION_BADGE[log.action] || 'badge-gray'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-2)', fontSize:12.5 }}>{log.model_name}</td>
                    <td style={{ maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5, color:'var(--text-2)' }}>
                      {log.description}
                    </td>
                    <td><code style={{ fontSize:11 }}>{log.ip_address || '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>Page {page} of {totalPages}</span>
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p-1)} disabled={page===1}><i className="bi bi-chevron-left" /></button>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}><i className="bi bi-chevron-right" /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}