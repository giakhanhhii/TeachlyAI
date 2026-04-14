import argparse
import os
import sys
from pathlib import Path


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ai-multimedia-lecture-agent",
        description="Generate PPTX slides (and a mock video pipeline) from a prompt/document.",
    )
    p.add_argument("--prompt", "-p", help="User request / lecture topic (interactive if omitted).")
    p.add_argument("--input", "-i", help="Path to a text/markdown document to lecture-ify.")
    p.add_argument(
        "--output",
        "-o",
        choices=["slide", "video", "both"],
        default="slide",
        help="Which artifacts to generate.",
    )
    p.add_argument("--pptx", help="Optional PPTX filename (e.g. lecture.pptx).")
    p.add_argument("--max-chunks", type=int, default=10, help="Max chunks for agentic chunking.")
    p.add_argument("--slides", type=int, default=8, help="Target number of slides for the orchestrator.")
    return p


def main(argv: list[str] | None = None) -> int:
    # Make `src` importable when running as a script.
    repo_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(repo_root))

    from src.agent import LectureAgent  # noqa: E402

    args = build_parser().parse_args(argv)

    prompt = (args.prompt or "").strip()
    if not prompt:
        prompt = input("Nhập prompt/chủ đề bài giảng: ").strip()
    if not prompt:
        print("Missing --prompt")
        return 2

    document_text = None
    if args.input:
        in_path = Path(args.input).expanduser()
        if not in_path.exists():
            print(f"Input file not found: {in_path}")
            return 2
        document_text = _read_text_file(in_path)

    agent = LectureAgent()
    result = agent.run(
        prompt,
        document_text=document_text,
        output_type=args.output,
        pptx_filename=args.pptx,
        max_chunks=args.max_chunks,
        target_slides=args.slides,
    )

    print("\nKết quả:")
    for k, v in result.items():
        print(f"- {k}: {v}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

