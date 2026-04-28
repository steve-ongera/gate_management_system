import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI, formatDateTime } from '../utils/api.js';

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    notificationsAPI.list().then(data => {
      setNotifications(data?.results || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markRead(id) {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await notificationsAPI.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>

      <div className="topbar-actions">
        {/* Quick check-in button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/check-in')}
        >
          <i className="bi bi-plus-circle-fill" />
          Check In
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowNotif(s => !s)}
          >
            <i className="bi bi-bell" />
            {unread > 0 && <span className="notif-dot" />}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              width: 340,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <strong style={{ fontSize: 13 }}>Notifications</strong>
                {unread > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <i className="bi bi-bell-slash" />
                    <p>No notifications</p>
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: n.is_read ? 'transparent' : 'var(--primary-light)',
                      transition: 'background 150ms',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                    <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 2 }}>{n.message}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 4 }}>
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="topbar-icon-btn" title="Full screen"
          onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>
          <i className="bi bi-fullscreen" />
        </button>
      </div>
    </header>
  );
}