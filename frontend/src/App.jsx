import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Entries from './pages/Entries.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Residents from './pages/Residents.jsx';
import Vehicles from './pages/Vehicles.jsx';
import Visitors from './pages/Visitors.jsx';
import Deliveries from './pages/Deliveries.jsx';
import Incidents from './pages/Incidents.jsx';
import Blacklist from './pages/Blacklist.jsx';
import Parking from './pages/Parking.jsx';
import Units from './pages/Units.jsx';
import Users from './pages/Users.jsx';
import Reports from './pages/Reports.jsx';
import AuditLog from './pages/AuditLog.jsx';
import { getUser, getToken } from './utils/api.js';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) setUser(storedUser);
  }, []);

  const authValue = { user, setUser, token, setToken };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="entries"      element={<Entries />} />
            <Route path="check-in"     element={<CheckIn />} />
            <Route path="residents"    element={<Residents />} />
            <Route path="vehicles"     element={<Vehicles />} />
            <Route path="visitors"     element={<Visitors />} />
            <Route path="deliveries"   element={<Deliveries />} />
            <Route path="incidents"    element={<Incidents />} />
            <Route path="blacklist"    element={<Blacklist />} />
            <Route path="parking"      element={<Parking />} />
            <Route path="units"        element={<Units />} />
            <Route path="reports"      element={<RequireAdmin><Reports /></RequireAdmin>} />
            <Route path="audit-log"    element={<RequireAdmin><AuditLog /></RequireAdmin>} />
            <Route path="users"        element={<RequireAdmin><Users /></RequireAdmin>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}