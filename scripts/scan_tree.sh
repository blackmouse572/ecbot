#!/usr/bin/env bash

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: This script must be run inside a Git repository." >&2
    exit 1
fi

SCAN_PATH="."
while getopts "p:" opt; do
  case ${opt} in
    p ) SCAN_PATH=$OPTARG ;;
    \? ) echo "Usage: $0 [-p path_to_scan]" >&2; exit 1 ;;
  esac
done

echo "# Project Structure ($SCAN_PATH)"

# Pass the logic to Python to safely handle path normalization, dict trees, and OS slashes
python3 -c '
import os
import sys
import subprocess
from pathlib import Path

scan_path = sys.argv[1]

if not os.path.exists(scan_path):
    print(f"Error: Path \'{scan_path}\' does not exist.", file=sys.stderr)
    sys.exit(1)

# 1. Resolve absolute paths properly from CWD
target_abs = Path(scan_path).resolve()
try:
    repo_root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"]).decode().strip()).resolve()
except subprocess.CalledProcessError:
    sys.exit(1)

# 2. Calculate accurate git spec (using forward slashes)
try:
    git_spec = target_abs.relative_to(repo_root).as_posix()
    if git_spec == ".":
        git_spec = ""
except ValueError:
    print("Error: Scan path is outside the git repository.", file=sys.stderr)
    sys.exit(1)

# 3. Query git with the specific target to save memory
git_cmd = ["git", "-C", str(repo_root), "ls-files", "--cached", "--others", "--exclude-standard"]
if git_spec:
    git_cmd.extend(["--", git_spec])

git_output = subprocess.check_output(git_cmd).decode().splitlines()

# 4. Build Tree Map using a Dictionary for safety
items = {}
for file_path in git_output:
    if not file_path:
        continue
        
    # Calculate local path relative to target folder
    if git_spec and file_path.startswith(git_spec + "/"):
        local_path = file_path[len(git_spec) + 1:]
    elif git_spec and file_path == git_spec:
        local_path = file_path.split("/")[-1]
    else:
        local_path = file_path

    # Strict split removes any empty strings
    parts = [p for p in local_path.split("/") if p]
    if not parts:
        continue

    accumulated = ""
    for i, part in enumerate(parts):
        is_last = (i == len(parts) - 1)
        accumulated = accumulated + "/" + part if accumulated else part
        
        # Populate Dictionary Map
        if accumulated not in items:
            items[accumulated] = {
                "name": part,
                "depth": i,
                "is_dir": not is_last
            }
        elif not is_last:
            items[accumulated]["is_dir"] = True

# 5. Sort alphabetically and print safely
for local_path in sorted(items.keys()):
    item = items[local_path]
    indent = "|   " * item["depth"]
    trailing = "/" if item["is_dir"] else ""
    print(f"{indent}+-- {item['name']}{trailing}")

' "$SCAN_PATH"
