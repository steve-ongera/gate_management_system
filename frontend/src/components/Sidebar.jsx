// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { clearAuth, getRefresh, authAPI } from '../utils/api.js';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard',  icon: 'bi-grid-1x2-fill',             label: 'Dashboard' },
      { to: '/check-in',   icon: 'bi-door-open-fill',            label: 'Check In / Out' },
      { to: '/entries',    icon: 'bi-list-ul',                   label: 'Entry Log' },
      { to: '/deliveries', icon: 'bi-box-seam-fill',             label: 'Deliveries' },
    ],
  },
  {
    label: 'People & Assets',
    items: [
      { to: '/residents',  icon: 'bi-people-fill',               label: 'Residents' },
      { to: '/visitors',   icon: 'bi-person-badge-fill',         label: 'Visitors' },
      { to: '/vehicles',   icon: 'bi-car-front-fill',            label: 'Vehicles' },
      { to: '/parking',    icon: 'bi-p-square-fill',             label: 'Parking' },
    ],
  },
  {
    label: 'Property',
    items: [
      { to: '/units',      icon: 'bi-building-fill',             label: 'Units' },
    ],
  },
  {
    label: 'Security',
    items: [
      { to: '/incidents',  icon: 'bi-exclamation-triangle-fill', label: 'Incidents' },
      { to: '/blacklist',  icon: 'bi-slash-circle-fill',         label: 'Blacklist' },
    ],
  },
  {
    label: 'Admin',
    adminOnly: true,
    items: [
      { to: '/users',      icon: 'bi-person-gear',               label: 'Staff Users' },
      { to: '/reports',    icon: 'bi-bar-chart-fill',            label: 'Reports' },
      { to: '/audit-log',  icon: 'bi-journal-text',             label: 'Audit Log' },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user
    ? (`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`).toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 99,
            display: 'none',
          }}
          className="sidebar-backdrop"
        />
      )}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <i className="bi bi-shield-lock-fill" />
          </div>
          <span className="brand-label">GateOS</span>

          {/* Mobile close button */}
          <button className="sidebar-close-btn" onClick={onClose} title="Close menu">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Nav sections */}
        <div className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            if (section.adminOnly && user?.role !== 'admin') return null;
            return (
              <div className="sidebar-section" key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar-item${isActive ? ' active' : ''}`
                    }
                  >
                    <i className={`bi ${item.icon}`} />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer user card */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Logout"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}