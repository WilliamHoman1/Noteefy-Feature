"""Seed the single demo course, its photo, and its tee times.

Everything the UI displays lives in Mongo, so this is where the course details,
prices, holes options, and cart policy are defined.
"""

from datetime import time, timedelta
from pathlib import Path

from bson import ObjectId
from gridfs.errors import NoFile

from app.db import get_db, get_gridfs
from app.timeutils import local_datetime, today_at

COURSE_NAME = "Noteefy Links West"
COURSE = {
    "name": COURSE_NAME,
    "city_state": "Jacksonville, FL",
    "address": "13823 Sutton Park Drive, Jacksonville, FL 32224",
    "phone": "(455) 555-1234",
    "holes": 18,
    "timezone": "America/New_York",
}

IMAGE_PATH = Path(__file__).parent / "assets" / "noteefy-links-west.jpg"
IMAGE_FILENAME = "noteefy-links-west.jpg"

# The six tee times from the design, with the slot counts each card shows.
DAILY_TEE_TIMES = [
    (time(8, 0), 4),
    (time(8, 10), 2),
    (time(8, 30), 4),
    (time(15, 20), 4),
    (time(15, 40), 4),
    (time(16, 10), 1),
]

PRICE_MIN_CENTS = 3000
PRICE_MAX_CENTS = 5500
CART_POLICY = "optional"
HOLES_OPTIONS = [9, 18]
DAYS_AHEAD = 14

# Courses from the original environment skeleton, replaced by Noteefy Links West.
LEGACY_COURSE_NAMES = ["Pebble Dunes", "Lakeside Links"]


async def seed_if_empty() -> None:
    await _remove_legacy_data()
    course = await _ensure_course()
    await _ensure_course_image(course)
    await _ensure_tee_times(course)


async def _remove_legacy_data() -> None:
    db = get_db()
    legacy = await db.courses.find(
        {"name": {"$in": LEGACY_COURSE_NAMES}}, {"_id": 1}
    ).to_list(10)

    if legacy:
        legacy_ids = [doc["_id"] for doc in legacy]
        await db.tee_times.delete_many({"course_id": {"$in": legacy_ids}})
        await db.courses.delete_many({"_id": {"$in": legacy_ids}})

    # Skeleton bookings predate users, so they have no owner to show them under.
    await db.bookings.delete_many({"user_id": {"$exists": False}})


async def _ensure_course() -> dict:
    db = get_db()
    await db.courses.update_one(
        {"name": COURSE_NAME}, {"$set": COURSE}, upsert=True
    )
    return await db.courses.find_one({"name": COURSE_NAME})


async def _ensure_course_image(course: dict) -> None:
    """Upload the course photo into GridFS so the API can stream it from the DB."""
    if await _image_is_readable(course.get("image_file_id")):
        return

    if not IMAGE_PATH.exists():
        return

    file_id = await get_gridfs().upload_from_stream(
        IMAGE_FILENAME,
        IMAGE_PATH.read_bytes(),
        metadata={"contentType": "image/jpeg", "course_name": COURSE_NAME},
    )
    await get_db().courses.update_one(
        {"_id": course["_id"]}, {"$set": {"image_file_id": file_id}}
    )
    course["image_file_id"] = file_id


async def _image_is_readable(file_id: object) -> bool:
    if not isinstance(file_id, ObjectId):
        return False
    try:
        stream = await get_gridfs().open_download_stream(file_id)
    except NoFile:
        return False
    stream.close()
    return True


async def _ensure_tee_times(course: dict) -> None:
    db = get_db()
    tz_name = course.get("timezone")
    today = today_at(tz_name)
    to_insert = []

    for day_offset in range(DAYS_AHEAD):
        day = today + timedelta(days=day_offset)
        for at, slots in DAILY_TEE_TIMES:
            start_time = local_datetime(day, at, tz_name)
            exists = await db.tee_times.find_one(
                {"course_id": course["_id"], "start_time": start_time},
                {"_id": 1},
            )
            if exists is None:
                to_insert.append(
                    {
                        "course_id": course["_id"],
                        "start_time": start_time,
                        "slots_available": slots,
                        "price_min_cents": PRICE_MIN_CENTS,
                        "price_max_cents": PRICE_MAX_CENTS,
                        "cart_policy": CART_POLICY,
                        "holes_options": list(HOLES_OPTIONS),
                    }
                )

    if to_insert:
        await db.tee_times.insert_many(to_insert)
