"""Fail if anything that looks like a live API key is about to be committed.

The repo is public and `PROMPTS.md` quotes prompts verbatim, which is exactly
where keys get pasted. This runs over git-tracked files only -- .env is ignored
and must stay that way.

    python scripts/check_secrets.py          # scan tracked files
    python scripts/check_secrets.py --staged # scan what is staged (pre-commit)
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys

# Prefix + length patterns for the providers this project touches, plus the
# generic shapes. Deliberately narrow: a scanner that cries wolf gets disabled.
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Groq", re.compile(r"gsk_[A-Za-z0-9]{40,}")),
    ("NVIDIA NIM", re.compile(r"nvapi-[A-Za-z0-9_\-]{50,}")),
    ("OpenAI", re.compile(r"sk-(?:proj-)?[A-Za-z0-9_\-]{30,}")),
    ("Anthropic", re.compile(r"sk-ant-[A-Za-z0-9_\-]{30,}")),
    ("Hugging Face", re.compile(r"hf_[A-Za-z0-9]{30,}")),
    ("AWS access key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("Google API key", re.compile(r"AIza[0-9A-Za-z_\-]{35}")),
]

# Placeholders that must not trip the scanner, or .env.example becomes unusable.
ALLOW = re.compile(r"(<[^>]+>|your[_-]?key|xxx+|\.\.\.|example|placeholder)", re.I)

SKIP_SUFFIXES = (".lock", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf")


def files(staged: bool) -> list[str]:
    cmd = ["git", "diff", "--cached", "--name-only"] if staged else ["git", "ls-files"]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    return [f for f in out.splitlines() if f and not f.endswith(SKIP_SUFFIXES)]


def scan(paths: list[str]) -> list[tuple[str, int, str, str]]:
    hits = []
    for path in paths:
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                for lineno, line in enumerate(fh, 1):
                    if ALLOW.search(line):
                        continue
                    for provider, pattern in PATTERNS:
                        found = pattern.search(line)
                        if found:
                            hits.append((path, lineno, provider, found.group(0)[:12] + "..."))

        except (FileNotFoundError, IsADirectoryError, PermissionError):
            continue
    return hits


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--staged", action="store_true", help="scan staged changes only")
    args = ap.parse_args()

    paths = files(args.staged)
    hits = scan(paths)
    if not hits:
        print(f"[ok] no API keys found in {len(paths)} files")
        return 0

    print(f"[FAIL] {len(hits)} possible API key(s) found:\n")
    for path, lineno, provider, snippet in hits:
        print(f"  {path}:{lineno}  {provider}  {snippet}")
    print("\nRemove them, then rotate the key -- assume anything committed is burned.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
