// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notificationsAPI, formatDateTime } from '../utils/api.js';

export default function Navbar({ title, onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif]         = useState(false);
  const [showProfile, setShowProfile]     = useState(false);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const unread = notifications.filter(n => !n.is_read).length;

  const initials = user
    ? (`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`).toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

  // Load notifications
  useEffect(() => {
    notificationsAPI.list().then(data => {
      setNotifications(data?.results || data || []);
    }).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
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
    setShowNotif(false);
  }

  async function handleLogout() {
    setShowProfile(false);
    await logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      {/* Hamburger – visible on mobile */}
      <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
        <i className="bi bi-list" />
      </button>

      <div className="topbar-title">{title}</div>

      <div className="topbar-actions">
        {/* Quick check-in */}
        <button
          className="btn btn-primary btn-sm topbar-checkin-btn"
          onClick={() => navigate('/check-in')}
        >
          <i className="bi bi-plus-circle-fill" />
          <span className="btn-label">Check In</span>
        </button>

        {/* ── Notifications ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            onClick={() => { setShowNotif(s => !s); setShowProfile(false); }}
            aria-label="Notifications"
          >
            <i className="bi bi-bell" />
            {unread > 0 && <span className="notif-dot" />}
          </button>

          {showNotif && (
            <div className="topbar-dropdown notif-dropdown">
              <div className="dropdown-header">
                <strong>Notifications</strong>
                {unread > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="empty-state" style={{ padding: '28px 16px' }}>
                    <i className="bi bi-bell-slash" />
                    <p>No notifications</p>
                  </div>
                ) : notifications.slice(0, 15).map(n => (
                  <div
                    key={n.id}
                    className={`notif-item${n.is_read ? '' : ' notif-unread'}`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{formatDateTime(n.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile dropdown ── */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="topbar-profile-btn"
            onClick={() => { setShowProfile(s => !s); setShowNotif(false); }}
            aria-label="Profile menu"
          >
            <div className="topbar-avatar">{initials}</div>
            <span className="topbar-username">{user?.first_name || user?.username}</span>
            <i className={`bi bi-chevron-${showProfile ? 'up' : 'down'} topbar-chevron`} />
          </button>

          {showProfile && (
            <div className="topbar-dropdown profile-dropdown">
              {/* User info header */}
              <div className="profile-header">
                <div className="profile-avatar-lg">{initials}</div>
                <div>
                  <div className="profile-name">{user?.first_name} {user?.last_name}</div>
                  <div className="profile-role">{user?.role}</div>
                  <div className="profile-email">{user?.email}</div>
                </div>
              </div>

              <div className="dropdown-divider" />

              <button
                className="profile-menu-item"
                onClick={() => { setShowProfile(false); navigate('/profile'); }}
              >
                <i className="bi bi-person-circle" />
                My Profile
              </button>

              {user?.role === 'admin' && (
                <button
                  className="profile-menu-item"
                  onClick={() => { setShowProfile(false); navigate('/users'); }}
                >
                  <i className="bi bi-gear" />
                  Settings
                </button>
              )}

              <div className="dropdown-divider" />

              <button className="profile-menu-item profile-logout" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}