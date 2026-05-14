from __future__ import annotations

from pathlib import Path

from src.utils.node_runtime import resolve_node_runtime
import src.utils.node_runtime as node_runtime


def test_resolve_node_runtime_prefers_path_lookup(monkeypatch, tmp_path: Path):
    nodejs_path = tmp_path / "nodejs"
    nodejs_path.write_text("", encoding="utf-8")
    monkeypatch.setattr(node_runtime.shutil, "which", lambda name: str(nodejs_path) if name == "nodejs" else None)

    runtime = resolve_node_runtime(Path("C:/repo"))

    assert runtime == str(nodejs_path)


def test_resolve_node_runtime_uses_configured_env_path(monkeypatch, tmp_path: Path):
    node_path = tmp_path / "node.exe"
    node_path.write_text("", encoding="utf-8")
    monkeypatch.setenv("TEACHLY_NODE_BIN", str(node_path))
    monkeypatch.setenv("NODE_BINARY", "")
    monkeypatch.setattr(node_runtime.shutil, "which", lambda _name: None)

    runtime = resolve_node_runtime(Path("C:/repo"))

    assert runtime == str(node_path)


def test_resolve_node_runtime_returns_none_when_unavailable(monkeypatch):
    monkeypatch.setenv("TEACHLY_NODE_BIN", "")
    monkeypatch.setenv("NODE_BINARY", "")
    monkeypatch.setattr(node_runtime.shutil, "which", lambda _name: None)
    monkeypatch.setattr(node_runtime, "iter_node_runtime_candidates", lambda _repo_root: [])

    runtime = resolve_node_runtime(Path("C:/repo"))

    assert runtime is None
