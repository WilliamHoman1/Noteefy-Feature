from datetime import date, datetime, time, timedelta, timezone

from app.db import get_db


async def seed_if_empty() -> None:
    db = get_db()
    if await db.courses.count_documents({}) == 0:
        course_result = await db.courses.insert_many(
            [
                {
                    "name": "Pebble Dunes",
                    "location": "Monterey, CA",
                    "holes": 18,
                },
                {
                    "name": "Lakeside Links",
                    "location": "Austin, TX",
                    "holes": 18,
                },
            ]
        )
        course_ids = list(course_result.inserted_ids)
    else:
        course_ids = [doc["_id"] async for doc in db.courses.find({}, {"_id": 1})]

    await _ensure_upcoming_tee_times(course_ids)


async def _ensure_upcoming_tee_times(course_ids: list) -> None:
    db = get_db()
    today = datetime.now(timezone.utc).date()
    to_insert = []

    for course_id in course_ids:
        for day_offset in (1, 2, 3):
            day = today + timedelta(days=day_offset)
            for hour in (9, 11, 14):
                start_time = datetime.combine(day, time(hour=hour), tzinfo=timezone.utc)
                exists = await db.tee_times.find_one(
                    {
                        "course_id": course_id,
                        "start_time": start_time,
                    }
                )
                if exists is None:
                    to_insert.append(
                        {
                            "course_id": course_id,
                            "start_time": start_time,
                            "slots_available": 4,
                            "price_cents": 6500 + hour * 100,
                        }
                    )

    if to_insert:
        await db.tee_times.insert_many(to_insert)
