import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


TZ = os.getenv("TZ", "Asia/Ho_Chi_Minh")
_tz = ZoneInfo(TZ)


def get_current_time() -> datetime:
    """Returns the current date and time."""
    return datetime.now(tz=_tz)