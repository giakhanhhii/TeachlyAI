from __future__ import annotations

from pathlib import Path

import src.api_server as api_server


def test_resolve_node_runtime_prefers_path_lookup(monkeypatch):
    monkeypatch.setattr(api_server.shutil, "which", lambda name: "/usr/bin/nodejs" if name == "nodejs" else None)

    runtime = api_server._resolve_node_runtime()

    assert runtime == "/usr/bin/nodejs"


def test_resolve_node_runtime_uses_configured_env_path(monkeypatch, tmp_path: Path):
    node_path = tmp_path / "node.exe"
    node_path.write_text("", encoding="utf-8")
    monkeypatch.setenv("TEACHLY_NODE_BIN", str(node_path))
    monkeypatch.setenv("NODE_BINARY", "")
    monkeypatch.setattr(api_server.shutil, "which", lambda _name: None)

    runtime = api_server._resolve_node_runtime()

    assert runtime == str(node_path)


def test_resolve_node_runtime_returns_none_when_unavailable(monkeypatch):
    monkeypatch.setenv("TEACHLY_NODE_BIN", "")
    monkeypatch.setenv("NODE_BINARY", "")
    monkeypatch.setattr(api_server.shutil, "which", lambda _name: None)
    monkeypatch.setattr(api_server, "_iter_node_runtime_candidates", lambda: [])

    runtime = api_server._resolve_node_runtime()

    assert runtime is None
