"""
core/management/commands/seed_data.py

Usage:
    python manage.py seed_data
    python manage.py seed_data --flush   # clears existing data first
"""

import random
import uuid
from datetime import timedelta, date

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password

# ── adjust these imports to match your app label ──────────────────────────────
from core.models import (
    User, Block, Unit, Resident, Vehicle, Visitor,
    Gate, Entry, PreAuthorization, Incident, Blacklist,
    Delivery, ParkingSlot, AuditLog, Notification,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Kenyan fixture data pools
# ─────────────────────────────────────────────────────────────────────────────

KENYAN_FIRST_NAMES = [
    "Wanjiru", "Kamau", "Njeri", "Mwangi", "Achieng", "Otieno", "Wambui",
    "Kipchoge", "Nafula", "Barasa", "Zawadi", "Mutua", "Auma", "Odhiambo",
    "Wanjiku", "Kariuki", "Chebet", "Rotich", "Amina", "Hassan", "Fatuma",
    "Omondi", "Kerubo", "Nyambura", "Gitonga", "Wairimu", "Lumumba",
    "Adhiambo", "Njenga", "Wekesa", "Muthoni", "Kimani", "Akinyi", "Korir",
    "Nduta", "Mugo", "Chepkoech", "Sigei", "Halima", "Abdi",
]

KENYAN_LAST_NAMES = [
    "Kamau", "Otieno", "Mwangi", "Njoroge", "Odhiambo", "Kariuki", "Mutua",
    "Wafula", "Barasa", "Rotich", "Koech", "Cheruiyot", "Langat", "Kirui",
    "Omondi", "Auma", "Nyambura", "Gitau", "Njenga", "Muigai", "Kiptoo",
    "Yego", "Bett", "Sang", "Rono", "Kibet", "Chesang", "Koros", "Tuwei",
    "Hassan", "Abdi", "Omar", "Ali", "Mohamed", "Maalim",
]

KE_PHONE_PREFIXES = ["0712", "0722", "0733", "0743", "0754", "0768", "0790", "0701", "0711"]

KE_PLATES = [
    "KCA", "KCB", "KCC", "KCD", "KCE", "KCF", "KCG", "KCH",
    "KDA", "KDB", "KDC", "KDD", "KDE", "KDF",
    "KBA", "KBB", "KBC", "KBD", "KBE",
]

CAR_MAKES = [
    ("Toyota", ["Corolla", "Camry", "RAV4", "Hilux", "Prado", "Premio", "Wish", "Fielder"]),
    ("Subaru", ["Forester", "Outback", "Impreza", "Legacy", "XV"]),
    ("Nissan", ["Note", "X-Trail", "Patrol", "Navara", "March"]),
    ("Honda", ["Fit", "HR-V", "CR-V", "Accord", "Civic"]),
    ("Mazda", ["Demio", "CX-5", "Atenza", "Axela"]),
    ("Mitsubishi", ["Outlander", "Pajero", "Colt"]),
    ("Mercedes-Benz", ["C200", "E250", "GLE", "Vito"]),
    ("Isuzu", ["D-Max", "MU-X"]),
]

CAR_COLORS = [
    "White", "Silver", "Black", "Grey", "Blue", "Red", "Pearl White",
    "Champagne", "Brown", "Dark Blue", "Wine Red",
]

COURIER_COMPANIES = [
    "DHL Kenya", "G4S Courier", "Sendy", "Wells Fargo Courier",
    "Fargo Courier", "Posta Kenya", "Uber Freight", "Easy Coach Parcels",
    "Glovo", "Jumia Logistics",
]

INCIDENT_TITLES = [
    "Suspicious vehicle parked overnight",
    "Unauthorized individual near back gate",
    "Altercation between residents at car park",
    "Delivery left unattended at gate",
    "Visitor refused entry – no pre-authorization",
    "Unknown motorcycle loitering near Block B",
    "Gate barrier malfunction",
    "Resident reported missing parcel",
    "Noise complaint escalated to security",
    "Stray dogs entered compound",
    "Power outage affecting CCTV cameras",
    "Attempted tailgating at main gate",
    "Vandalism on notice board",
    "Missing visitor badge",
    "Resident locked out of unit",
]

INCIDENT_DESCRIPTIONS = [
    "Incident was observed during routine patrol and logged immediately.",
    "Security officer responded within 5 minutes and documented the scene.",
    "Resident called the guardroom to report the situation.",
    "CCTV footage was reviewed and relevant timestamps noted.",
    "Neighboring residents corroborated the report.",
    "Police were alerted but situation resolved before their arrival.",
    "Written statement collected from involved parties.",
    "Incident referred to estate management for follow-up.",
]

PURPOSE_CHOICES = [
    "Family visit", "Business meeting", "Maintenance work",
    "Delivery drop-off", "Social gathering", "Picking up resident",
    "Property viewing", "Catering / event support", "Medical visit",
    "Internet / DSTV technician",
]

NAIROBI_ESTATES = [
    "Kilimani", "Lavington", "Karen", "Runda", "Gigiri",
    "Westlands", "Spring Valley", "Kileleshwa", "Parklands", "Muthaiga",
]


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def ke_phone():
    prefix = random.choice(KE_PHONE_PREFIXES)
    suffix = "".join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{prefix}{suffix}"


def ke_national_id():
    return str(random.randint(10000000, 39999999))


def ke_plate():
    prefix = random.choice(KE_PLATES)
    digits = str(random.randint(100, 999))
    letters = "".join(random.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=1))
    return f"{prefix} {digits}{letters}"


def ke_email(name: str) -> str:
    clean = name.lower().replace(" ", ".").replace("-", "")
    domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "ke.com"]
    return f"{clean}{random.randint(1, 99)}@{random.choice(domains)}"


def random_name():
    return f"{random.choice(KENYAN_FIRST_NAMES)} {random.choice(KENYAN_LAST_NAMES)}"


def random_dt(start: date, end: date):
    """Random aware datetime between two dates."""
    delta = (end - start).days
    day_offset = random.randint(0, delta)
    hour = random.randint(6, 22)
    minute = random.randint(0, 59)
    dt = timezone.datetime(
        start.year, start.month, start.day, hour, minute,
        tzinfo=timezone.get_current_timezone()
    ) + timedelta(days=day_offset)
    return dt


def access_code():
    return "AC" + str(random.randint(100000, 999999))


# ─────────────────────────────────────────────────────────────────────────────
#  Command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the database with ~1 year of realistic Kenyan estate data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing data before seeding",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing data…"))
            self._flush()

        self.stdout.write("Seeding data…")
        self._seed()
        self.stdout.write(self.style.SUCCESS("✅  Seed complete!"))

    # ── flush ─────────────────────────────────────────────────────────────────

    def _flush(self):
        models_to_flush = [
            Notification, AuditLog, ParkingSlot, Delivery,
            Blacklist, Incident, PreAuthorization, Entry,
            Gate, Vehicle, Visitor, Resident, Unit, Block, User,
        ]
        for m in models_to_flush:
            m.objects.all().delete()

    # ── main seed ─────────────────────────────────────────────────────────────

    def _seed(self):
        now = timezone.now()
        start_date = (now - timedelta(days=365)).date()
        end_date = now.date()

        # 1. Users
        users = self._create_users()

        # 2. Blocks + Units
        blocks, units = self._create_blocks_and_units()

        # 3. Residents
        residents = self._create_residents(units, users)

        # 4. Vehicles
        vehicles = self._create_vehicles(residents)

        # 5. Parking slots
        self._create_parking_slots(vehicles)

        # 6. Gates
        gates = self._create_gates()

        # 7. Visitors
        visitors = self._create_visitors(60)

        # 8. Entries (full year)
        security_users = [u for u in users if u.role == "security"]
        entries = self._create_entries(gates, residents, visitors, vehicles, units, security_users, start_date, end_date)

        # 9. Pre-authorizations
        self._create_pre_authorizations(residents, start_date, end_date)

        # 10. Incidents
        self._create_incidents(gates, security_users, entries, start_date, end_date)

        # 11. Blacklist
        self._create_blacklist(visitors, security_users)

        # 12. Deliveries
        self._create_deliveries(units, residents, security_users, start_date, end_date)

        # 13. Audit logs
        self._create_audit_logs(users, start_date, end_date)

        # 14. Notifications
        self._create_notifications(users, entries, start_date, end_date)

    # ── users ─────────────────────────────────────────────────────────────────

    def _create_users(self):
        hashed_pw = make_password("password123")
        users = []

        # 1 superadmin
        admin = User.objects.create(
            username="admin",
            email="admin@estatemanager.co.ke",
            first_name="Estate",
            last_name="Administrator",
            role="admin",
            phone=ke_phone(),
            is_staff=True,
            is_superuser=True,
            password=hashed_pw,
        )
        users.append(admin)
        self.stdout.write(f"  Created admin: admin / password123")

        # 5 security guards
        guard_names = [
            ("James", "Otieno"), ("Peter", "Wafula"), ("Grace", "Njeri"),
            ("Samuel", "Koech"), ("Faith", "Auma"),
        ]
        for i, (fn, ln) in enumerate(guard_names, 1):
            username = f"guard{i:02d}"
            g = User.objects.create(
                username=username,
                email=ke_email(f"{fn} {ln}"),
                first_name=fn,
                last_name=ln,
                role="security",
                phone=ke_phone(),
                password=hashed_pw,
            )
            users.append(g)
            self.stdout.write(f"  Created security: {username} / password123")

        # 20 resident users
        for i in range(1, 21):
            fn = random.choice(KENYAN_FIRST_NAMES)
            ln = random.choice(KENYAN_LAST_NAMES)
            username = f"resident{i:02d}"
            r = User.objects.create(
                username=username,
                email=ke_email(f"{fn} {ln}"),
                first_name=fn,
                last_name=ln,
                role="resident",
                phone=ke_phone(),
                password=hashed_pw,
            )
            users.append(r)

        self.stdout.write(f"  ✓ {len(users)} users created")
        return users

    # ── blocks & units ────────────────────────────────────────────────────────

    def _create_blocks_and_units(self):
        blocks = []
        for letter in ["A", "B", "C", "D"]:
            b = Block.objects.create(
                name=f"Block {letter}",
                description=f"Residential block {letter} – {random.choice(NAIROBI_ESTATES)} Estate",
            )
            blocks.append(b)

        units = []
        statuses = ["occupied"] * 7 + ["vacant"] * 2 + ["maintenance"] * 1
        for block in blocks:
            for floor in range(1, 6):       # 5 floors
                for apt in range(1, 5):     # 4 apartments per floor
                    unit_num = f"{floor}0{apt}"
                    u = Unit.objects.create(
                        block=block,
                        unit_number=unit_num,
                        floor=floor,
                        status=random.choice(statuses),
                    )
                    units.append(u)

        self.stdout.write(f"  ✓ {len(blocks)} blocks, {len(units)} units created")
        return blocks, units

    # ── residents ─────────────────────────────────────────────────────────────

    def _create_residents(self, units, users):
        occupied_units = [u for u in units if u.status == "occupied"]
        resident_users = [u for u in users if u.role == "resident"]
        residents = []

        for idx, unit in enumerate(occupied_units):
            # Primary resident (may link to a user account)
            user_link = resident_users[idx] if idx < len(resident_users) else None
            fn = user_link.first_name if user_link else random.choice(KENYAN_FIRST_NAMES)
            ln = user_link.last_name if user_link else random.choice(KENYAN_LAST_NAMES)

            primary = Resident.objects.create(
                user=user_link,
                unit=unit,
                full_name=f"{fn} {ln}",
                national_id=ke_national_id(),
                phone=ke_phone(),
                email=ke_email(f"{fn} {ln}"),
                is_primary=True,
                move_in_date=date(
                    random.randint(2020, 2023),
                    random.randint(1, 12),
                    random.randint(1, 28),
                ),
                is_active=True,
            )
            residents.append(primary)

            # 0-2 household members
            for _ in range(random.randint(0, 2)):
                mem_fn = random.choice(KENYAN_FIRST_NAMES)
                mem_ln = ln  # same surname
                mem = Resident.objects.create(
                    unit=unit,
                    full_name=f"{mem_fn} {mem_ln}",
                    national_id=ke_national_id(),
                    phone=ke_phone(),
                    email=ke_email(f"{mem_fn} {mem_ln}"),
                    is_primary=False,
                    move_in_date=primary.move_in_date,
                    is_active=True,
                )
                residents.append(mem)

        self.stdout.write(f"  ✓ {len(residents)} residents created")
        return residents

    # ── vehicles ──────────────────────────────────────────────────────────────

    def _create_vehicles(self, residents):
        vehicles = []
        used_plates = set()
        types = ["car"] * 6 + ["motorcycle"] * 2 + ["van"] * 1 + ["truck"] * 1

        for resident in residents:
            # ~70% of residents own a vehicle; primary tenants more likely
            if not resident.is_primary and random.random() < 0.6:
                continue
            if resident.is_primary and random.random() < 0.2:
                continue

            plate = ke_plate()
            while plate in used_plates:
                plate = ke_plate()
            used_plates.add(plate)

            make_info = random.choice(CAR_MAKES)
            make = make_info[0]
            model = random.choice(make_info[1])

            v = Vehicle.objects.create(
                resident=resident,
                plate_number=plate,
                vehicle_type=random.choice(types),
                make=make,
                model=model,
                color=random.choice(CAR_COLORS),
                year=random.randint(2010, 2023),
                is_registered=True,
                sticker_number=f"STK{random.randint(1000, 9999)}",
                is_active=True,
            )
            vehicles.append(v)

        self.stdout.write(f"  ✓ {len(vehicles)} vehicles created")
        return vehicles

    # ── parking slots ─────────────────────────────────────────────────────────

    def _create_parking_slots(self, vehicles):
        slots = []
        # 80 resident slots
        for i in range(1, 81):
            slot_num = f"R{i:03d}"
            assigned = vehicles[i - 1] if i <= len(vehicles) else None
            s = ParkingSlot.objects.create(
                slot_number=slot_num,
                slot_type="resident",
                assigned_vehicle=assigned,
                is_occupied=assigned is not None,
                is_active=True,
            )
            slots.append(s)

        # 20 visitor slots
        for i in range(1, 21):
            ParkingSlot.objects.create(
                slot_number=f"V{i:03d}",
                slot_type="visitor",
                is_occupied=random.random() < 0.3,
                is_active=True,
            )

        # 5 disabled slots
        for i in range(1, 6):
            ParkingSlot.objects.create(
                slot_number=f"D{i:03d}",
                slot_type="disabled",
                is_occupied=False,
                is_active=True,
            )

        self.stdout.write(f"  ✓ Parking slots created")

    # ── gates ─────────────────────────────────────────────────────────────────

    def _create_gates(self):
        gate_data = [
            ("Main Gate", "Ngong Road Entrance"),
            ("Back Gate", "Service Entrance – Rear"),
            ("Pedestrian Gate", "Side Walk Entrance"),
        ]
        gates = []
        for name, loc in gate_data:
            g = Gate.objects.create(name=name, location=loc, is_active=True)
            gates.append(g)
        self.stdout.write(f"  ✓ {len(gates)} gates created")
        return gates

    # ── visitors ──────────────────────────────────────────────────────────────

    def _create_visitors(self, count):
        visitors = []
        used_ids = set()
        for _ in range(count):
            name = random_name()
            nid = ke_national_id()
            while nid in used_ids:
                nid = ke_national_id()
            used_ids.add(nid)
            v = Visitor.objects.create(
                full_name=name,
                national_id=nid,
                phone=ke_phone(),
            )
            visitors.append(v)
        self.stdout.write(f"  ✓ {len(visitors)} visitors created")
        return visitors

    # ── entries ───────────────────────────────────────────────────────────────

    def _create_entries(self, gates, residents, visitors, vehicles, units, security_users, start_date, end_date):
        entries = []
        occupied_units = [u for u in units if u.status == "occupied"]

        # ~700 entries over the year
        for _ in range(700):
            entry_type = random.choices(
                ["resident", "visitor", "delivery", "contractor"],
                weights=[40, 35, 15, 10],
            )[0]

            check_in = random_dt(start_date, end_date)
            duration_mins = random.randint(5, 480)
            check_out = check_in + timedelta(minutes=duration_mins) if random.random() < 0.85 else None

            resident = random.choice(residents) if entry_type == "resident" else None
            visitor = random.choice(visitors) if entry_type in ["visitor", "delivery", "contractor"] else None
            vehicle = random.choice(vehicles) if random.random() < 0.6 else None
            host_unit = random.choice(occupied_units) if entry_type != "resident" else None

            e = Entry.objects.create(
                gate=random.choice(gates),
                entry_type=entry_type,
                direction="in",
                status=random.choices(
                    ["approved", "denied", "pending", "overstay"],
                    weights=[85, 5, 5, 5],
                )[0],
                resident=resident,
                visitor=visitor,
                vehicle=vehicle,
                host_unit=host_unit,
                check_in_time=check_in,
                check_out_time=check_out,
                expected_checkout=check_in + timedelta(hours=random.randint(1, 8)) if random.random() < 0.5 else None,
                recorded_by=random.choice(security_users) if security_users else None,
                purpose=random.choice(PURPOSE_CHOICES),
                badge_number=f"BP{random.randint(1000, 9999)}" if entry_type in ["visitor", "contractor"] else "",
            )
            entries.append(e)

        self.stdout.write(f"  ✓ {len(entries)} entries created")
        return entries

    # ── pre-authorizations ────────────────────────────────────────────────────

    def _create_pre_authorizations(self, residents, start_date, end_date):
        codes_used = set()
        count = 0
        for _ in range(120):
            resident = random.choice(residents)
            valid_from = random_dt(start_date, end_date)
            valid_until = valid_from + timedelta(hours=random.randint(2, 72))

            code = access_code()
            while code in codes_used:
                code = access_code()
            codes_used.add(code)

            now = timezone.now()
            if valid_until < now:
                status = random.choices(["used", "expired", "cancelled"], weights=[60, 30, 10])[0]
            else:
                status = "active"

            PreAuthorization.objects.create(
                resident=resident,
                visitor_name=random_name(),
                visitor_phone=ke_phone(),
                visitor_vehicle_plate=ke_plate() if random.random() < 0.4 else "",
                valid_from=valid_from,
                valid_until=valid_until,
                access_code=code,
                status=status,
            )
            count += 1

        self.stdout.write(f"  ✓ {count} pre-authorizations created")

    # ── incidents ─────────────────────────────────────────────────────────────

    def _create_incidents(self, gates, security_users, entries, start_date, end_date):
        count = 0
        for _ in range(45):
            occurred = random_dt(start_date, end_date)
            is_resolved = random.random() < 0.75
            resolved_at = occurred + timedelta(hours=random.randint(1, 48)) if is_resolved else None

            Incident.objects.create(
                gate=random.choice(gates),
                reported_by=random.choice(security_users) if security_users else None,
                entry=random.choice(entries) if entries and random.random() < 0.4 else None,
                title=random.choice(INCIDENT_TITLES),
                description=random.choice(INCIDENT_DESCRIPTIONS),
                category=random.choice([c[0] for c in Incident.CATEGORY_CHOICES]),
                severity=random.choices(
                    ["low", "medium", "high", "critical"],
                    weights=[50, 30, 15, 5],
                )[0],
                occurred_at=occurred,
                resolved_at=resolved_at,
                is_resolved=is_resolved,
                resolution_notes="Issue resolved after investigation and corrective action taken." if is_resolved else "",
            )
            count += 1

        self.stdout.write(f"  ✓ {count} incidents created")

    # ── blacklist ─────────────────────────────────────────────────────────────

    def _create_blacklist(self, visitors, security_users):
        blacklisted_visitors = random.sample(visitors, min(8, len(visitors)))
        count = 0
        for v in blacklisted_visitors:
            Blacklist.objects.create(
                visitor=v,
                national_id=v.national_id,
                reason=random.choice([c[0] for c in Blacklist.REASON_CHOICES]),
                description="Individual was involved in a security incident and banned from the estate.",
                added_by=random.choice(security_users) if security_users else None,
                is_active=True,
                expires_at=timezone.now() + timedelta(days=random.randint(30, 365)) if random.random() < 0.5 else None,
            )
            count += 1

        # a few by plate only
        used_plates = set()
        for _ in range(4):
            plate = ke_plate()
            while plate in used_plates:
                plate = ke_plate()
            used_plates.add(plate)
            Blacklist.objects.create(
                visitor=None,
                vehicle_plate=plate,
                reason="unauthorized_access",
                description="Vehicle repeatedly attempted unauthorized access through the main gate.",
                added_by=random.choice(security_users) if security_users else None,
                is_active=True,
            )
            count += 1

        self.stdout.write(f"  ✓ {count} blacklist entries created")

    # ── deliveries ────────────────────────────────────────────────────────────

    def _create_deliveries(self, units, residents, security_users, start_date, end_date):
        occupied_units = [u for u in units if u.status == "occupied"]
        count = 0
        for _ in range(200):
            unit = random.choice(occupied_units)
            unit_residents = list(Resident.objects.filter(unit=unit, is_active=True))
            received_at = random_dt(start_date, end_date)

            is_collected = random.random() < 0.80
            collected_at = received_at + timedelta(hours=random.randint(1, 72)) if is_collected else None
            collected_by = random.choice(unit_residents) if unit_residents and is_collected else None

            if not is_collected:
                status = "pending"
            elif random.random() < 0.05:
                status = "returned"
            else:
                status = "collected"

            items = [
                "Online shopping parcel", "Documents envelope", "Grocery delivery",
                "Electronics package", "Clothing order", "Medicine / pharmacy",
                "Books / stationery", "Furniture – small item", "Food delivery",
                "Amazon / Jumia parcel",
            ]

            Delivery.objects.create(
                unit=unit,
                courier_name=random_name(),
                courier_company=random.choice(COURIER_COMPANIES),
                tracking_number=f"KE{random.randint(100000000, 999999999)}",
                item_description=random.choice(items),
                received_at=received_at,
                collected_at=collected_at,
                collected_by=collected_by,
                received_by=random.choice(security_users) if security_users else None,
                status=status,
            )
            count += 1

        self.stdout.write(f"  ✓ {count} deliveries created")

    # ── audit logs ────────────────────────────────────────────────────────────

    def _create_audit_logs(self, users, start_date, end_date):
        actions = [c[0] for c in AuditLog.ACTION_CHOICES]
        model_names = ["Entry", "Visitor", "Resident", "Vehicle", "Delivery", "Incident", "PreAuthorization"]
        count = 0
        for _ in range(300):
            action = random.choice(actions)
            model = random.choice(model_names)
            user = random.choice(users)
            AuditLog.objects.create(
                user=user,
                action=action,
                model_name=model,
                object_id=str(uuid.uuid4()),
                description=f"{user.get_full_name()} performed '{action}' on {model}.",
                ip_address=f"192.168.{random.randint(1,10)}.{random.randint(1,254)}",
                created_at=random_dt(start_date, end_date),
            )
            count += 1

        self.stdout.write(f"  ✓ {count} audit log entries created")

    # ── notifications ─────────────────────────────────────────────────────────

    def _create_notifications(self, users, entries, start_date, end_date):
        notif_types = [c[0] for c in Notification.TYPE_CHOICES]
        titles = {
            "visitor_arrival": "Visitor at the Gate",
            "delivery": "Parcel Awaiting Collection",
            "incident": "Security Incident Reported",
            "pre_auth": "Pre-Authorization Used",
            "overstay": "Visitor Overstay Alert",
            "system": "System Notification",
        }
        messages = {
            "visitor_arrival": "A visitor has arrived at the main gate and is requesting entry.",
            "delivery": "A parcel has been received at the guardroom on your behalf.",
            "incident": "A security incident has been logged at your gate. Please review.",
            "pre_auth": "Your pre-authorization code was used by a visitor.",
            "overstay": "A visitor in your unit has exceeded the expected check-out time.",
            "system": "Your account settings have been updated.",
        }
        count = 0
        for _ in range(350):
            ntype = random.choice(notif_types)
            recipient = random.choice(users)
            entry = random.choice(entries) if entries and random.random() < 0.4 else None
            Notification.objects.create(
                recipient=recipient,
                notification_type=ntype,
                title=titles[ntype],
                message=messages[ntype],
                is_read=random.random() < 0.65,
                related_entry=entry,
                created_at=random_dt(start_date, end_date),
            )
            count += 1

        self.stdout.write(f"  ✓ {count} notifications created")