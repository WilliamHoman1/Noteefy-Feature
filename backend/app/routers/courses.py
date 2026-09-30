from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from gridfs.errors import NoFile

from app.db import get_db, get_gridfs
from app.models import Course, CourseCreate, CourseFilters
from app.queries import course_with_image
from app.serializers import serialize_doc, to_object_id
from app.timeutils import start_of_today
from app.windows import TEE_TIME_WINDOWS

router = APIRouter(prefix="/api/courses", tags=["courses"])

_CART_LABELS = {
    "optional": "Cart Optional",
    "included": "Cart Included",
    "walking_only": "Walking Only",
}


@router.get("", response_model=list[Course])
async def list_courses() -> list[dict]:
    docs = await get_db().courses.find().sort("name", 1).to_list(100)
    return [serialize_doc(course_with_image(doc)) for doc in docs]


@router.get("/{course_id}", response_model=Course)
async def get_course(course_id: str) -> dict:
    try:
        oid = to_object_id(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = await get_db().courses.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return serialize_doc(course_with_image(doc))


@router.get("/{course_id}/image")
async def get_course_image(course_id: str) -> Response:
    """Stream the course photo straight out of GridFS."""
    try:
        oid = to_object_id(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    course = await get_db().courses.find_one({"_id": oid}, {"image_file_id": 1})
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    file_id = course.get("image_file_id")
    if file_id is None:
        raise HTTPException(status_code=404, detail="Course has no image")

    try:
        stream = await get_gridfs().open_download_stream(file_id)
    except NoFile as exc:
        raise HTTPException(status_code=404, detail="Course image is missing") from exc

    metadata = stream.metadata or {}
    return StreamingResponse(
        stream,
        media_type=metadata.get("contentType", "application/octet-stream"),
        headers={
            "Content-Length": str(stream.length),
            "Cache-Control": "public, max-age=3600",
            "ETag": f'"{file_id}"',
        },
    )


@router.get("/{course_id}/filters", response_model=CourseFilters)
async def get_course_filters(course_id: str) -> dict:
    """Derive every sidebar filter option from this course's upcoming tee times."""
    try:
        oid = to_object_id(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    course = await get_db().courses.find_one({"_id": oid}, {"timezone": 1})
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    match = {
        "course_id": oid,
        "start_time": {"$gte": start_of_today(course.get("timezone"))},
    }
    pipeline = [
        {"$match": match},
        {
            "$lookup": {
                "from": "courses",
                "localField": "course_id",
                "foreignField": "_id",
                "as": "course",
            }
        },
        {"$unwind": "$course"},
        {
            "$facet": {
                "group_sizes": [
                    {"$group": {"_id": "$slots_available", "count": {"$sum": 1}}},
                    {"$sort": {"_id": 1}},
                ],
                "holes": [
                    {"$unwind": "$holes_options"},
                    {"$group": {"_id": "$holes_options", "count": {"$sum": 1}}},
                    {"$sort": {"_id": 1}},
                ],
                "courses": [
                    {"$group": {"_id": "$course.name", "count": {"$sum": 1}}},
                    {"$sort": {"_id": 1}},
                ],
                "carts": [
                    {"$group": {"_id": "$cart_policy", "count": {"$sum": 1}}},
                    {"$sort": {"_id": 1}},
                ],
                "hours": [
                    {
                        "$group": {
                            "_id": {
                                "$hour": {
                                    "date": "$start_time",
                                    "timezone": "$course.timezone",
                                }
                            },
                            "count": {"$sum": 1},
                        }
                    },
                ],
            }
        },
    ]

    facets = await get_db().tee_times.aggregate(pipeline).to_list(1)
    facet = facets[0] if facets else {}

    groups = [
        {
            "key": "group_size",
            "label": "Group Size",
            "options": [
                {
                    "value": str(row["_id"]),
                    "label": f"{row['_id']} Player" + ("" if row["_id"] == 1 else "s"),
                    "count": row["count"],
                }
                for row in facet.get("group_sizes", [])
                if row.get("_id") is not None
            ],
        },
        {
            "key": "holes",
            "label": "Number of Holes",
            "options": [
                {
                    "value": str(row["_id"]),
                    "label": f"{row['_id']} Holes",
                    "count": row["count"],
                }
                for row in facet.get("holes", [])
                if row.get("_id") is not None
            ],
        },
        {
            "key": "course",
            "label": "Courses",
            "options": [
                {"value": row["_id"], "label": row["_id"], "count": row["count"]}
                for row in facet.get("courses", [])
                if row.get("_id")
            ],
        },
        {
            "key": "cart_policy",
            "label": "Cart",
            "options": [
                {
                    "value": row["_id"],
                    "label": _CART_LABELS.get(row["_id"], row["_id"]),
                    "count": row["count"],
                }
                for row in facet.get("carts", [])
                if row.get("_id")
            ],
        },
        {
            "key": "tee_time",
            "label": "Tee Time",
            "options": _window_options(facet.get("hours", [])),
        },
    ]

    return {
        "course_id": course_id,
        "groups": [group for group in groups if group["options"]],
    }


def _window_options(hour_rows: list[dict]) -> list[dict]:
    """Roll per-hour counts into the named windows that actually have tee times."""
    options = []
    for window in TEE_TIME_WINDOWS:
        count = sum(
            row["count"]
            for row in hour_rows
            if row.get("_id") is not None
            and window.start_hour <= row["_id"] < window.end_hour
        )
        if count:
            options.append({"value": window.key, "label": window.label, "count": count})
    return options


@router.post("", response_model=Course, status_code=status.HTTP_201_CREATED)
async def create_course(payload: CourseCreate) -> dict:
    result = await get_db().courses.insert_one(payload.model_dump())
    doc = await get_db().courses.find_one({"_id": result.inserted_id})
    return serialize_doc(course_with_image(doc))
