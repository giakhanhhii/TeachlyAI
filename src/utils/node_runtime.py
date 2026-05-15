from __future__ import annotations

import os
import shutil
from pathlib import Path


def iter_node_runtime_candidates(repo_root: Path) -> list[str]:
    env_candidates = [
        os.getenv("TEACHLY_NODE_BIN", "").strip(),
        os.getenv("NODE_BINARY", "").strip(),
    ]
    which_candidates = [
        shutil.which("node") or "",
        shutil.which("nodejs") or "",
    ]
    path_candidates = [
        str(Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "node" / "bin" / "node.exe"),
        str(repo_root / "node_modules" / ".bin" / "node"),
        str(repo_root / "node_modules" / ".bin" / "node.cmd"),
        "/usr/local/bin/node",
        "/usr/bin/node",
        "/usr/bin/nodejs",
    ]

    out: list[str] = []
    seen: set[str] = set()
    for candidate in [*env_candidates, *which_candidates, *path_candidates]:
        text = str(candidate or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def resolve_node_runtime(repo_root: Path) -> str | None:
    for candidate in iter_node_runtime_candidates(repo_root):
        candidate_path = Path(candidate)
        if candidate_path.is_file():
            return str(candidate_path)
        if os.path.sep not in candidate and (os.path.altsep is None or os.path.altsep not in candidate):
            return candidate
    return None
