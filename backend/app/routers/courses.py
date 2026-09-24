from fastapi import APIRouter, HTTPException, status

from app.db import get_db
from app.models import Course, CourseCreate
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[Course])
async def list_courses() -> list[dict]:
    docs = await get_db().courses.find().sort("name", 1).to_list(100)
    return serialize_docs(docs)


@router.get("/{course_id}", response_model=Course)
async def get_course(course_id: str) -> dict:
    try:
        oid = to_object_id(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = await get_db().courses.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return serialize_doc(doc)


@router.post("", response_model=Course, status_code=status.HTTP_201_CREATED)
async def create_course(payload: CourseCreate) -> dict:
    result = await get_db().courses.insert_one(payload.model_dump())
    doc = await get_db().courses.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)
