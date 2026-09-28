from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    holes: int = Field(default=18, ge=9, le=18)


class Course(CourseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str


class TeeTimeCreate(BaseModel):
    course_id: str
    start_time: datetime
    slots_available: int = Field(default=4, ge=1, le=4)
    price_cents: int = Field(default=7500, ge=0)


class TeeTime(TeeTimeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str


class BookingCreate(BaseModel):
    tee_time_id: str
    golfer_name: str = Field(min_length=1, max_length=80)
    players: int = Field(default=1, ge=1, le=4)


class Booking(BookingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    status: str = "confirmed"
