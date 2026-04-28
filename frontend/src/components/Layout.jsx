// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar  from './Navbar.jsx';

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/check-in':   'Check In / Out',
  '/entries':    'Entry Log',
  '/residents':  'Residents',
  '/vehicles':   'Vehicles',
  '/visitors':   'Visitors',
  '/deliveries': 'Deliveries',
  '/incidents':  'Incidents',
  '/blacklist':  'Blacklist',
  '/parking':    'Parking',
  '/units':      'Units & Blocks',
  '/users':      'Staff Users',
  '/reports':    'Reports',
  '/audit-log':  'Audit Log',
};

export default function Layout() {
  const location = useLocation();
  const title    = PAGE_TITLES[location.pathname] || 'GateOS';

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Navbar
          title={title}
          onMenuToggle={() => setSidebarOpen(s => !s)}
        />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}