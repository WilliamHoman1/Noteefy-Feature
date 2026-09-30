"""Tee times are stored as UTC instants but searched by the course's local day."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "America/New_York"


def course_zone(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def local_datetime(day: date, at: time, tz_name: str | None) -> datetime:
    """Build the UTC instant for a wall-clock time at the course."""
    return datetime.combine(day, at, tzinfo=course_zone(tz_name)).astimezone(timezone.utc)


def today_at(tz_name: str | None) -> date:
    return datetime.now(course_zone(tz_name)).date()


def start_of_today(tz_name: str | None) -> datetime:
    return local_datetime(today_at(tz_name), time.min, tz_name)


def day_bounds(day: date, tz_name: str | None) -> tuple[datetime, datetime]:
    start = local_datetime(day, time.min, tz_name)
    end = local_datetime(day + timedelta(days=1), time.min, tz_name)
    return start, end
