"""Shared Mongo aggregations.

Display strings the UI needs (course name, tee time) are resolved here so the
frontend never has to hardcode them.
"""

from typing import Any

from bson import ObjectId

_TEE_TIME_LOOKUP: list[dict[str, Any]] = [
    {
        "$lookup": {
            "from": "tee_times",
            "localField": "tee_time_id",
            "foreignField": "_id",
            "as": "tee_time",
        }
    },
    {"$unwind": {"path": "$tee_time", "preserveNullAndEmptyArrays": True}},
    {
        "$lookup": {
            "from": "courses",
            "localField": "tee_time.course_id",
            "foreignField": "_id",
            "as": "course",
        }
    },
    {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
    {
        "$addFields": {
            "start_time": "$tee_time.start_time",
            "course_name": "$course.name",
            "course_timezone": "$course.timezone",
        }
    },
    {"$project": {"tee_time": 0, "course": 0}},
]


def booking_pipeline(
    match: dict[str, Any] | None = None, limit: int = 200
) -> list[dict[str, Any]]:
    pipeline: list[dict[str, Any]] = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({"$sort": {"created_at": -1}})
    pipeline.extend(_TEE_TIME_LOOKUP)
    pipeline.append({"$limit": limit})
    return pipeline


def tee_time_pipeline(
    match: dict[str, Any], limit: int = 200
) -> list[dict[str, Any]]:
    return [
        {"$match": match},
        {"$sort": {"start_time": 1}},
        {
            "$lookup": {
                "from": "courses",
                "localField": "course_id",
                "foreignField": "_id",
                "as": "course",
            }
        },
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {
            "$addFields": {
                "course_name": "$course.name",
                "course_timezone": "$course.timezone",
            }
        },
        {"$project": {"course": 0}},
        {"$limit": limit},
    ]


def course_with_image(course: dict[str, Any]) -> dict[str, Any]:
    """Attach the API path that streams this course's photo out of GridFS."""
    out = dict(course)
    image_file_id = out.get("image_file_id")
    if isinstance(image_file_id, ObjectId):
        out["image_url"] = f"/api/courses/{out['_id']}/image"
    else:
        out["image_url"] = None
    out.pop("image_file_id", None)
    return out
