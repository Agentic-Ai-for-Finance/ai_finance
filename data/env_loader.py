from __future__ import annotations

import os
import subprocess
from pathlib import Path

from dotenv import load_dotenv


def _current_branch_name() -> str:
    branch_name = (
        os.getenv("GITHUB_REF_NAME")
        or os.getenv("BRANCH_NAME")
        or os.getenv("RAILWAY_GIT_BRANCH")
        or ""
    ).strip()
    if branch_name:
        return branch_name

    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return ""


def select_env_file(project_root: Path | None = None) -> Path:
    root = project_root or Path(__file__).resolve().parents[1]
    branch_name = _current_branch_name()
    env_name = (
        ".env.production"
        if branch_name == "main" or branch_name.startswith("hotfix-")
        else ".env.development"
    )
    env_path = root / env_name
    return env_path if env_path.exists() else root / ".env"


def load_branch_env(project_root: Path | None = None) -> Path:
    env_path = select_env_file(project_root=project_root)
    load_dotenv(dotenv_path=env_path)
    return env_path
