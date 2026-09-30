"""Named tee time windows.

Defined once so the filter endpoint that offers a window and the search that
applies it can never disagree.
"""

from typing import NamedTuple


class TeeTimeWindow(NamedTuple):
    key: str
    label: str
    start_hour: int
    end_hour: int


TEE_TIME_WINDOWS: tuple[TeeTimeWindow, ...] = (
    TeeTimeWindow("morning", "Morning (6am - 11am)", 6, 11),
    TeeTimeWindow("midday", "Midday (11am - 3pm)", 11, 15),
    TeeTimeWindow("afternoon", "Afternoon (3pm - 7pm)", 15, 19),
    TeeTimeWindow("evening", "Evening (7pm +)", 19, 24),
)

WINDOWS_BY_KEY = {window.key: window for window in TEE_TIME_WINDOWS}
