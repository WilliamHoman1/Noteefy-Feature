from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.db import get_db
from app.models import Booking, BookingCreate
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[Booking])
async def list_bookings() -> list[dict]:
    docs = await get_db().bookings.find().sort("created_at", -1).to_list(200)
    return serialize_docs(docs)


@router.post("", response_model=Booking, status_code=status.HTTP_201_CREATED)
async def create_booking(payload: BookingCreate) -> dict:
    try:
        tee_time_oid = to_object_id(payload.tee_time_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    tee_time = await get_db().tee_times.find_one({"_id": tee_time_oid})
    if tee_time is None:
        raise HTTPException(status_code=404, detail="Tee time not found")

    slots = int(tee_time.get("slots_available", 0))
    if payload.players > slots:
        raise HTTPException(
            status_code=409,
            detail=f"Only {slots} slot(s) available for this tee time",
        )

    await get_db().tee_times.update_one(
        {"_id": tee_time_oid},
        {"$inc": {"slots_available": -payload.players}},
    )

    doc_in = {
        "tee_time_id": tee_time_oid,
        "golfer_name": payload.golfer_name,
        "players": payload.players,
        "created_at": datetime.now(timezone.utc),
    }
    result = await get_db().bookings.insert_one(doc_in)
    doc = await get_db().bookings.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)
