from django.urls import path

from .auth_views import LoginView, LogoutView
from .views import (
    AdminDashboardView,
    AdminRegistrationDeleteView,
    AdminRegistrationExportView,
    AdminRegistrationListView,
    AdminSendConfirmationsView,
    AdminTalkRegistrationExportView,
    AdminTalkRegistrationListView,
    RegistrationCreateView,
    RegistrationStatusView,
    TalkRegistrationCreateView,
)

urlpatterns = [
    path("registrations/", RegistrationCreateView.as_view(), name="registration-create"),
    path("registrations/status/", RegistrationStatusView.as_view(), name="registration-status"),
    path("talk-registrations/", TalkRegistrationCreateView.as_view(), name="talk-registration-create"),
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
        "admin/talk-registrations/",
        AdminTalkRegistrationListView.as_view(),
        name="admin-talk-registration-list",
    ),
    path(
        "admin/talk-registrations/export/",
        AdminTalkRegistrationExportView.as_view(),
        name="admin-talk-registration-export",
    ),
    path(
        "admin/registrations/<uuid:pk>/",
        AdminRegistrationDeleteView.as_view(),
        name="admin-registration-delete",
    ),
]
