"""Aggregate metrics for the admin analytics dashboard.

Everything is computed in Python from a handful of cheap queries: the data
set is a few hundred rows, so clarity beats pushing group-bys into SQL.
No personal data leaves this module — only counts.
"""

from collections import Counter
from datetime import timedelta

from django.utils import timezone

from .institutions import institution_group
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


def _top_labels(values, blank_label, n=TOP_N):
    """Group institution answers (see institutions.py), label each group
    with its canonical name or most common spelling, keep the top n and
    fold the rest into "Otras"."""
    groups, spellings = Counter(), {}
    for raw in values:
        text = " ".join((raw or "").split())
        key, label = institution_group(text)
        groups[key] += 1
        spellings.setdefault(key, Counter())[label or text or blank_label] += 1

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


def _percent(part, whole):
    return round(100 * part / whole) if whole else 0


def _teams():
    """One entry per team. Registrations sharing a leader email are
    duplicates of the same team, so they are counted once; the team counts
    as submitted if any of its registrations was marked."""
    groups = {}
    queryset = Registration.objects.prefetch_related("participants").order_by("created_at")
    for registration in queryset:
        participants = list(registration.participants.all())
        leader = next((p for p in participants if p.is_leader), None)
        key = leader.institutional_email.strip().lower() if leader else f"registration:{registration.id}"
        groups.setdefault(key, []).append((registration, participants, leader))

    teams = []
    for entries in groups.values():
        submitted = [e for e in entries if e[0].film_submitted]
        registration, participants, leader = (submitted or entries)[-1]
        teams.append(
            {
                "first_created": entries[0][0].created_at,
                "registrations": len(entries),
                "submitted": bool(submitted),
                "film_title": registration.film_title if submitted else "",
                "size": len(participants),
                "institution": leader.institution if leader else "",
                "emails": {
                    p.institutional_email.strip().lower() for _, parts, _ in entries for p in parts
                },
            }
        )
    return teams


def _rate_row(name, teams):
    submitted = sum(1 for t in teams if t["submitted"])
    return {"name": name, "teams": len(teams), "submitted": submitted, "rate": _percent(submitted, len(teams))}


def _submission_rates_by_institution(teams, n=TOP_N):
    groups, spellings = {}, {}
    for team in teams:
        text = " ".join((team["institution"] or "").split())
        key, label = institution_group(text)
        groups.setdefault(key, []).append(team)
        spellings.setdefault(key, Counter())[label or text or "Sin institución"] += 1

    ranked = sorted(groups.items(), key=lambda item: -len(item[1]))
    rows = [_rate_row(spellings[key].most_common(1)[0][0], group) for key, group in ranked[:n]]
    rest = [t for _, group in ranked[n:] for t in group]
    if rest:
        rows.append(_rate_row("Otras", rest))
    return rows


def _submissions(talk_emails):
    teams = _teams()
    submitted = [t for t in teams if t["submitted"]]

    by_size = {}
    for team in teams:
        by_size.setdefault(team["size"], []).append(team)

    by_week = {}
    for team in teams:
        day = _local(team["first_created"]).date()
        by_week.setdefault(day - timedelta(days=day.weekday()), []).append(team)

    with_talks = [t for t in teams if t["emails"] & talk_emails]
    without_talks = [t for t in teams if not t["emails"] & talk_emails]

    return {
        "unique_teams": len(teams),
        "duplicate_registrations": sum(t["registrations"] - 1 for t in teams),
        "submitted_teams": len(submitted),
        "rate": _percent(len(submitted), len(teams)),
        "participants_in_submitting_teams": sum(t["size"] for t in submitted),
        "by_institution": _submission_rates_by_institution(teams),
        "by_team_size": [
            {**_rate_row(f"{size} integrantes", group), "size": size}
            for size, group in sorted(by_size.items())
        ],
        "by_signup_week": [
            {**_rate_row("", group), "week_start": week.isoformat()}
            for week, group in sorted(by_week.items())
        ],
        "talk_engagement": {
            "with_talks": _rate_row("Con integrantes en charlas", with_talks),
            "without_talks": _rate_row("Sin integrantes en charlas", without_talks),
        },
        "films": sorted(
            (
                {"title": t["film_title"] or "(sin título)", "institution": t["institution"], "size": t["size"]}
                for t in submitted
            ),
            key=lambda f: f["title"].lower(),
        ),
    }


def _festival(talk_emails):
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
        "submissions": _submissions(talk_emails),
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
    event_emails = {e.strip().lower() for e in EventRegistration.objects.values_list("email", flat=True)}
    festival = _festival(event_emails)
    events = _events(today)

    festival_emails = {
        e.strip().lower() for e in Participant.objects.values_list("institutional_email", flat=True)
    }

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
