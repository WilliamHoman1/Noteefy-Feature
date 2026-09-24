from fastapi import APIRouter, HTTPException, Query, status

from app.db import get_db
from app.models import TeeTime, TeeTimeCreate
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/tee-times", tags=["tee-times"])


@router.get("", response_model=list[TeeTime])
async def list_tee_times(course_id: str | None = Query(default=None)) -> list[dict]:
    query: dict = {}
    if course_id is not None:
        try:
            query["course_id"] = to_object_id(course_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    docs = await get_db().tee_times.find(query).sort("start_time", 1).to_list(200)
    return serialize_docs(docs)


@router.get("/{tee_time_id}", response_model=TeeTime)
async def get_tee_time(tee_time_id: str) -> dict:
    try:
        oid = to_object_id(tee_time_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = await get_db().tee_times.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Tee time not found")
    return serialize_doc(doc)


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
    doc = await get_db().tee_times.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)
