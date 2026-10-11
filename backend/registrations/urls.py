from django.urls import path

from .auth_views import LoginView, LogoutView
from .views import (
    AdminDashboardView,
    AdminEventAttendanceView,
    AdminEventExportView,
    AdminEventListView,
    AdminEventRegistrationListView,
    AdminRegistrationDeleteView,
    AdminRegistrationExportView,
    AdminRegistrationListView,
    AdminSendConfirmationsView,
    EventDetailView,
    EventListView,
    EventRegistrationCreateView,
    RegistrationCreateView,
    RegistrationStatusView,
)

urlpatterns = [
    path("registrations/", RegistrationCreateView.as_view(), name="registration-create"),
    path("registrations/status/", RegistrationStatusView.as_view(), name="registration-status"),
    path("events/", EventListView.as_view(), name="event-list"),
    path("events/<slug:slug>/", EventDetailView.as_view(), name="event-detail"),
    path(
        "events/<slug:slug>/registrations/",
        EventRegistrationCreateView.as_view(),
        name="event-registration-create",
    ),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/registrations/", AdminRegistrationListView.as_view(), name="admin-registration-list"),
    path(
        "admin/registrations/export/",
        AdminRegistrationExportView.as_view(),
        name="admin-registration-export",
    ),
    path(
        "admin/registrations/send-confirmations/",
        AdminSendConfirmationsView.as_view(),
        name="admin-registration-send-confirmations",
    ),
    path(
        "admin/registrations/<uuid:pk>/",
        AdminRegistrationDeleteView.as_view(),
        name="admin-registration-delete",
    ),
    path("admin/events/", AdminEventListView.as_view(), name="admin-event-list"),
    path(
        "admin/events/<slug:slug>/registrations/",
        AdminEventRegistrationListView.as_view(),
        name="admin-event-registration-list",
    ),
    path(
        "admin/events/<slug:slug>/export/",
        AdminEventExportView.as_view(),
        name="admin-event-export",
    ),
    path(
        "admin/event-registrations/<uuid:pk>/attendance/",
        AdminEventAttendanceView.as_view(),
        name="admin-event-attendance",
    ),
]
