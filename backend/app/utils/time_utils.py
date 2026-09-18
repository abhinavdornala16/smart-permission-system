"""Timezone-safe UTC time helpers."""
from datetime import datetime, timezone


def utcnow():
    """Return current UTC time as a naive datetime, replacing the deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)