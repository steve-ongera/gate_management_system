import React, { useState, useEffect } from 'react';
import { entriesAPI, residentsAPI, visitorsAPI, vehiclesAPI, gatesAPI, unitsAPI, preAuthAPI } from '../utils/api.js';

const INITIAL_FORM = {
  entry_type: 'visitor',
  gate_id: '',
  direction: 'in',

  // Resident
  resident_id: '',

  // Visitor
  visitor_id: '',
  visitor_name: '',
  visitor_phone: '',
  visitor_national_id: '',

  // Vehicle
  vehicle_id: '',
  vehicle_plate: '',

  // Common
  host_unit_id: '',
  purpose: '',
  notes: '',
  pre_auth_code: '',
};

export default function CheckIn() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [gates, setGates] = useState([]);
  const [units, setUnits] = useState([]);
  const [residents, setResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorResults, setVisitorResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('checkin'); // checkin | checkout

  // Checkout state
  const [liveEntries, setLiveEntries] = useState([]);
  const [coSearch, setCoSearch] = useState('');

  useEffect(() => {
    gatesAPI.list().then(d => setGates(d?.results || d || []));
    unitsAPI.list().then(d => setUnits(d?.results || d || []));
  }, []);

  useEffect(() => {
    if (residentSearch.length > 1) {
      residentsAPI.list({ search: residentSearch }).then(d => setResidents(d?.results || d || []));
    }
  }, [residentSearch]);

  useEffect(() => {
    if (visitorSearch.length > 1) {
      visitorsAPI.list({ search: visitorSearch }).then(d => setVisitorResults(d?.results || d || []));
    }
  }, [visitorSearch]);

  useEffect(() => {
    if (tab === 'checkout') {
      entriesAPI.live().then(d => setLiveEntries(d?.results || d || []));
    }
  }, [tab]);

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    const payload = { ...form };
    // Clean empty strings
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

    try {
      const entry = await entriesAPI.checkIn(payload);
      setSuccess(`✓ ${entry.resident_name || entry.visitor_name} checked in successfully at ${entry.gate_name}.`);
      setForm(INITIAL_FORM);
      setResidentSearch('');
      setVisitorSearch('');
    } catch (err) {
      const msg = err?.data?.error || err?.data?.detail || JSON.stringify(err?.data) || 'Check-in failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut(entryId) {
    setLoading(true);
    try {
      await entriesAPI.checkOut({ entry_id: entryId });
      setLiveEntries(prev => prev.filter(e => e.id !== entryId));
      setSuccess('✓ Checked out successfully.');
    } catch (err) {
      setError('Check-out failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredLive = liveEntries.filter(e => {
    const q = coSearch.toLowerCase();
    return !q ||
      (e.resident_name || '').toLowerCase().includes(q) ||
      (e.visitor_name  || '').toLowerCase().includes(q) ||
      (e.vehicle_plate || '').toLowerCase().includes(q);
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gate Check In / Out</h1>
          <p>Record entry and exit of people and vehicles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab === 'checkin' ? ' active' : ''}`} onClick={() => setTab('checkin')}>
          <i className="bi bi-box-arrow-in-right" /> Check In
        </button>
        <button className={`tab${tab === 'checkout' ? ' active' : ''}`} onClick={() => setTab('checkout')}>
          <i className="bi bi-box-arrow-left" /> Check Out
          <span className="badge badge-blue" style={{ marginLeft: 6 }}>{liveEntries.length || ''}</span>
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          <i className="bi bi-check-circle-fill" />{success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-circle-fill" />{error}
        </div>
      )}

      {/* ── CHECK IN FORM ── */}
      {tab === 'checkin' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <h3 style={{ marginBottom: 18 }}>Entry Details</h3>
            <form onSubmit={handleCheckIn}>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Entry Type</label>
                  <select className="form-control" value={form.entry_type}
                    onChange={e => setField('entry_type', e.target.value)}>
                    <option value="resident">Resident</option>
                    <option value="visitor">Visitor</option>
                    <option value="delivery">Delivery</option>
                    <option value="contractor">Contractor</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Gate</label>
                  <select className="form-control" value={form.gate_id}
                    onChange={e => setField('gate_id', e.target.value)} required>
                    <option value="">Select gate…</option>
                    {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Resident lookup */}
              {form.entry_type === 'resident' && (
                <div className="form-group">
                  <label className="form-label required">Search Resident</label>
                  <div className="search-bar" style={{ marginBottom: 6 }}>
                    <i className="bi bi-search" />
                    <input
                      placeholder="Name, ID, phone…"
                      value={residentSearch}
                      onChange={e => setResidentSearch(e.target.value)}
                    />
                  </div>
                  {residents.length > 0 && (
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}>
                      {residents.map(r => (
                        <div
                          key={r.id}
                          onClick={() => { setField('resident_id', r.id); setResidentSearch(r.full_name); setResidents([]); }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            background: form.resident_id === r.id ? 'var(--primary-light)' : 'var(--surface)',
                          }}
                        >
                          <strong style={{ fontSize: 13 }}>{r.full_name}</strong>
                          <span style={{ color: 'var(--text-2)', fontSize: 12, marginLeft: 8 }}>{r.unit_label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visitor details */}
              {form.entry_type !== 'resident' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Search Existing Visitor</label>
                    <div className="search-bar" style={{ marginBottom: 6 }}>
                      <i className="bi bi-search" />
                      <input
                        placeholder="Name or ID…"
                        value={visitorSearch}
                        onChange={e => setVisitorSearch(e.target.value)}
                      />
                    </div>
                    {visitorResults.length > 0 && (
                      <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                      }}>
                        {visitorResults.map(v => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setField('visitor_id', v.id);
                              setField('visitor_name', v.full_name);
                              setField('visitor_phone', v.phone);
                              setField('visitor_national_id', v.national_id);
                              setVisitorSearch(v.full_name);
                              setVisitorResults([]);
                            }}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                          >
                            <strong style={{ fontSize: 13 }}>{v.full_name}</strong>
                            <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 8 }}>{v.phone}</span>
                            {v.is_blacklisted && <span className="badge badge-red" style={{ marginLeft: 8 }}>BLACKLISTED</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '-8px 0 12px', textAlign: 'center' }}>— or enter new visitor —</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label required">Full Name</label>
                      <input className="form-control" placeholder="John Doe"
                        value={form.visitor_name}
                        onChange={e => setField('visitor_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-control" placeholder="+254 7xx xxx xxx"
                        value={form.visitor_phone}
                        onChange={e => setField('visitor_phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">National ID / Passport</label>
                    <input className="form-control" placeholder="ID number"
                      value={form.visitor_national_id}
                      onChange={e => setField('visitor_national_id', e.target.value)} />
                  </div>
                </>
              )}

              {/* Host unit */}
              {form.entry_type !== 'resident' && (
                <div className="form-group">
                  <label className="form-label">Visiting Unit</label>
                  <select className="form-control" value={form.host_unit_id}
                    onChange={e => setField('host_unit_id', e.target.value)}>
                    <option value="">Select unit…</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.block_name} – {u.unit_number}</option>)}
                  </select>
                </div>
              )}

              {/* Vehicle */}
              <div className="form-group">
                <label className="form-label">Vehicle Plate Number</label>
                <input className="form-control" placeholder="KCA 000A"
                  value={form.vehicle_plate}
                  onChange={e => setField('vehicle_plate', e.target.value.toUpperCase())} />
              </div>

              {/* Purpose */}
              <div className="form-group">
                <label className="form-label">Purpose of Visit</label>
                <input className="form-control" placeholder="Meeting, delivery, maintenance…"
                  value={form.purpose}
                  onChange={e => setField('purpose', e.target.value)} />
              </div>

              {/* Pre-auth code */}
              <div className="form-group">
                <label className="form-label">Pre-Authorization Code</label>
                <input className="form-control mono" placeholder="e.g. AB3X7YZW"
                  value={form.pre_auth_code}
                  onChange={e => setField('pre_auth_code', e.target.value.toUpperCase())} />
                <span className="form-hint">Leave blank if no pre-auth was issued</span>
              </div>

              <button type="submit" className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <i className="bi bi-door-open-fill" />}
                Record Check In
              </button>
            </form>
          </div>

          {/* Info panel */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>
                <i className="bi bi-info-circle" style={{ marginRight: 6, color: 'var(--primary)' }} />
                Quick Tips
              </h3>
              {[
                'Search for existing residents/visitors to auto-fill details.',
                'Enter vehicle plate for parking/vehicle tracking.',
                'Use pre-authorization code for pre-cleared visitors.',
                'Residents in the host unit are notified automatically.',
                'Blacklisted individuals are blocked automatically.',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{tip}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Pre-Authorization Verify</h3>
              <PreAuthVerify />
            </div>
          </div>
        </div>
      )}

      {/* ── CHECK OUT ── */}
      {tab === 'checkout' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">People Currently Inside ({filteredLive.length})</span>
            <div className="search-bar" style={{ width: 260 }}>
              <i className="bi bi-search" />
              <input placeholder="Search name or plate…" value={coSearch}
                onChange={e => setCoSearch(e.target.value)} />
            </div>
          </div>
          {filteredLive.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-building" />
              <p>No active check-ins</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Type</th>
                    <th>Unit</th>
                    <th>Vehicle</th>
                    <th>Gate</th>
                    <th>Check-In Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLive.map(e => (
                    <tr key={e.id}>
                      <td><strong style={{ fontSize: 13 }}>{e.resident_name || e.visitor_name}</strong></td>
                      <td>
                        <span className={`badge ${e.entry_type === 'resident' ? 'badge-blue' : e.entry_type === 'visitor' ? 'badge-yellow' : 'badge-green'}`}>
                          {e.entry_type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{e.host_unit_label || '—'}</td>
                      <td><code style={{ fontSize: 12 }}>{e.vehicle_plate || '—'}</code></td>
                      <td style={{ color: 'var(--text-2)' }}>{e.gate_name}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        {new Date(e.check_in_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleCheckOut(e.id)}
                          disabled={loading}
                        >
                          <i className="bi bi-box-arrow-left" /> Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PreAuthVerify() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!code) return;
    setLoading(true);
    try {
      const r = await preAuthAPI.verify(code);
      setResult(r);
    } catch {
      setResult({ valid: false, error: 'Code not found.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          className="form-control mono"
          placeholder="Enter code…"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          style={{ flex: 1 }}
        />
        <button className="btn btn-outline" onClick={verify} disabled={loading || !code}>
          {loading ? '…' : 'Verify'}
        </button>
      </div>
      {result && (
        <div className={`alert ${result.valid ? 'alert-success' : 'alert-danger'}`}>
          <i className={`bi ${result.valid ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
          {result.valid
            ? `Valid – ${result.pre_auth?.visitor_name} → ${result.pre_auth?.unit_label}`
            : result.error || 'Invalid code'}
        </div>
      )}
    </div>
  );
}