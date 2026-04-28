# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users',            views.UserViewSet,              basename='users')
router.register(r'blocks',           views.BlockViewSet,             basename='blocks')
router.register(r'units',            views.UnitViewSet,              basename='units')
router.register(r'residents',        views.ResidentViewSet,          basename='residents')
router.register(r'vehicles',         views.VehicleViewSet,           basename='vehicles')
router.register(r'visitors',         views.VisitorViewSet,           basename='visitors')
router.register(r'gates',            views.GateViewSet,              basename='gates')
router.register(r'entries',          views.EntryViewSet,             basename='entries')
router.register(r'pre-authorizations', views.PreAuthorizationViewSet, basename='pre-auth')
router.register(r'incidents',        views.IncidentViewSet,          basename='incidents')
router.register(r'blacklist',        views.BlacklistViewSet,         basename='blacklist')
router.register(r'deliveries',       views.DeliveryViewSet,          basename='deliveries')
router.register(r'parking',          views.ParkingSlotViewSet,       basename='parking')
router.register(r'audit-logs',       views.AuditLogViewSet,          basename='audit-logs')
router.register(r'notifications',    views.NotificationViewSet,      basename='notifications')

urlpatterns = [
    path('', include(router.urls)),

    # Auth
    path('auth/login/',   views.LoginView.as_view(),  name='login'),
    path('auth/logout/',  views.LogoutView.as_view(), name='logout'),
    path('auth/me/',      views.MeView.as_view(),     name='me'),

    # Dashboard & Reports
    path('dashboard/',    views.DashboardView.as_view(), name='dashboard'),
    path('reports/',      views.ReportsView.as_view(),   name='reports'),
]