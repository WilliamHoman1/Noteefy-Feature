from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db import get_db
from app.models import Booking, User, UserCreate, UserLogin
from app.queries import booking_pipeline
from app.security import hash_password, verify_password
from app.serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/users", tags=["users"])


def _public_user(doc: dict) -> dict:
    out = serialize_doc(doc)
    out.pop("password_hash", None)
    return out


@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate) -> dict:
    doc_in = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await get_db().users.insert_one(doc_in)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=409, detail="An account with that email already exists"
        ) from exc

    doc = await get_db().users.find_one({"_id": result.inserted_id})
    return _public_user(doc)


@router.post("/login", response_model=User)
async def login(payload: UserLogin) -> dict:
    doc = await get_db().users.find_one({"email": payload.email.lower()})
    if doc is None or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _public_user(doc)


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str) -> dict:
    try:
        oid = to_object_id(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = await get_db().users.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(doc)


@router.get("/{user_id}/bookings", response_model=list[Booking])
async def list_user_bookings(user_id: str) -> list[dict]:
    try:
        oid = to_object_id(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    docs = await (
        get_db().bookings.aggregate(booking_pipeline({"user_id": oid})).to_list(200)
    )
    return serialize_docs(docs)
