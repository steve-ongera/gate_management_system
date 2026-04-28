# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Block, Unit, Resident, Vehicle, Visitor,
    Gate, Entry, PreAuthorization, Incident, Blacklist,
    Delivery, ParkingSlot, AuditLog, Notification
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ('username', 'get_full_name', 'role', 'phone', 'is_active', 'created_at')
    list_filter   = ('role', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Gate OS', {'fields': ('role', 'phone', 'avatar')}),
    )


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display  = ('name', 'description', 'created_at')
    search_fields = ('name',)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display  = ('unit_number', 'block', 'floor', 'status', 'created_at')
    list_filter   = ('status', 'block')
    search_fields = ('unit_number',)


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display  = ('full_name', 'unit', 'national_id', 'phone', 'is_primary', 'is_active')
    list_filter   = ('is_active', 'is_primary')
    search_fields = ('full_name', 'national_id', 'phone')


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ('plate_number', 'vehicle_type', 'make', 'model', 'resident', 'is_active')
    list_filter   = ('vehicle_type', 'is_active')
    search_fields = ('plate_number', 'make', 'model')


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display  = ('full_name', 'national_id', 'phone', 'created_at')
    search_fields = ('full_name', 'national_id', 'phone')


@admin.register(Gate)
class GateAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'is_active')


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display  = ('entry_type', 'direction', 'gate', 'check_in_time', 'check_out_time', 'recorded_by')
    list_filter   = ('entry_type', 'direction', 'gate', 'status')
    search_fields = ('resident__full_name', 'visitor__full_name', 'vehicle__plate_number')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display  = ('title', 'category', 'severity', 'gate', 'is_resolved', 'occurred_at')
    list_filter   = ('severity', 'category', 'is_resolved')
    search_fields = ('title', 'description')


@admin.register(Blacklist)
class BlacklistAdmin(admin.ModelAdmin):
    list_display  = ('visitor', 'vehicle_plate', 'national_id', 'reason', 'is_active', 'created_at')
    list_filter   = ('reason', 'is_active')


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display  = ('unit', 'courier_name', 'status', 'received_at', 'collected_at')
    list_filter   = ('status',)
    search_fields = ('courier_name', 'tracking_number')


@admin.register(ParkingSlot)
class ParkingSlotAdmin(admin.ModelAdmin):
    list_display  = ('slot_number', 'slot_type', 'is_occupied', 'assigned_vehicle')
    list_filter   = ('slot_type', 'is_occupied')


@admin.register(PreAuthorization)
class PreAuthorizationAdmin(admin.ModelAdmin):
    list_display  = ('visitor_name', 'resident', 'access_code', 'status', 'valid_from', 'valid_until')
    list_filter   = ('status',)
    search_fields = ('visitor_name', 'access_code')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ('user', 'action', 'model_name', 'description', 'ip_address', 'created_at')
    list_filter   = ('action', 'model_name')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'description', 'ip_address', 'created_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter  = ('notification_type', 'is_read')