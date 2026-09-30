from datetime import date, time, timedelta

from fastapi import APIRouter, HTTPException, Query, status

from app.db import get_db
from app.models import CartPolicy, TeeTime, TeeTimeCreate
from app.queries import tee_time_pipeline
from app.serializers import serialize_doc, serialize_docs, to_object_id
from app.timeutils import day_bounds, local_datetime, today_at
from app.windows import WINDOWS_BY_KEY

router = APIRouter(prefix="/api/tee-times", tags=["tee-times"])


@router.get("", response_model=list[TeeTime])
async def list_tee_times(
    course_id: str | None = Query(default=None),
    date_on: date | None = Query(default=None, alias="date"),
    players: int | None = Query(default=None, ge=1, le=4),
    holes: int | None = Query(default=None, ge=9, le=18),
    cart_policy: CartPolicy | None = Query(default=None),
    tee_time_window: str | None = Query(default=None),
) -> list[dict]:
    query: dict = {}
    tz_name = None

    if course_id is not None:
        try:
            course_oid = to_object_id(course_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        course = await get_db().courses.find_one({"_id": course_oid}, {"timezone": 1})
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        query["course_id"] = course_oid
        tz_name = course.get("timezone")

    # Default to the course's today so the grid always lands on a day with tee times.
    day = date_on if date_on is not None else today_at(tz_name)
    start, end = day_bounds(day, tz_name)

    if tee_time_window is not None:
        window = WINDOWS_BY_KEY.get(tee_time_window)
        if window is None:
            raise HTTPException(
                status_code=400, detail=f"Unknown tee time window '{tee_time_window}'"
            )
        start = local_datetime(day, time(hour=window.start_hour), tz_name)
        end = (
            local_datetime(day + timedelta(days=1), time.min, tz_name)
            if window.end_hour >= 24
            else local_datetime(day, time(hour=window.end_hour), tz_name)
        )

    query["start_time"] = {"$gte": start, "$lt": end}

    if players is not None:
        query["slots_available"] = {"$gte": players}

    if holes is not None:
        query["holes_options"] = holes

    if cart_policy is not None:
        query["cart_policy"] = cart_policy

    docs = await get_db().tee_times.aggregate(tee_time_pipeline(query)).to_list(200)
    return serialize_docs(docs)


@router.get("/{tee_time_id}", response_model=TeeTime)
async def get_tee_time(tee_time_id: str) -> dict:
    try:
        oid = to_object_id(tee_time_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    docs = await get_db().tee_times.aggregate(tee_time_pipeline({"_id": oid})).to_list(1)
    if not docs:
        raise HTTPException(status_code=404, detail="Tee time not found")
    return serialize_doc(docs[0])


@router.post("", response_model=TeeTime, status_code=status.HTTP_201_CREATED)
async def create_tee_time(payload: TeeTimeCreate) -> dict:
    try:
        course_oid = to_object_id(payload.course_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    course = await get_db().courses.find_one({"_id": course_oid})
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    doc_in = payload.model_dump()
    doc_in["course_id"] = course_oid
    result = await get_db().tee_times.insert_one(doc_in)
    docs = await (
        get_db()
        .tee_times.aggregate(tee_time_pipeline({"_id": result.inserted_id}))
        .to_list(1)
    )
    return serialize_doc(docs[0])
