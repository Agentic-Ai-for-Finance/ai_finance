from __future__ import annotations

import asyncio
import os
import random
from collections.abc import Awaitable, Callable


def _int_from_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def worker_run_mode() -> str:
    mode = (os.getenv("WORKER_RUN_MODE", "oneshot") or "oneshot").strip().lower()
    return mode if mode in {"oneshot", "daemon"} else "oneshot"


def max_attempts() -> int:
    return max(1, _int_from_env("WORKER_MAX_ATTEMPTS", 15))


def retry_delay_seconds() -> int:
    return max(0, _int_from_env("WORKER_RETRY_DELAY_SECONDS", 60))


def retry_jitter_bounds() -> tuple[int, int]:
    min_seconds = _int_from_env("WORKER_RETRY_JITTER_MIN_SECONDS", 5)
    max_seconds = _int_from_env("WORKER_RETRY_JITTER_MAX_SECONDS", 15)
    if min_seconds < 0 or max_seconds < min_seconds:
        return (0, 0)
    return (min_seconds, max_seconds)


async def run_with_retries(
    label: str,
    runner: Callable[[], Awaitable[int]],
    log_warning: Callable[[str], None],
) -> int:
    attempts = max_attempts()
    delay_seconds = retry_delay_seconds()
    jitter_min_seconds, jitter_max_seconds = retry_jitter_bounds()
    for attempt in range(1, attempts + 1):
        try:
            return await runner()
        except Exception as exc:
            if attempt >= attempts:
                raise
            jitter_seconds = random.randint(jitter_min_seconds, jitter_max_seconds)
            sleep_seconds = delay_seconds + jitter_seconds
            log_warning(
                f"{label} failed on attempt {attempt}/{attempts}: "
                f"{type(exc).__name__}: {exc}. Retrying in {sleep_seconds}s."
            )
            await asyncio.sleep(sleep_seconds)
    return 0
