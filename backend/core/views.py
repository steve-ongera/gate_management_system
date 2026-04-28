from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta, datetime

from .models import (
    User, Block, Unit, Resident, Vehicle, Visitor,
    Gate, Entry, PreAuthorization, Incident, Blacklist,
    Delivery, ParkingSlot, AuditLog, Notification
)
from .serializers import (
    LoginSerializer, UserSerializer, UserCreateSerializer,
    BlockSerializer, UnitSerializer, ResidentSerializer,
    VehicleSerializer, VisitorSerializer, GateSerializer,
    EntrySerializer, CheckInSerializer, CheckOutSerializer,
    PreAuthorizationSerializer, IncidentSerializer, BlacklistSerializer,
    DeliverySerializer, ParkingSlotSerializer, AuditLogSerializer,
    NotificationSerializer, DashboardStatsSerializer
)
from .permissions import IsAdminUser, IsAdminOrSecurity


# ─── AUTH ────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        AuditLog.objects.create(
            user=user, action='login', model_name='User',
            object_id=str(user.id),
            description=f"{user.get_full_name()} logged in",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            AuditLog.objects.create(
                user=request.user, action='logout', model_name='User',
                object_id=str(request.user.id),
                description=f"{request.user.get_full_name()} logged out",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass
        return Response({'detail': 'Logged out successfully.'})


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# ─── DASHBOARD ───────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=6)

        entries_today_qs = Entry.objects.filter(check_in_time__date=today)
        inside_qs = Entry.objects.filter(
            direction='in', check_out_time__isnull=True
        )

        # Entries per day for the last 7 days
        entries_by_day = (
            Entry.objects.filter(check_in_time__date__gte=week_ago)
            .annotate(day=TruncDate('check_in_time'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        entries_week_list = [
            {'date': str(e['day']), 'count': e['count']} for e in entries_by_day
        ]

        # Entry type breakdown today
        type_breakdown = {
            t: entries_today_qs.filter(entry_type=t).count()
            for t, _ in Entry.ENTRY_TYPE_CHOICES
        }

        data = {
            'total_residents': Resident.objects.filter(is_active=True).count(),
            'total_units': Unit.objects.count(),
            'occupied_units': Unit.objects.filter(status='occupied').count(),
            'total_vehicles': Vehicle.objects.filter(is_active=True).count(),
            'entries_today': entries_today_qs.filter(direction='in').count(),
            'exits_today': entries_today_qs.filter(direction='out').count(),
            'currently_inside': inside_qs.count(),
            'pending_deliveries': Delivery.objects.filter(status='pending').count(),
            'open_incidents': Incident.objects.filter(is_resolved=False).count(),
            'active_blacklist': Blacklist.objects.filter(is_active=True).count(),
            'visitor_entries_today': entries_today_qs.filter(entry_type='visitor').count(),
            'entries_this_week': entries_week_list,
            'entry_type_breakdown': type_breakdown,
        }
        return Response(data)


# ─── USERS ───────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({'error': 'Password required.'}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password reset successfully.'})

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})


# ─── BLOCK / UNIT ────────────────────────────────────────────────────────────

class BlockViewSet(viewsets.ModelViewSet):
    queryset = Block.objects.all()
    serializer_class = BlockSerializer
    permission_classes = [IsAdminOrSecurity]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related('block').all()
    serializer_class = UnitSerializer
    permission_classes = [IsAdminOrSecurity]

    def get_queryset(self):
        qs = super().get_queryset()
        block = self.request.query_params.get('block')
        status_filter = self.request.query_params.get('status')
        if block:
            qs = qs.filter(block_id=block)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['get'])
    def residents(self, request, pk=None):
        unit = self.get_object()
        residents = unit.residents.filter(is_active=True)
        return Response(ResidentSerializer(residents, many=True).data)

    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        unit = self.get_object()
        deliveries = unit.deliveries.order_by('-received_at')[:20]
        return Response(DeliverySerializer(deliveries, many=True).data)


# ─── RESIDENTS ───────────────────────────────────────────────────────────────

class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.select_related('unit', 'unit__block').all()
    serializer_class = ResidentSerializer
    permission_classes = [IsAdminOrSecurity]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        unit = self.request.query_params.get('unit')
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(national_id__icontains=search) |
                Q(phone__icontains=search)
            )
        if unit:
            qs = qs.filter(unit_id=unit)
        return qs

    @action(detail=True, methods=['get'])
    def vehicles(self, request, pk=None):
        resident = self.get_object()
        return Response(VehicleSerializer(resident.vehicles.filter(is_active=True), many=True).data)

    @action(detail=True, methods=['get'])
    def entry_history(self, request, pk=None):
        resident = self.get_object()
        entries = resident.entries.order_by('-check_in_time')[:50]
        return Response(EntrySerializer(entries, many=True).data)


# ─── VEHICLES ────────────────────────────────────────────────────────────────

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related('resident').all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAdminOrSecurity]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(plate_number__icontains=search) |
                Q(make__icontains=search) |
                Q(model__icontains=search) |
                Q(resident__full_name__icontains=search)
            )
        return qs


# ─── VISITORS ────────────────────────────────────────────────────────────────

class VisitorViewSet(viewsets.ModelViewSet):
    queryset = Visitor.objects.all()
    serializer_class = VisitorSerializer
    permission_classes = [IsAdminOrSecurity]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(national_id__icontains=search) |
                Q(phone__icontains=search)
            )
        return qs


# ─── GATES ───────────────────────────────────────────────────────────────────

class GateViewSet(viewsets.ModelViewSet):
    queryset = Gate.objects.all()
    serializer_class = GateSerializer
    permission_classes = [IsAdminOrSecurity]


# ─── ENTRIES ─────────────────────────────────────────────────────────────────

class EntryViewSet(viewsets.ModelViewSet):
    queryset = Entry.objects.select_related(
        'gate', 'resident', 'visitor', 'vehicle', 'host_unit', 'recorded_by'
    ).all()
    serializer_class = EntrySerializer
    permission_classes = [IsAdminOrSecurity]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        date = params.get('date')
        entry_type = params.get('entry_type')
        direction = params.get('direction')
        gate = params.get('gate')
        search = params.get('search')
        inside_only = params.get('inside_only')

        if date:
            qs = qs.filter(check_in_time__date=date)
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        if direction:
            qs = qs.filter(direction=direction)
        if gate:
            qs = qs.filter(gate_id=gate)
        if inside_only == 'true':
            qs = qs.filter(direction='in', check_out_time__isnull=True)
        if search:
            qs = qs.filter(
                Q(resident__full_name__icontains=search) |
                Q(visitor__full_name__icontains=search) |
                Q(vehicle__plate_number__icontains=search) |
                Q(badge_number__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'])
    def check_in(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            gate = Gate.objects.get(id=data['gate_id'], is_active=True)
        except Gate.DoesNotExist:
            return Response({'error': 'Gate not found or inactive.'}, status=400)

        entry_kwargs = {
            'gate': gate,
            'entry_type': data['entry_type'],
            'direction': 'in',
            'recorded_by': request.user,
            'purpose': data.get('purpose', ''),
            'notes': data.get('notes', ''),
            'expected_checkout': data.get('expected_checkout'),
        }

        # Resolve resident or visitor
        if data.get('resident_id'):
            try:
                entry_kwargs['resident'] = Resident.objects.get(id=data['resident_id'])
            except Resident.DoesNotExist:
                return Response({'error': 'Resident not found.'}, status=400)
        else:
            # Create or get visitor
            visitor_data = {
                'full_name': data.get('visitor_name', ''),
                'phone': data.get('visitor_phone', ''),
                'national_id': data.get('visitor_national_id', ''),
            }
            if data.get('visitor_id'):
                try:
                    visitor = Visitor.objects.get(id=data['visitor_id'])
                except Visitor.DoesNotExist:
                    return Response({'error': 'Visitor not found.'}, status=400)
            else:
                visitor, _ = Visitor.objects.get_or_create(
                    national_id=visitor_data['national_id'],
                    defaults=visitor_data
                ) if visitor_data['national_id'] else (
                    Visitor.objects.create(**visitor_data), None
                )
                if _ is None and not visitor_data['national_id']:
                    visitor = Visitor.objects.create(**visitor_data)
            entry_kwargs['visitor'] = visitor

            # Blacklist check
            if hasattr(visitor, 'blacklist') and visitor.blacklist.is_active:
                return Response({
                    'error': 'Access denied. This visitor is blacklisted.',
                    'blacklist_reason': visitor.blacklist.reason,
                }, status=403)

        # Resolve vehicle
        if data.get('vehicle_id'):
            try:
                entry_kwargs['vehicle'] = Vehicle.objects.get(id=data['vehicle_id'])
            except Vehicle.DoesNotExist:
                return Response({'error': 'Vehicle not found.'}, status=400)
        elif data.get('vehicle_plate'):
            vehicle, _ = Vehicle.objects.get_or_create(
                plate_number=data['vehicle_plate'],
                defaults={'is_registered': False}
            )
            entry_kwargs['vehicle'] = vehicle

        if data.get('host_unit_id'):
            try:
                entry_kwargs['host_unit'] = Unit.objects.get(id=data['host_unit_id'])
            except Unit.DoesNotExist:
                pass

        # Pre-auth validation
        if data.get('pre_auth_code'):
            try:
                pre_auth = PreAuthorization.objects.get(access_code=data['pre_auth_code'])
                if pre_auth.is_valid():
                    pre_auth.status = 'used'
                    pre_auth.save()
                    entry_kwargs['status'] = 'approved'
                else:
                    return Response({'error': 'Pre-authorization code is invalid or expired.'}, status=400)
            except PreAuthorization.DoesNotExist:
                return Response({'error': 'Pre-authorization code not found.'}, status=400)

        entry = Entry.objects.create(**entry_kwargs)

        # Notify resident
        if entry.host_unit:
            residents_in_unit = entry.host_unit.residents.filter(is_active=True, user__isnull=False)
            person_name = entry.resident.full_name if entry.resident else entry.visitor.full_name
            for r in residents_in_unit:
                Notification.objects.create(
                    recipient=r.user,
                    notification_type='visitor_arrival',
                    title='Visitor Arrival',
                    message=f"{person_name} has arrived at the gate for your unit.",
                    related_entry=entry,
                )

        return Response(EntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def check_out(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entry = Entry.objects.get(id=data['entry_id'], direction='in',
                                      check_out_time__isnull=True)
        except Entry.DoesNotExist:
            return Response({'error': 'Active check-in record not found.'}, status=404)

        entry.check_out_time = timezone.now()
        if data.get('notes'):
            entry.notes += f"\nCheck-out note: {data['notes']}"
        entry.save()

        # Create corresponding out record
        out_entry = Entry.objects.create(
            gate=entry.gate,
            entry_type=entry.entry_type,
            direction='out',
            resident=entry.resident,
            visitor=entry.visitor,
            vehicle=entry.vehicle,
            recorded_by=request.user,
            check_in_time=entry.check_out_time,
        )

        return Response(EntrySerializer(entry).data)

    @action(detail=False, methods=['get'])
    def live(self, request):
        """Currently inside the compound."""
        entries = Entry.objects.filter(
            direction='in', check_out_time__isnull=True
        ).select_related('resident', 'visitor', 'vehicle', 'gate')
        return Response(EntrySerializer(entries, many=True).data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        entries = self.get_queryset().filter(check_in_time__date=today)
        return Response(EntrySerializer(entries, many=True).data)


# ─── PRE-AUTHORIZATION ───────────────────────────────────────────────────────

class PreAuthorizationViewSet(viewsets.ModelViewSet):
    queryset = PreAuthorization.objects.select_related('resident').all()
    serializer_class = PreAuthorizationSerializer
    permission_classes = [IsAdminOrSecurity]

    @action(detail=False, methods=['get'])
    def verify(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Code required.'}, status=400)
        try:
            pre_auth = PreAuthorization.objects.get(access_code=code)
            return Response({
                'valid': pre_auth.is_valid(),
                'pre_auth': PreAuthorizationSerializer(pre_auth).data,
            })
        except PreAuthorization.DoesNotExist:
            return Response({'valid': False, 'error': 'Code not found.'}, status=404)


# ─── INCIDENTS ───────────────────────────────────────────────────────────────

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('gate', 'reported_by').all()
    serializer_class = IncidentSerializer
    permission_classes = [IsAdminOrSecurity]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        incident = self.get_object()
        incident.is_resolved = True
        incident.resolved_at = timezone.now()
        incident.resolution_notes = request.data.get('resolution_notes', '')
        incident.save()
        return Response(IncidentSerializer(incident).data)


# ─── BLACKLIST ────────────────────────────────────────────────────────────────

class BlacklistViewSet(viewsets.ModelViewSet):
    queryset = Blacklist.objects.select_related('visitor', 'added_by').all()
    serializer_class = BlacklistSerializer
    permission_classes = [IsAdminOrSecurity]

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    @action(detail=False, methods=['get'])
    def check(self, request):
        """Quick check: is this person/vehicle blacklisted?"""
        national_id = request.query_params.get('national_id')
        plate = request.query_params.get('plate')
        q = Q(is_active=True)
        if national_id:
            q &= Q(national_id=national_id) | Q(visitor__national_id=national_id)
        if plate:
            q &= Q(vehicle_plate=plate)
        blacklisted = Blacklist.objects.filter(q).exists()
        return Response({'blacklisted': blacklisted})


# ─── DELIVERIES ───────────────────────────────────────────────────────────────

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related('unit', 'received_by').all()
    serializer_class = DeliverySerializer
    permission_classes = [IsAdminOrSecurity]

    def perform_create(self, serializer):
        delivery = serializer.save(received_by=self.request.user)
        # Notify residents in unit
        for resident in delivery.unit.residents.filter(is_active=True, user__isnull=False):
            Notification.objects.create(
                recipient=resident.user,
                notification_type='delivery',
                title='Package Received',
                message=f"A package from {delivery.courier_name} has arrived for your unit.",
                related_delivery=delivery,
            )

    @action(detail=True, methods=['post'])
    def collect(self, request, pk=None):
        delivery = self.get_object()
        if delivery.status == 'collected':
            return Response({'error': 'Already collected.'}, status=400)
        resident_id = request.data.get('resident_id')
        if resident_id:
            try:
                delivery.collected_by = Resident.objects.get(id=resident_id)
            except Resident.DoesNotExist:
                pass
        delivery.status = 'collected'
        delivery.collected_at = timezone.now()
        delivery.save()
        return Response(DeliverySerializer(delivery).data)


# ─── PARKING ─────────────────────────────────────────────────────────────────

class ParkingSlotViewSet(viewsets.ModelViewSet):
    queryset = ParkingSlot.objects.select_related('assigned_vehicle').all()
    serializer_class = ParkingSlotSerializer
    permission_classes = [IsAdminOrSecurity]

    @action(detail=False, methods=['get'])
    def available(self, request):
        slots = self.get_queryset().filter(is_occupied=False, is_active=True)
        return Response(ParkingSlotSerializer(slots, many=True).data)


# ─── AUDIT LOG ───────────────────────────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)


# ─── REPORTS ─────────────────────────────────────────────────────────────────

class ReportsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        report_type = request.query_params.get('type', 'entries')
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        qs = Entry.objects.all()
        if start:
            qs = qs.filter(check_in_time__date__gte=start)
        if end:
            qs = qs.filter(check_in_time__date__lte=end)

        if report_type == 'entries':
            data = (
                qs.annotate(day=TruncDate('check_in_time'))
                  .values('day')
                  .annotate(
                      total=Count('id'),
                      residents=Count('id', filter=Q(entry_type='resident')),
                      visitors=Count('id', filter=Q(entry_type='visitor')),
                      deliveries=Count('id', filter=Q(entry_type='delivery')),
                  )
                  .order_by('day')
            )
            return Response(list(data))

        if report_type == 'incidents':
            data = (
                Incident.objects.values('category', 'severity')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
            return Response(list(data))

        if report_type == 'occupancy':
            data = {
                'total_units': Unit.objects.count(),
                'occupied': Unit.objects.filter(status='occupied').count(),
                'vacant': Unit.objects.filter(status='vacant').count(),
                'maintenance': Unit.objects.filter(status='maintenance').count(),
            }
            return Response(data)

        return Response({'error': 'Unknown report type.'}, status=400)