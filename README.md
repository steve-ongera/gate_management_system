# GateOS – Apartment Gate Management System

A professional full-stack gate management system for apartments.  
**Backend:** Django 5 + DRF + JWT | **Frontend:** React 18 + Vite

---

## 🗂️ Project Structure

```
gate_management/
├── backend/
│   ├── core/
│   │   ├── models.py          # 14 models
│   │   ├── serializers.py     # All serializers
│   │   ├── views.py           # All viewsets + actions
│   │   ├── urls.py            # App-level routes
│   │   ├── permissions.py     # IsAdminUser, IsAdminOrSecurity
│   │   └── admin.py           # Full Django admin
│   ├── gate_management/
│   │   ├── settings.py
│   │   └── urls.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx            # Router + AuthContext
        ├── utils/api.js       # All API helpers
        ├── styles/main.css    # White clean theme
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   └── Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx    # Stats + charts
            ├── CheckIn.jsx      # Check In/Out operations
            ├── Entries.jsx      # Full entry log
            ├── Residents.jsx    # CRUD + history
            ├── Vehicles.jsx     # CRUD
            ├── Visitors.jsx     # View + blacklist check
            ├── Deliveries.jsx   # CRUD + collect
            ├── Incidents.jsx    # CRUD + resolve
            ├── Blacklist.jsx    # CRUD + quick check
            ├── Parking.jsx      # Visual slot grid
            ├── Units.jsx        # CRUD
            ├── Users.jsx        # Admin only – CRUD
            ├── Reports.jsx      # Admin only – charts
            └── AuditLog.jsx     # Admin only – read-only
```

---

## 🗄️ Data Models (14)

| Model            | Purpose                                      |
|-----------------|----------------------------------------------|
| User             | Staff (admin / security)                     |
| Block            | Apartment block (A, B, C…)                   |
| Unit             | Individual apartment unit                    |
| Resident         | Registered tenant / household member         |
| Vehicle          | Registered vehicles per resident             |
| Visitor          | Guest profiles (auto-created on check-in)    |
| Gate             | Physical gate entry points                   |
| Entry            | Every check-in / check-out event             |
| PreAuthorization | Resident-issued visitor passes               |
| Incident         | Security incidents                           |
| Blacklist        | Banned persons / vehicles                    |
| Delivery         | Parcel tracking                              |
| ParkingSlot      | Parking bay allocation                       |
| AuditLog         | Full system audit trail                      |
| Notification     | In-app notifications for residents           |

---

## 🚀 Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create DB
createdb gate_db

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

---

## 🔐 Roles

| Role     | Access                                            |
|----------|---------------------------------------------------|
| admin    | Everything – users, reports, audit log, all ops   |
| security | Operations – check-in/out, residents, vehicles, incidents |

---

## 📡 Key API Endpoints

```
POST   /api/v1/auth/login/              Login → JWT tokens
POST   /api/v1/auth/logout/             Blacklist refresh token
GET    /api/v1/auth/me/                 Current user

GET    /api/v1/dashboard/              Dashboard stats
GET    /api/v1/reports/?type=entries   Reports data

POST   /api/v1/entries/check_in/       Record entry
POST   /api/v1/entries/check_out/      Record exit
GET    /api/v1/entries/live/           Who is currently inside
GET    /api/v1/entries/today/          Today's entries

POST   /api/v1/pre-authorizations/verify/  Verify access code
GET    /api/v1/blacklist/check/            Quick blacklist check
POST   /api/v1/incidents/{id}/resolve/     Resolve incident
POST   /api/v1/deliveries/{id}/collect/    Mark delivery collected
GET    /api/v1/parking/available/          Available slots
```

---

## ⚡ Features

- **Smart Check-In**: Blacklist auto-check, pre-auth code validation, resident notifications
- **Live Monitoring**: Real-time "currently inside" dashboard (auto-refresh 30s)
- **Full Audit Trail**: Every login, create, update, delete logged
- **Pre-Authorization**: Residents issue time-limited visitor codes
- **Delivery Tracking**: Log, notify, and collect parcels
- **Parking Grid**: Visual slot map with occupancy status
- **Reports**: Date-range entry trends, incident breakdown, occupancy
- **Notifications**: In-app bell for visitor arrivals and deliveries