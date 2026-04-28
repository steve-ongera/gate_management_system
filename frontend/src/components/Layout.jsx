// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';

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
  const title = PAGE_TITLES[location.pathname] || 'GateOS';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}