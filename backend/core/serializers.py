from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, Block, Unit, Resident, Vehicle, Visitor,
    Gate, Entry, PreAuthorization, Incident, Blacklist,
    Delivery, ParkingSlot, AuditLog, Notification
)


# ─── AUTH ────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'role', 'phone', 'avatar', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'password', 'role', 'phone']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ─── BLOCK / UNIT ────────────────────────────────────────────────────────────

class BlockSerializer(serializers.ModelSerializer):
    unit_count = serializers.SerializerMethodField()

    class Meta:
        model = Block
        fields = ['id', 'name', 'description', 'unit_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_unit_count(self, obj):
        return obj.units.count()


class UnitSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source='block.name', read_only=True)
    resident_count = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = ['id', 'block', 'block_name', 'unit_number', 'floor',
                  'status', 'resident_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_resident_count(self, obj):
        return obj.residents.filter(is_active=True).count()


# ─── RESIDENT ────────────────────────────────────────────────────────────────

class ResidentSerializer(serializers.ModelSerializer):
    unit_label = serializers.SerializerMethodField()
    vehicle_count = serializers.SerializerMethodField()

    class Meta:
        model = Resident
        fields = ['id', 'user', 'unit', 'unit_label', 'full_name', 'national_id',
                  'phone', 'email', 'photo', 'is_primary', 'move_in_date',
                  'move_out_date', 'is_active', 'notes', 'vehicle_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_unit_label(self, obj):
        return str(obj.unit) if obj.unit else None

    def get_vehicle_count(self, obj):
        return obj.vehicles.filter(is_active=True).count()


# ─── VEHICLE ─────────────────────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    parking_slot_number = serializers.CharField(
        source='parking_slot.slot_number', read_only=True, default=None)

    class Meta:
        model = Vehicle
        fields = ['id', 'resident', 'resident_name', 'plate_number', 'vehicle_type',
                  'make', 'model', 'color', 'year', 'is_registered',
                  'sticker_number', 'parking_slot_number', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── VISITOR ─────────────────────────────────────────────────────────────────

class VisitorSerializer(serializers.ModelSerializer):
    is_blacklisted = serializers.SerializerMethodField()

    class Meta:
        model = Visitor
        fields = ['id', 'full_name', 'national_id', 'phone',
                  'photo', 'id_document_photo', 'is_blacklisted', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_is_blacklisted(self, obj):
        return hasattr(obj, 'blacklist') and obj.blacklist.is_active


# ─── GATE ────────────────────────────────────────────────────────────────────

class GateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gate
        fields = ['id', 'name', 'location', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── ENTRY ───────────────────────────────────────────────────────────────────

class EntrySerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    visitor_name = serializers.CharField(source='visitor.full_name', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    host_unit_label = serializers.CharField(source='host_unit.__str__', read_only=True)
    gate_name = serializers.CharField(source='gate.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    is_inside = serializers.ReadOnlyField()

    class Meta:
        model = Entry
        fields = [
            'id', 'gate', 'gate_name', 'entry_type', 'direction', 'status',
            'resident', 'resident_name', 'visitor', 'visitor_name',
            'vehicle', 'vehicle_plate', 'host_unit', 'host_unit_label',
            'check_in_time', 'check_out_time', 'expected_checkout',
            'recorded_by', 'recorded_by_name', 'purpose', 'notes',
            'badge_number', 'duration_minutes', 'is_inside', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CheckInSerializer(serializers.Serializer):
    """Unified check-in: handles resident, visitor, or delivery."""
    entry_type = serializers.ChoiceField(choices=Entry.ENTRY_TYPE_CHOICES)
    gate_id = serializers.UUIDField()

    # Resident check-in
    resident_id = serializers.UUIDField(required=False)

    # Visitor check-in
    visitor_id = serializers.UUIDField(required=False)
    visitor_name = serializers.CharField(required=False, max_length=200)
    visitor_phone = serializers.CharField(required=False, max_length=20)
    visitor_national_id = serializers.CharField(required=False, max_length=50)

    # Vehicle
    vehicle_id = serializers.UUIDField(required=False)
    vehicle_plate = serializers.CharField(required=False, max_length=20)

    # Common
    host_unit_id = serializers.UUIDField(required=False)
    purpose = serializers.CharField(required=False, allow_blank=True)
    expected_checkout = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    pre_auth_code = serializers.CharField(required=False, max_length=20)


class CheckOutSerializer(serializers.Serializer):
    entry_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True)


# ─── PRE-AUTHORIZATION ───────────────────────────────────────────────────────

class PreAuthorizationSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    unit_label = serializers.CharField(source='resident.unit.__str__', read_only=True)
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = PreAuthorization
        fields = [
            'id', 'resident', 'resident_name', 'unit_label',
            'visitor_name', 'visitor_phone', 'visitor_vehicle_plate',
            'valid_from', 'valid_until', 'access_code', 'status', 'notes',
            'is_valid', 'created_at',
        ]
        read_only_fields = ['id', 'access_code', 'created_at']

    def create(self, validated_data):
        import random, string
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        validated_data['access_code'] = code
        return super().create(validated_data)


# ─── INCIDENT ────────────────────────────────────────────────────────────────

class IncidentSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    gate_name = serializers.CharField(source='gate.name', read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'gate', 'gate_name', 'reported_by', 'reported_by_name',
            'entry', 'title', 'description', 'category', 'severity',
            'occurred_at', 'resolved_at', 'resolution_notes', 'is_resolved', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ─── BLACKLIST ────────────────────────────────────────────────────────────────

class BlacklistSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source='added_by.get_full_name', read_only=True)
    visitor_name = serializers.CharField(source='visitor.full_name', read_only=True)

    class Meta:
        model = Blacklist
        fields = [
            'id', 'visitor', 'visitor_name', 'vehicle_plate', 'national_id',
            'reason', 'description', 'added_by', 'added_by_name',
            'is_active', 'expires_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ─── DELIVERY ────────────────────────────────────────────────────────────────

class DeliverySerializer(serializers.ModelSerializer):
    unit_label = serializers.CharField(source='unit.__str__', read_only=True)
    received_by_name = serializers.CharField(source='received_by.get_full_name', read_only=True)

    class Meta:
        model = Delivery
        fields = [
            'id', 'unit', 'unit_label', 'courier_name', 'courier_company',
            'tracking_number', 'item_description', 'received_at', 'collected_at',
            'collected_by', 'received_by', 'received_by_name', 'status',
            'photo', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ─── PARKING ─────────────────────────────────────────────────────────────────

class ParkingSlotSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(
        source='assigned_vehicle.plate_number', read_only=True, default=None)
    resident_name = serializers.CharField(
        source='assigned_vehicle.resident.full_name', read_only=True, default=None)

    class Meta:
        model = ParkingSlot
        fields = [
            'id', 'slot_number', 'slot_type', 'assigned_vehicle',
            'vehicle_plate', 'resident_name', 'is_occupied', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ─── AUDIT LOG ───────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'model_name',
                  'object_id', 'description', 'ip_address', 'created_at']
        read_only_fields = fields


# ─── NOTIFICATION ─────────────────────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read',
                  'related_entry', 'related_delivery', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

class DashboardStatsSerializer(serializers.Serializer):
    total_residents = serializers.IntegerField()
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    total_vehicles = serializers.IntegerField()
    entries_today = serializers.IntegerField()
    exits_today = serializers.IntegerField()
    currently_inside = serializers.IntegerField()
    pending_deliveries = serializers.IntegerField()
    open_incidents = serializers.IntegerField()
    active_blacklist = serializers.IntegerField()
    visitor_entries_today = serializers.IntegerField()
    entries_this_week = serializers.ListField()
    entry_type_breakdown = serializers.DictField()