from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


def serialize_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime) and value.tzinfo is None:
            # Mongo returns naive datetimes; tag them so clients don't read them as local.
            out[key] = value.replace(tzinfo=timezone.utc)
    return out


def serialize_docs(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize_doc(doc) for doc in docs if doc is not None]  # type: ignore[misc]


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id")
    return ObjectId(value)
