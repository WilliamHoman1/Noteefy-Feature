from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.db import get_db
from app.models import Booking, BookingCreate
from app.queries import booking_pipeline
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[Booking])
async def list_bookings(
    user_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    match: dict = {}

    if user_id is not None:
        try:
            match["user_id"] = to_object_id(user_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if status_filter is not None:
        match["status"] = status_filter

    docs = await get_db().bookings.aggregate(booking_pipeline(match)).to_list(200)
    return serialize_docs(docs)


@router.post("", response_model=Booking, status_code=status.HTTP_201_CREATED)
async def create_booking(payload: BookingCreate) -> dict:
    try:
        user_oid = to_object_id(payload.user_id)
        tee_time_oid = to_object_id(payload.tee_time_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = await get_db().users.find_one({"_id": user_oid}, {"name": 1})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    tee_time = await get_db().tee_times.find_one({"_id": tee_time_oid})
    if tee_time is None:
        raise HTTPException(status_code=404, detail="Tee time not found")

    # The tee time document decides which options are legal, not the client.
    holes_options = tee_time.get("holes_options") or []
    if payload.holes not in holes_options:
        allowed = " or ".join(str(option) for option in holes_options)
        raise HTTPException(
            status_code=400,
            detail=f"This tee time allows {allowed} holes",
        )

    cart_policy = tee_time.get("cart_policy", "optional")
    if cart_policy == "walking_only" and payload.cart:
        raise HTTPException(status_code=400, detail="This tee time is walking only")
    cart = True if cart_policy == "included" else payload.cart

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
        "user_id": user_oid,
        "tee_time_id": tee_time_oid,
        "golfer_name": user["name"],
        "players": payload.players,
        "holes": payload.holes,
        "cart": cart,
        "created_at": datetime.now(timezone.utc),
        "status": "confirmed",
    }
    result = await get_db().bookings.insert_one(doc_in)
    docs = await (
        get_db()
        .bookings.aggregate(booking_pipeline({"_id": result.inserted_id}))
        .to_list(1)
    )
    return serialize_doc(docs[0])


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

    docs = await get_db().bookings.aggregate(booking_pipeline({"_id": oid})).to_list(1)
    return serialize_doc(docs[0])
