"""Aggregate metrics for the admin analytics dashboard.

Everything is computed in Python from a handful of cheap queries: the data
set is a few hundred rows, so clarity beats pushing group-bys into SQL.
No personal data leaves this module — only counts.
"""

import unicodedata
from collections import Counter
from datetime import timedelta

from django.utils import timezone

from .models import Event, EventRegistration, Participant, Registration

TOP_N = 8


def _local(dt):
    return timezone.localtime(dt)


def _daily_series(datetimes):
    """One point per calendar day (local time) from the first to the last
    signup, zero-filled, with a running total."""
    counts = Counter(_local(dt).date() for dt in datetimes)
    if not counts:
        return []
    day, last = min(counts), max(counts)
    series, running = [], 0
    while day <= last:
        running += counts.get(day, 0)
        series.append({"date": day.isoformat(), "count": counts.get(day, 0), "cumulative": running})
        day += timedelta(days=1)
    return series


def _hourly(datetimes):
    hours = [0] * 24
    for dt in datetimes:
        hours[_local(dt).hour] += 1
    return hours


_FILLER_WORDS = {"universidad", "de", "del", "la", "las", "los", "el"}


def _normalize(text):
    """Grouping key for free-text institution names: ignores case, accents,
    spacing and filler words, so "EAFIT" and "Universidad EAFIT" match."""
    stripped = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    words = stripped.lower().split()
    meaningful = [w for w in words if w not in _FILLER_WORDS]
    return " ".join(meaningful or words)


def _top_labels(values, blank_label, n=TOP_N):
    """Group free-text values (case/accent/spacing-insensitive), label each
    group with its most common spelling, keep the top n and fold the rest
    into "Otras"."""
    groups, spellings = Counter(), {}
    for raw in values:
        text = " ".join((raw or "").split())
        key = _normalize(text) if text else ""
        groups[key] += 1
        spellings.setdefault(key, Counter())[text or blank_label] += 1

    ranked = groups.most_common()
    result = [
        {"name": spellings[key].most_common(1)[0][0], "count": count} for key, count in ranked[:n]
    ]
    rest = sum(count for _, count in ranked[n:])
    if rest:
        result.append({"name": "Otras", "count": rest})
    return result


def _top_counter(counter, n=TOP_N):
    ranked = counter.most_common()
    result = [{"name": name, "count": count} for name, count in ranked[:n]]
    rest = sum(count for _, count in ranked[n:])
    if rest:
        result.append({"name": "Otras", "count": rest})
    return result


def _festival():
    registrations = list(Registration.objects.all())
    participants = list(Participant.objects.all())

    team_sizes = Counter(Participant.objects.values_list("registration_id", flat=True))
    size_distribution = Counter(team_sizes.values())
    created = [r.created_at for r in registrations]

    domains = Counter(
        p.institutional_email.rsplit("@", 1)[-1].lower() for p in participants if "@" in p.institutional_email
    )

    return {
        "teams": len(registrations),
        "participants": len(participants),
        "avg_team_size": round(len(participants) / len(registrations), 1) if registrations else 0,
        "team_size_distribution": [
            {"size": size, "teams": size_distribution[size]} for size in sorted(size_distribution)
        ],
        "emails_sent": sum(1 for r in registrations if r.confirmation_email_sent_at),
        "emails_pending": sum(1 for r in registrations if not r.confirmation_email_sent_at),
        "daily": _daily_series(created),
        "hourly": _hourly(created),
        "institutions": _top_labels((p.institution for p in participants), "Sin institución"),
        "email_domains": _top_counter(domains),
    }


def _events(today):
    events = list(Event.objects.all())
    registrations = list(EventRegistration.objects.all())
    by_event = {}
    for r in registrations:
        by_event.setdefault(r.event_id, []).append(r)

    per_event, tracked_registered, tracked_attended = [], 0, 0
    for event in events:
        regs = by_event.get(event.id, [])
        attended = sum(1 for r in regs if r.attended_at)
        last_day = event.end_date or event.date
        past = (last_day <= today) if last_day else None
        # Zero marks on a past event usually means attendance was never
        # taken, not that nobody came — so it is not counted in the rate.
        tracked = attended > 0
        if tracked:
            tracked_registered += len(regs)
            tracked_attended += attended
        per_event.append(
            {
                "slug": event.slug,
                "title": event.title,
                "speaker": event.speaker,
                "date": event.date.isoformat() if event.date else None,
                "end_date": event.end_date.isoformat() if event.end_date else None,
                "past": past,
                "is_open": event.is_open,
                "registered": len(regs),
                "attended": attended,
                "attendance_tracked": tracked,
                "attendance_rate": round(100 * attended / len(regs)) if tracked and regs else None,
            }
        )

    emails = Counter(r.email.strip().lower() for r in registrations)
    created = [r.created_at for r in registrations]

    return {
        "activities": len(events),
        "signups": len(registrations),
        "unique_people": len(emails),
        "repeat_people": sum(1 for n in emails.values() if n > 1),
        "attended": sum(1 for r in registrations if r.attended_at),
        "attendance_rate": round(100 * tracked_attended / tracked_registered) if tracked_registered else None,
        "events_with_attendance": sum(1 for e in per_event if e["attendance_tracked"]),
        "per_event": per_event,
        "daily": _daily_series(created),
        "hourly": _hourly(created),
        "institutions": _top_labels((r.institution for r in registrations), "Sin institución"),
    }


def build_analytics():
    today = timezone.localdate()
    festival = _festival()
    events = _events(today)

    festival_emails = {
        e.strip().lower() for e in Participant.objects.values_list("institutional_email", flat=True)
    }
    event_emails = {e.strip().lower() for e in EventRegistration.objects.values_list("email", flat=True)}

    return {
        "generated_at": timezone.now().isoformat(),
        "overview": {
            "unique_people": len(festival_emails | event_emails),
            "festival_people": len(festival_emails),
            "event_people": len(event_emails),
            "in_both": len(festival_emails & event_emails),
        },
        "festival": festival,
        "events": events,
    }
