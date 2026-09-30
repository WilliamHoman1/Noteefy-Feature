from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

CartPolicy = Literal["optional", "included", "walking_only"]


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    created_at: datetime


class CourseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    city_state: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=40)
    holes: int = Field(default=18, ge=9, le=18)
    # Tee times are stored as UTC instants; the UI renders them in this zone.
    timezone: str = Field(default="America/New_York", max_length=60)


class Course(CourseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    # Points at GET /api/courses/{id}/image, which streams the photo out of GridFS.
    image_url: str | None = None


class TeeTimeCreate(BaseModel):
    course_id: str
    start_time: datetime
    slots_available: int = Field(default=4, ge=1, le=4)
    price_min_cents: int = Field(default=3000, ge=0)
    price_max_cents: int = Field(default=5500, ge=0)
    cart_policy: CartPolicy = "optional"
    holes_options: list[int] = Field(default_factory=lambda: [9, 18])


class TeeTime(TeeTimeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_name: str | None = None
    course_timezone: str | None = None


class FilterOption(BaseModel):
    value: str
    label: str
    count: int


class FilterGroup(BaseModel):
    key: str
    label: str
    options: list[FilterOption]


class CourseFilters(BaseModel):
    course_id: str
    groups: list[FilterGroup]


class BookingCreate(BaseModel):
    user_id: str
    tee_time_id: str
    players: int = Field(default=1, ge=1, le=4)
    holes: int = Field(ge=9, le=18)
    cart: bool = False


class Booking(BookingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    golfer_name: str
    created_at: datetime
    status: str = "confirmed"
    course_name: str | None = None
    course_timezone: str | None = None
    start_time: datetime | None = None
