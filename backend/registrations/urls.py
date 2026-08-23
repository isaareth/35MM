from django.urls import path

from .auth_views import LoginView, LogoutView
from .views import (
    AdminRegistrationCountView,
    AdminRegistrationExportView,
    AdminRegistrationListView,
    RegistrationCreateView,
)

urlpatterns = [
    path("registrations/", RegistrationCreateView.as_view(), name="registration-create"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("admin/registrations/", AdminRegistrationListView.as_view(), name="admin-registration-list"),
    path(
        "admin/registrations/count/",
        AdminRegistrationCountView.as_view(),
        name="admin-registration-count",
    ),
    path(
        "admin/registrations/export/",
        AdminRegistrationExportView.as_view(),
        name="admin-registration-export",
    ),
]
