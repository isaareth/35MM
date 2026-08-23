from django.contrib import admin

from .models import Participant, Registration


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0
    ordering = ["position"]


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ["id", "leader_name", "participant_count", "created_at"]
    readonly_fields = ["id", "created_at"]
    inlines = [ParticipantInline]
    ordering = ["-created_at"]

    @admin.display(description="Líder")
    def leader_name(self, obj):
        leader = obj.leader
        return leader.full_name if leader else "—"

    @admin.display(description="Integrantes")
    def participant_count(self, obj):
        return obj.participants.count()
