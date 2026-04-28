// pages/Parking.jsx
import React, { useState, useEffect } from 'react';
import { parkingAPI } from '../utils/api.js';

export default function Parking() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetch_(); }, []);

  async function fetch_() {
    setLoading(true);
    try {
      const d = await parkingAPI.list();
      setSlots(d?.results || d || []);
    } finally { setLoading(false); }
  }

  const filtered = filter === 'all' ? slots
    : filter === 'occupied' ? slots.filter(s => s.is_occupied)
    : slots.filter(s => !s.is_occupied);

  const occupied = slots.filter(s => s.is_occupied).length;
  const total = slots.length;

  const TYPE_COLOR = { resident:'badge-blue', visitor:'badge-yellow', disabled:'badge-cyan' };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Parking</h1>
          <p>{occupied} / {total} slots occupied</p>
        </div>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {[
          { label:'Total Slots', val:total, icon:'bi-p-square-fill', cls:'icon-blue' },
          { label:'Occupied', val:occupied, icon:'bi-car-front-fill', cls:'icon-red' },
          { label:'Available', val:total-occupied, icon:'bi-p-circle-fill', cls:'icon-green' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">{s.label}</span>
              <div className={`stat-icon ${s.cls}`}><i className={`bi ${s.icon}`} /></div>
            </div>
            <div className="stat-value">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom:12 }}>
          {['all','occupied','available'].map(f => (
            <button key={f} className={`btn btn-sm ${filter===f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f)} style={{ marginRight:4, textTransform:'capitalize' }}>{f}</button>
          ))}
        </div>

        {loading ? <div className="loading-center"><span className="spinner" /></div> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10 }}>
            {filtered.map(slot => (
              <div key={slot.id} style={{
                padding:14, borderRadius:'var(--radius-sm)',
                border:`2px solid ${slot.is_occupied ? 'var(--danger)' : 'var(--success)'}`,
                background: slot.is_occupied ? 'var(--danger-light)' : 'var(--success-light)',
                textAlign:'center',
              }}>
                <div style={{ fontSize:'1.5rem', fontWeight:700, fontFamily:'DM Mono', color: slot.is_occupied ? 'var(--danger)' : 'var(--success)' }}>
                  {slot.slot_number}
                </div>
                <div style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>
                  <span className={`badge ${TYPE_COLOR[slot.slot_type] || 'badge-gray'}`}>{slot.slot_type}</span>
                </div>
                {slot.is_occupied && (
                  <div style={{ marginTop:6, fontSize:11.5 }}>
                    <code>{slot.vehicle_plate || '—'}</code>
                    <div style={{ color:'var(--text-2)', fontSize:11, marginTop:2 }}>{slot.resident_name || 'Visitor'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}