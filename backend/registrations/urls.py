from django.urls import path

from .auth_views import LoginView, LogoutView
from .gala_views import (
    AdminEmailTestView,
    AdminGalaSendView,
    AdminGalaSummaryView,
    AdminGalaTicketLookupView,
    AdminGalaValidateView,
    GalaInvitationDetailView,
    GalaInvitationQrView,
    GalaInvitationRsvpView,
)
from .views import (
    AdminAnalyticsView,
    AdminDashboardView,
    AdminEventAttendanceView,
    AdminEventExportView,
    AdminEventListView,
    AdminEventRegistrationListView,
    AdminRegistrationDeleteView,
    AdminRegistrationExportView,
    AdminRegistrationListView,
    AdminRegistrationSubmissionView,
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
    path(
        "gala/invitations/<uuid:token>/",
        GalaInvitationDetailView.as_view(),
        name="gala-invitation-detail",
    ),
    path(
        "gala/invitations/<uuid:token>/rsvp/",
        GalaInvitationRsvpView.as_view(),
        name="gala-invitation-rsvp",
    ),
    path(
        "gala/invitations/<uuid:token>/qr.png",
        GalaInvitationQrView.as_view(),
        name="gala-invitation-qr",
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
        "admin/registrations/<uuid:pk>/submission/",
        AdminRegistrationSubmissionView.as_view(),
        name="admin-registration-submission",
    ),
    path(
        "admin/registrations/<uuid:pk>/",
        AdminRegistrationDeleteView.as_view(),
        name="admin-registration-delete",
    ),
    path(
        "admin/registrations/<uuid:pk>/gala-invitations/",
        AdminGalaSendView.as_view(),
        name="admin-gala-send",
    ),
    path(
        "admin/gala/tickets/<str:token>/",
        AdminGalaTicketLookupView.as_view(),
        name="admin-gala-ticket",
    ),
    path("admin/email/test/", AdminEmailTestView.as_view(), name="admin-email-test"),
    path("admin/gala/validate/", AdminGalaValidateView.as_view(), name="admin-gala-validate"),
    path("admin/gala/summary/", AdminGalaSummaryView.as_view(), name="admin-gala-summary"),
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
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
