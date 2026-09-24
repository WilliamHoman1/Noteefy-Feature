from datetime import datetime, timedelta, timezone

from app.db import get_db


async def seed_if_empty() -> None:
    db = get_db()
    if await db.courses.count_documents({}) > 0:
        return

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

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    tee_times = []
    for course_id in course_result.inserted_ids:
        for hour_offset in (9, 11, 14):
            tee_times.append(
                {
                    "course_id": course_id,
                    "start_time": now + timedelta(days=1, hours=hour_offset),
                    "slots_available": 4,
                    "price_cents": 6500 + hour_offset * 100,
                }
            )
    await db.tee_times.insert_many(tee_times)
