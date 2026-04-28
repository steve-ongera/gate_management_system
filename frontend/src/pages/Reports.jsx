import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../utils/api.js';

function BarChart({ data, xKey, yKey, color = 'var(--primary)', height = 160 }) {
  if (!data?.length) return <p style={{ color:'var(--text-3)', fontSize:13 }}>No data</p>;
  const max = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height, paddingTop:8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:9, color:'var(--text-3)', minHeight:14 }}>{d[yKey]}</span>
          <div title={`${d[xKey]}: ${d[yKey]}`} style={{
            width:'100%', borderRadius:'4px 4px 0 0',
            height:`${Math.max((d[yKey] / max) * (height - 40), 4)}px`,
            background: color, opacity:0.85,
            transition:'height .4s ease',
          }} />
          <span style={{ fontSize:9, color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'100%', textOverflow:'ellipsis' }}>
            {d[xKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

function GroupedBar({ data }) {
  if (!data?.length) return <p style={{ color:'var(--text-3)', fontSize:13 }}>No data</p>;
  const maxVal = Math.max(...data.map(d => Math.max(d.residents||0, d.visitors||0, d.deliveries||0)), 1);
  const COLORS = { residents:'var(--primary)', visitors:'var(--warning)', deliveries:'var(--success)' };
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:8, fontSize:12 }}>
        {Object.entries(COLORS).map(([k,c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }} />
            <span style={{ color:'var(--text-2)', textTransform:'capitalize' }}>{k}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:140 }}>
        {data.slice(-14).map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:1, width:'100%', height:110 }}>
              {['residents','visitors','deliveries'].map(k => (
                <div key={k} title={`${k}: ${d[k]||0}`} style={{
                  flex:1, background:COLORS[k], borderRadius:'3px 3px 0 0', opacity:0.85,
                  height:`${Math.max(((d[k]||0)/maxVal)*100, d[k]?2:0)}%`,
                  transition:'height .4s',
                }} />
              ))}
            </div>
            <span style={{ fontSize:8.5, color:'var(--text-3)', marginTop:4, whiteSpace:'nowrap' }}>
              {d.day ? new Date(d.day).toLocaleDateString('en',{month:'short',day:'numeric'}) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const [entriesData, setEntriesData] = useState([]);
  const [incidentsData, setIncidentsData] = useState([]);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchAll(); }, [dateRange]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [e, inc, occ] = await Promise.all([
        reportsAPI.entries(dateRange),
        reportsAPI.incidents(dateRange),
        reportsAPI.occupancy(),
      ]);
      setEntriesData(e || []);
      setIncidentsData(inc || []);
      setOccupancyData(occ);
    } finally { setLoading(false); }
  }

  const totalEntries = entriesData.reduce((s, d) => s + (d.total||0), 0);
  const totalIncidents = incidentsData.reduce((s, d) => s + (d.count||0), 0);

  const SEV_COLOR = { low:'var(--success)', medium:'var(--warning)', high:'var(--danger)', critical:'#7f1d1d' };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Reports & Analytics</h1></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="date" className="form-control" style={{ width:150 }} value={dateRange.start}
            onChange={e => setDateRange(r=>({...r, start: e.target.value}))} />
          <span style={{ color:'var(--text-2)' }}>to</span>
          <input type="date" className="form-control" style={{ width:150 }} value={dateRange.end}
            onChange={e => setDateRange(r=>({...r, end: e.target.value}))} />
        </div>
      </div>

      {loading ? <div className="loading-center"><span className="spinner" /></div> : (
        <>
          {/* Summary stats */}
          <div className="stat-grid" style={{ marginBottom:20 }}>
            <div className="stat-card">
              <div className="stat-card-header"><span className="stat-label">Total Entries</span>
                <div className="stat-icon icon-blue"><i className="bi bi-door-open" /></div></div>
              <div className="stat-value">{totalEntries.toLocaleString()}</div>
              <div className="stat-sub">in selected period</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><span className="stat-label">Incidents</span>
                <div className="stat-icon icon-red"><i className="bi bi-exclamation-triangle" /></div></div>
              <div className="stat-value">{totalIncidents}</div>
              <div className="stat-sub">reported</div>
            </div>
            {occupancyData && (
              <>
                <div className="stat-card">
                  <div className="stat-card-header"><span className="stat-label">Occupancy Rate</span>
                    <div className="stat-icon icon-green"><i className="bi bi-building" /></div></div>
                  <div className="stat-value">
                    {occupancyData.total_units ? Math.round((occupancyData.occupied/occupancyData.total_units)*100) : 0}%
                  </div>
                  <div className="stat-sub">{occupancyData.occupied}/{occupancyData.total_units} units</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span className="stat-label">Vacant Units</span>
                    <div className="stat-icon icon-yellow"><i className="bi bi-house" /></div></div>
                  <div className="stat-value">{occupancyData.vacant}</div>
                  <div className="stat-sub">{occupancyData.maintenance} under maintenance</div>
                </div>
              </>
            )}
          </div>

          {/* Charts row 1 */}
          <div className="grid-2" style={{ marginBottom:20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Daily Entry Breakdown</span></div>
              <GroupedBar data={entriesData} />
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Total Entries Per Day</span></div>
              <BarChart data={entriesData} xKey="day" yKey="total" />
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid-2" style={{ marginBottom:20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Incidents by Category</span></div>
              {incidentsData.length === 0 ? (
                <div className="empty-state"><i className="bi bi-check-circle" /><p>No incidents in this period</p></div>
              ) : (
                <div>
                  {incidentsData.map((inc, i) => (
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                        <span style={{ color:'var(--text-2)', textTransform:'capitalize' }}>{inc.category} · <em style={{ fontSize:11, color: SEV_COLOR[inc.severity]||'var(--text-3)' }}>{inc.severity}</em></span>
                        <strong>{inc.count}</strong>
                      </div>
                      <div style={{ height:6, background:'var(--surface-2)', borderRadius:20, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${(inc.count/Math.max(...incidentsData.map(d=>d.count)))*100}%`,
                          background: SEV_COLOR[inc.severity]||'var(--primary)', borderRadius:20 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {occupancyData && (
              <div className="card">
                <div className="card-header"><span className="card-title">Unit Occupancy Breakdown</span></div>
                {[
                  { label:'Occupied',    val: occupancyData.occupied,    color:'var(--success)' },
                  { label:'Vacant',      val: occupancyData.vacant,      color:'var(--warning)' },
                  { label:'Maintenance', val: occupancyData.maintenance, color:'var(--danger)'  },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                      <span style={{ color:'var(--text-2)' }}>{item.label}</span>
                      <span><strong>{item.val}</strong> / {occupancyData.total_units}</span>
                    </div>
                    <div style={{ height:8, background:'var(--surface-2)', borderRadius:20, overflow:'hidden' }}>
                      <div style={{ height:'100%',
                        width:`${occupancyData.total_units ? (item.val/occupancyData.total_units)*100 : 0}%`,
                        background: item.color, borderRadius:20, transition:'width .5s' }} />
                    </div>
                  </div>
                ))}

                {/* Donut-style summary */}
                <div style={{ marginTop:16, padding:14, background:'var(--surface-2)', borderRadius:'var(--radius-sm)', display:'flex', justifyContent:'space-around', textAlign:'center' }}>
                  {[
                    { label:'Occupied %', val:`${occupancyData.total_units?Math.round((occupancyData.occupied/occupancyData.total_units)*100):0}%`, color:'var(--success)' },
                    { label:'Vacant %',   val:`${occupancyData.total_units?Math.round((occupancyData.vacant/occupancyData.total_units)*100):0}%`,   color:'var(--warning)' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize:'1.4rem', fontWeight:700, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:11.5, color:'var(--text-2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Entry data table */}
          <div className="card">
            <div className="card-header"><span className="card-title">Daily Entry Data</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Total</th><th>Residents</th><th>Visitors</th><th>Deliveries</th></tr></thead>
                <tbody>
                  {entriesData.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-3)', padding:24 }}>No data for selected period</td></tr>
                  ) : entriesData.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:'DM Mono', fontSize:13 }}>{d.day}</td>
                      <td><strong>{d.total}</strong></td>
                      <td style={{ color:'var(--primary)' }}>{d.residents||0}</td>
                      <td style={{ color:'var(--warning)' }}>{d.visitors||0}</td>
                      <td style={{ color:'var(--success)' }}>{d.deliveries||0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}