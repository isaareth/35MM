from rest_framework.permissions import BasePermission

DOOR_GROUP = "puerta"


def is_door_staff(user) -> bool:
    """Staff members of the "puerta" group: they may only use the gala door scanner."""
    return bool(
        user and user.is_authenticated and user.is_active and user.groups.filter(name=DOOR_GROUP).exists()
    )


class IsAdminOrDoorStaff(BasePermission):
    """Admins, or door staff. Used only by the two scanner endpoints; every
    other admin endpoint keeps IsAdminUser, so a door account cannot see the
    registrations, export Excel files, delete anything or read the metrics."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and (user.is_staff or is_door_staff(user)))
