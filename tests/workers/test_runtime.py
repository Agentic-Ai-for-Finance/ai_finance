import asyncio

import pytest

from data.workers import runtime


def test_retry_jitter_bounds_fallbacks_to_zero_when_invalid(monkeypatch):
    monkeypatch.setenv("WORKER_RETRY_JITTER_MIN_SECONDS", "10")
    monkeypatch.setenv("WORKER_RETRY_JITTER_MAX_SECONDS", "5")
    assert runtime.retry_jitter_bounds() == (0, 0)


def test_worker_run_mode_defaults_to_oneshot(monkeypatch):
    monkeypatch.delenv("WORKER_RUN_MODE", raising=False)
    assert runtime.worker_run_mode() == "oneshot"


def test_run_with_retries_retries_until_success(monkeypatch):
    monkeypatch.setenv("WORKER_MAX_ATTEMPTS", "3")
    monkeypatch.setenv("WORKER_RETRY_DELAY_SECONDS", "1")
    monkeypatch.setenv("WORKER_RETRY_JITTER_MIN_SECONDS", "0")
    monkeypatch.setenv("WORKER_RETRY_JITTER_MAX_SECONDS", "0")

    attempts = {"n": 0}
    slept = []
    warnings = []

    async def fake_sleep(seconds):
        slept.append(seconds)

    async def flaky():
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise RuntimeError("temporary")
        return 7

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    result = asyncio.run(runtime.run_with_retries("x", flaky, warnings.append))

    assert result == 7
    assert attempts["n"] == 3
    assert slept == [1, 1]
    assert len(warnings) == 2


def test_run_with_retries_raises_after_exhaustion(monkeypatch):
    monkeypatch.setenv("WORKER_MAX_ATTEMPTS", "2")
    monkeypatch.setenv("WORKER_RETRY_DELAY_SECONDS", "0")
    monkeypatch.setenv("WORKER_RETRY_JITTER_MIN_SECONDS", "0")
    monkeypatch.setenv("WORKER_RETRY_JITTER_MAX_SECONDS", "0")

    async def fake_sleep(_seconds):
        return None

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    async def always_fail():
        raise ValueError("down")

    with pytest.raises(ValueError, match="down"):
        asyncio.run(runtime.run_with_retries("x", always_fail, lambda _msg: None))
