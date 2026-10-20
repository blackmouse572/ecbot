"""The image installs CPU-only torch, pinned to the version in uv.lock.

The lock carries PyPI's CUDA build of torch (about 4GB of nvidia and triton
packages that Cloud Run never uses). The Dockerfile skips those and installs
the same torch version from PyTorch's CPU index instead.
"""
import re
import tomllib
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]
DOCKERFILE = (APP_DIR / "Dockerfile").read_text()
LOCK = tomllib.loads((APP_DIR / "uv.lock").read_text())

CUDA_PACKAGE = re.compile(r"^(torch|triton|nvidia-.*|cuda-.*)$")


def _locked(name: str) -> dict:
    return next(p for p in LOCK["package"] if p["name"] == name)


def test_cpu_torch_matches_the_locked_version():
    match = re.search(r"^ARG TORCH_VERSION=(\S+)$", DOCKERFILE, re.M)
    assert match, "Dockerfile no longer declares ARG TORCH_VERSION"
    assert match.group(1) == _locked("torch")["version"]


def test_every_cuda_package_in_the_lock_is_skipped():
    match = re.search(r"^ARG SKIP_CUDA=\"([^\"]+)\"$", DOCKERFILE, re.M)
    assert match, "Dockerfile no longer declares ARG SKIP_CUDA"
    skipped = set(match.group(1).split())
    locked = {p["name"] for p in LOCK["package"] if CUDA_PACKAGE.match(p["name"])}
    assert skipped == locked
