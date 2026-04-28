// src/pages/Dashboard.jsx  –  cx/cy bug fixed (was missing `const`)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, entriesAPI, formatDateTime } from '../utils/api.js';

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ data, color = 'var(--primary)' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            title={`${d.date}: ${d.count}`}
            style={{
              width: '100%', borderRadius: 4,
              height: `${Math.max((d.count / max) * 52, 4)}px`,
              background: color,
              opacity: 0.85,
              transition: 'height .3s ease',
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
            {d.date ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 110 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let angle = -90;
  // ✅ Fixed: cx and cy now properly declared with const
  const r = 42, cx = size / 2, cy = size / 2;
  const paths = segments.map(seg => {
    const pct = total ? seg.value / total : 0;
    const a = pct * 360;
    const large = a > 180 ? 1 : 0;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + a) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle += a;
    return { ...seg, d, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="var(--surface-2)" />
      {paths.map((p, i) => p.pct > 0 && (
        <path key={i} d={p.d} fill={p.color} opacity={0.9} />
      ))}
      <circle cx={cx} cy={cy} r={26} fill="var(--surface)" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text)" fontSize="14" fontWeight="700">{total}</text>
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, iconClass }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${iconClass}`}><i className={`bi ${icon}`} /></div>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      entriesAPI.live(),
    ]).then(([s, l]) => {
      setStats(s);
      setLive(l?.results || l || []);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-refresh live every 30s
  useEffect(() => {
    const t = setInterval(() => {
      entriesAPI.live().then(l => setLive(l?.results || l || [])).catch(() => {});
      dashboardAPI.stats().then(setStats).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <span className="spinner" />
        Loading dashboard…
      </div>
    );
  }

  const typeBreakdown = stats?.entry_type_breakdown || {};
  const donutSegments = [
    { label: 'Resident',   value: typeBreakdown.resident   || 0, color: 'var(--primary)' },
    { label: 'Visitor',    value: typeBreakdown.visitor    || 0, color: 'var(--accent)' },
    { label: 'Delivery',   value: typeBreakdown.delivery   || 0, color: 'var(--success)' },
    { label: 'Contractor', value: typeBreakdown.contractor || 0, color: 'var(--warning)' },
    { label: 'Emergency',  value: typeBreakdown.emergency  || 0, color: 'var(--danger)' },
  ];

  return (
    <>
      {/* Stat grid */}
      <div className="stat-grid">
        <StatCard icon="bi-people-fill"      label="Total Residents"    value={stats?.total_residents}       sub={`${stats?.occupied_units}/${stats?.total_units} units occupied`} iconClass="icon-blue" />
        <StatCard icon="bi-door-open-fill"   label="Entries Today"      value={stats?.entries_today}         sub={`${stats?.exits_today} exits`}             iconClass="icon-green" />
        <StatCard icon="bi-people"           label="Currently Inside"   value={stats?.currently_inside}      sub="live count"                                iconClass="icon-cyan" />
        <StatCard icon="bi-person-badge"     label="Visitor Entries"    value={stats?.visitor_entries_today} sub="today"                                     iconClass="icon-yellow" />
        <StatCard icon="bi-box-seam"         label="Pending Parcels"    value={stats?.pending_deliveries}    sub="awaiting collection"                       iconClass="icon-blue" />
        <StatCard icon="bi-exclamation-triangle" label="Open Incidents" value={stats?.open_incidents}        sub="unresolved"                                iconClass="icon-red" />
        <StatCard icon="bi-car-front"        label="Vehicles"           value={stats?.total_vehicles}        sub="active"                                    iconClass="icon-green" />
        <StatCard icon="bi-slash-circle"     label="Blacklisted"        value={stats?.active_blacklist}      sub="active entries"                            iconClass="icon-red" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Entries – Last 7 Days</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/entries')}>View all</button>
          </div>
          <BarChart data={stats?.entries_this_week} color="var(--primary)" />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Today's Entry Breakdown</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DonutChart segments={donutSegments} />
            <div style={{ flex: 1 }}>
              {donutSegments.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
                  <strong style={{ fontSize: 13 }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy + Quick actions */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Unit Occupancy</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/units')}>
              Manage <i className="bi bi-arrow-right" />
            </button>
          </div>
          {[
            { label: 'Occupied', val: stats?.occupied_units,                                 total: stats?.total_units, color: 'var(--success)' },
            { label: 'Vacant',   val: (stats?.total_units - stats?.occupied_units),          total: stats?.total_units, color: 'var(--warning)' },
          ].map(item => {
            const pct = stats?.total_units ? (item.val / stats.total_units) * 100 : 0;
            return (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-2)' }}>{item.label}</span>
                  <span><strong>{item.val}</strong> / {item.total}</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 20, transition: 'width .5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Quick Actions</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: 'bi-door-open-fill',              label: 'Check In',    path: '/check-in',  color: 'var(--primary)' },
              { icon: 'bi-box-seam-fill',               label: 'Log Delivery',path: '/deliveries',color: 'var(--success)' },
              { icon: 'bi-exclamation-triangle-fill',   label: 'Log Incident',path: '/incidents', color: 'var(--danger)' },
              { icon: 'bi-person-plus-fill',            label: 'Add Resident',path: '/residents', color: 'var(--accent)' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                style={{
                  padding: '14px 12px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <i className={`bi ${a.icon}`} style={{ fontSize: '1.4rem', color: a.color, display: 'block', marginBottom: 6 }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live entries table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Currently Inside
            <span className="badge badge-green" style={{ marginLeft: 8 }}>{live.length}</span>
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/entries?inside_only=true')}>Full list</button>
        </div>
        {live.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-building" />
            <p>No one is currently checked in</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th><th>Type</th><th>Gate</th><th>Vehicle</th><th>Checked In</th><th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {live.slice(0, 10).map(e => (
                  <tr key={e.id}>
                    <td><strong style={{ fontSize: 13 }}>{e.resident_name || e.visitor_name || '—'}</strong></td>
                    <td>
                      <span className={`badge ${
                        e.entry_type === 'resident' ? 'badge-blue'   :
                        e.entry_type === 'visitor'  ? 'badge-yellow' :
                        e.entry_type === 'delivery' ? 'badge-green'  : 'badge-gray'
                      }`}>{e.entry_type}</span>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{e.gate_name || '—'}</td>
                    <td><code style={{ fontSize: 12 }}>{e.vehicle_plate || '—'}</code></td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{formatDateTime(e.check_in_time)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{e.host_unit_label || '—'}</td>
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