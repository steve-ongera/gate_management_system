from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid


# ─── USER / AUTH ────────────────────────────────────────────────────────────

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('security', 'Security Guard'),
        ('resident', 'Resident'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='security')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


# ─── APARTMENT / UNIT ────────────────────────────────────────────────────────

class Block(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)           # e.g. "Block A"
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blocks'
        ordering = ['name']

    def __str__(self):
        return self.name


class Unit(models.Model):
    STATUS_CHOICES = [
        ('occupied', 'Occupied'),
        ('vacant', 'Vacant'),
        ('maintenance', 'Under Maintenance'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=20)    # e.g. "101", "PH2"
    floor = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='vacant')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'units'
        unique_together = ('block', 'unit_number')
        ordering = ['block', 'unit_number']

    def __str__(self):
        return f"{self.block.name} – {self.unit_number}"


# ─── RESIDENT ────────────────────────────────────────────────────────────────

class Resident(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='resident_profile')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, related_name='residents')
    full_name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    photo = models.ImageField(upload_to='residents/', blank=True, null=True)
    is_primary = models.BooleanField(default=False)   # primary tenant vs. household member
    move_in_date = models.DateField(null=True, blank=True)
    move_out_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'residents'
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} – {self.unit}"


# ─── VEHICLE ─────────────────────────────────────────────────────────────────

class Vehicle(models.Model):
    TYPE_CHOICES = [
        ('car', 'Car'),
        ('motorcycle', 'Motorcycle'),
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('bicycle', 'Bicycle'),
        ('other', 'Other'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='vehicles')
    plate_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='car')
    make = models.CharField(max_length=100, blank=True)       # Toyota
    model = models.CharField(max_length=100, blank=True)      # Corolla
    color = models.CharField(max_length=50, blank=True)
    year = models.IntegerField(null=True, blank=True)
    is_registered = models.BooleanField(default=True)         # registered to a resident
    sticker_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicles'
        ordering = ['plate_number']

    def __str__(self):
        return f"{self.plate_number} ({self.make} {self.model})"


# ─── VISITOR ─────────────────────────────────────────────────────────────────

class Visitor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to='visitors/', blank=True, null=True)
    id_document_photo = models.ImageField(upload_to='visitor_ids/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'visitors'
        ordering = ['-created_at']

    def __str__(self):
        return self.full_name


# ─── GATE ENTRY / EXIT ───────────────────────────────────────────────────────

class Gate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)           # "Main Gate", "Back Gate"
    location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gates'

    def __str__(self):
        return self.name


class Entry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ('resident', 'Resident'),
        ('visitor', 'Visitor'),
        ('delivery', 'Delivery'),
        ('contractor', 'Contractor'),
        ('emergency', 'Emergency'),
    ]
    DIRECTION_CHOICES = [
        ('in', 'Check In'),
        ('out', 'Check Out'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('overstay', 'Overstay'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gate = models.ForeignKey(Gate, on_delete=models.SET_NULL, null=True, related_name='entries')
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    direction = models.CharField(max_length=3, choices=DIRECTION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')

    # Who is entering/leaving
    resident = models.ForeignKey(Resident, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='entries')
    visitor = models.ForeignKey(Visitor, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='entries')
    # Vehicle used (optional)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='entries')
    # Visiting which unit
    host_unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='visitor_entries')

    # Timestamps
    check_in_time = models.DateTimeField(default=timezone.now)
    check_out_time = models.DateTimeField(null=True, blank=True)
    expected_checkout = models.DateTimeField(null=True, blank=True)

    # Security officer who recorded
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='recorded_entries')
    purpose = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    badge_number = models.CharField(max_length=50, blank=True)  # temp pass number

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'entries'
        ordering = ['-check_in_time']
        verbose_name_plural = 'Entries'

    def __str__(self):
        person = self.resident or self.visitor
        return f"{person} – {self.direction} @ {self.check_in_time:%Y-%m-%d %H:%M}"

    @property
    def duration_minutes(self):
        if self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return int(delta.total_seconds() / 60)
        return None

    @property
    def is_inside(self):
        return self.direction == 'in' and self.check_out_time is None


# ─── PRE-AUTHORIZATION ───────────────────────────────────────────────────────

class PreAuthorization(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='pre_authorizations')
    visitor_name = models.CharField(max_length=200)
    visitor_phone = models.CharField(max_length=20, blank=True)
    visitor_vehicle_plate = models.CharField(max_length=20, blank=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    access_code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pre_authorizations'
        ordering = ['-valid_from']

    def __str__(self):
        return f"Pre-auth: {self.visitor_name} → {self.resident.unit}"

    def is_valid(self):
        now = timezone.now()
        return self.status == 'active' and self.valid_from <= now <= self.valid_until


# ─── INCIDENT ────────────────────────────────────────────────────────────────

class Incident(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    CATEGORY_CHOICES = [
        ('security', 'Security Breach'),
        ('unauthorized', 'Unauthorized Access'),
        ('accident', 'Accident'),
        ('theft', 'Theft'),
        ('vandalism', 'Vandalism'),
        ('disturbance', 'Disturbance'),
        ('other', 'Other'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gate = models.ForeignKey(Gate, on_delete=models.SET_NULL, null=True, related_name='incidents')
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='reported_incidents')
    entry = models.ForeignKey(Entry, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='incidents')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    occurred_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'incidents'
        ordering = ['-occurred_at']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"


# ─── BLACKLIST ────────────────────────────────────────────────────────────────

class Blacklist(models.Model):
    REASON_CHOICES = [
        ('security_threat', 'Security Threat'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('disturbance', 'Disturbance'),
        ('theft', 'Theft / Vandalism'),
        ('other', 'Other'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor = models.OneToOneField(Visitor, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name='blacklist')
    vehicle_plate = models.CharField(max_length=20, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField()
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                 related_name='blacklist_entries')
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)    # None = permanent
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blacklist'
        ordering = ['-created_at']

    def __str__(self):
        target = self.visitor or self.vehicle_plate or self.national_id
        return f"Blacklisted: {target}"


# ─── DELIVERY ────────────────────────────────────────────────────────────────

class Delivery(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Collection'),
        ('collected', 'Collected'),
        ('returned', 'Returned to Sender'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='deliveries')
    courier_name = models.CharField(max_length=200)
    courier_company = models.CharField(max_length=200, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    item_description = models.TextField(blank=True)
    received_at = models.DateTimeField(default=timezone.now)
    collected_at = models.DateTimeField(null=True, blank=True)
    collected_by = models.ForeignKey(Resident, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='collected_deliveries')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='received_deliveries')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    photo = models.ImageField(upload_to='deliveries/', blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deliveries'
        ordering = ['-received_at']
        verbose_name_plural = 'Deliveries'

    def __str__(self):
        return f"Delivery for {self.unit} from {self.courier_name}"


# ─── PARKING SLOT ────────────────────────────────────────────────────────────

class ParkingSlot(models.Model):
    TYPE_CHOICES = [
        ('resident', 'Resident'),
        ('visitor', 'Visitor'),
        ('disabled', 'Disabled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slot_number = models.CharField(max_length=20, unique=True)
    slot_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='resident')
    assigned_vehicle = models.OneToOneField(Vehicle, on_delete=models.SET_NULL,
                                            null=True, blank=True, related_name='parking_slot')
    is_occupied = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'parking_slots'
        ordering = ['slot_number']

    def __str__(self):
        return f"Slot {self.slot_number} ({'occupied' if self.is_occupied else 'free'})"


# ─── AUDIT LOG ───────────────────────────────────────────────────────────────

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('approve', 'Approve'),
        ('deny', 'Deny'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} – {self.action} on {self.model_name}"


# ─── NOTIFICATION ─────────────────────────────────────────────────────────────

class Notification(models.Model):
    TYPE_CHOICES = [
        ('visitor_arrival', 'Visitor Arrival'),
        ('delivery', 'Delivery'),
        ('incident', 'Incident'),
        ('pre_auth', 'Pre-Authorization'),
        ('overstay', 'Overstay'),
        ('system', 'System'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_entry = models.ForeignKey(Entry, on_delete=models.SET_NULL, null=True, blank=True)
    related_delivery = models.ForeignKey(Delivery, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient}"