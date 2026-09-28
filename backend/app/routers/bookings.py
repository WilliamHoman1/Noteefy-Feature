from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.db import get_db
from app.models import Booking, BookingCreate
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[Booking])
async def list_bookings(
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    query: dict = {}
    if status_filter is not None:
        query["status"] = status_filter

    docs = await get_db().bookings.find(query).sort("created_at", -1).to_list(200)
    # Older seed rows may lack status; treat as confirmed in the response.
    for doc in docs:
        doc.setdefault("status", "confirmed")
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
        "status": "confirmed",
    }
    result = await get_db().bookings.insert_one(doc_in)
    doc = await get_db().bookings.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


@router.delete("/{booking_id}", response_model=Booking)
async def cancel_booking(booking_id: str) -> dict:
    try:
        oid = to_object_id(booking_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    booking = await get_db().bookings.find_one({"_id": oid})
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("status", "confirmed") == "cancelled":
        raise HTTPException(status_code=409, detail="Booking is already cancelled")

    await get_db().tee_times.update_one(
        {"_id": booking["tee_time_id"]},
        {"$inc": {"slots_available": int(booking["players"])}},
    )
    await get_db().bookings.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc),
            }
        },
    )

    doc = await get_db().bookings.find_one({"_id": oid})
    return serialize_doc(doc)
