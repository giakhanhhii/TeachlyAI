#!/usr/bin/env python3
"""
Shared AI hook logger — works with Claude Code, Gemini CLI, Codex, Cursor, Copilot.
Reads JSON from stdin, normalizes to common format, appends to .ai-log/session.jsonl
"""
import json
import os
import sys
import subprocess
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path

VN_TZ = timezone(timedelta(hours=7))


def git(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""


def get_event_name(data: dict) -> str:
    return data.get("hook_event_name") or data.get("hookEventName") or data.get("event", "")


def read_json_payload() -> dict | None:
    """
    Hook stdin on Windows can contain BOM/UTF-16 text.
    Decode defensively so valid payloads are not dropped.
    """
    raw_bytes = sys.stdin.buffer.read()
    if not raw_bytes or not raw_bytes.strip():
        return None

    for encoding in ("utf-8-sig", "utf-8", "utf-16", "utf-16-le", "utf-16-be"):
        try:
            decoded = raw_bytes.decode(encoding).strip()
            if not decoded:
                return None
            payload = json.loads(decoded)
            return payload if isinstance(payload, dict) else None
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue

    return None


def normalize_text(value: object, max_len: int = 1000) -> str:
    """
    Keep Unicode text stable in logs and repair common mojibake forms.
    """
    if value is None:
        return ""

    text = str(value)

    # Common Windows mojibake pattern (UTF-8 interpreted as Latin-1/CP1252).
    if any(token in text for token in ("Ã", "Â", "Ä", "Å", "Æ", "Ç", "Ð", "Ñ")):
        for src in ("latin-1", "cp1252"):
            try:
                fixed = text.encode(src).decode("utf-8")
                if fixed:
                    text = fixed
                    break
            except UnicodeError:
                continue

    text = unicodedata.normalize("NFC", text)
    return text[:max_len]


def detect_tool(data: dict) -> str:
    """Detect which AI tool sent this hook event."""
    tool_env = os.environ.get("AI_TOOL_NAME", "").lower()
    if tool_env:
        return tool_env
    # Cursor includes cursor_version on all hook payloads (see Cursor hooks docs).
    if data.get("cursor_version"):
        return "cursor"
    # Heuristics
    if data.get("transcript_path"):
        return "codex"
    event = get_event_name(data)
    if event.startswith(("Before", "After", "Session", "Pre", "Notification")):
        return "gemini"
    if event[0:1].islower():
        # camelCase event names → Cursor or Copilot
        if "workspace_roots" in data:
            return "cursor"
        if "toolName" in data:
            return "copilot"
    if "hook_event_name" in data:
        return "claude"
    return "unknown"


def normalize(data: dict, tool: str) -> dict | None:
    """Normalize tool-specific payload to common log entry."""
    event = get_event_name(data)
    ts = datetime.now(VN_TZ).isoformat()

    base = {
        "ts": ts,
        "tool": tool,
        "event": event,
        "session_id": (
            data.get("session_id") or
            data.get("conversation_id") or
            data.get("generation_id") or ""
        ),
        "model": data.get("model", ""),
        "repo": git("git remote get-url origin").split("/")[-1].replace(".git", ""),
        "branch": git("git rev-parse --abbrev-ref HEAD"),
        "commit": git("git rev-parse --short HEAD"),
        "student": git("git config user.email"),
    }

    if tool == "claude":
        prompt = ""
        # UserPromptSubmit: prompt is at top level
        if event == "UserPromptSubmit":
            prompt = normalize_text(data.get("prompt", ""), 1000)
        # PostToolUse: extract from tool_input
        elif isinstance(data.get("tool_input"), dict):
            prompt = normalize_text(data["tool_input"].get("prompt") or data["tool_input"].get("content") or "", 1000)
        base.update({
            "prompt": prompt,
            "tool_name": data.get("tool_name", ""),
            "tool_input": data.get("tool_input") if event != "UserPromptSubmit" else None,
            "tool_response": normalize_text(data.get("tool_response", ""), 500),
        })

    elif tool == "gemini":
        if event == "BeforeAgent":
            prompt = normalize_text(data.get("prompt", ""), 1000)
            base.update({"prompt": prompt})
        else:
            req = data.get("request", {})
            contents = req.get("contents", [])
            prompt = ""
            for c in reversed(contents):
                for part in c.get("parts", []):
                    if part.get("text"):
                        prompt = normalize_text(part["text"], 1000)
                        break
                if prompt:
                    break
            resp = data.get("response", {})
            answer = ""
            try:
                answer = normalize_text(resp["candidates"][0]["content"]["parts"][0]["text"], 500)
            except Exception:
                pass
            base.update({"prompt": prompt, "response_summary": answer})

    elif tool == "codex":
        base.update({
            "prompt": normalize_text(data.get("prompt", ""), 1000),
            "turn_id": data.get("turn_id", ""),
            "transcript_path": data.get("transcript_path", ""),
        })

    elif tool == "cursor":
        prompt = (
            data.get("prompt")
            or data.get("user_prompt")
            or (data.get("arguments") or {}).get("prompt")
            or ""
        )
        base.update({
            "prompt": normalize_text(prompt, 1000),
            "files_context": data.get("attachments", []),
        })

    elif tool == "copilot":
        base.update({
            "prompt": normalize_text(data.get("prompt", ""), 1000),
            "tool_name": data.get("toolName", ""),
            "tool_args": data.get("toolArgs"),
        })

    # Skip empty/noise events
    if not base.get("prompt") and event not in ("Stop", "stop", "SessionEnd", "sessionEnd", "AfterModel"):
        return None

    return base


def main():
    data = read_json_payload()
    if not data:
        sys.exit(0)

    tool = detect_tool(data)
    entry = normalize(data, tool)
    if not entry:
        sys.exit(0)

    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "session.jsonl"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # stdout JSON must match each host's hook contract
    event_lc = get_event_name(data).lower()
    if tool == "cursor":
        if event_lc == "beforesubmitprompt":
            print(json.dumps({"continue": True}))
        elif event_lc == "stop":
            print(json.dumps({}))
        else:
            print(json.dumps({}))
    else:
        print(json.dumps({"status": "logged"}))


if __name__ == "__main__":
    main()
