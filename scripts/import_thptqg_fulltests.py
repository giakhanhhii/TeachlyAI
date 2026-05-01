from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


QUESTION_RE = re.compile(r"(?im)(?:^|\n)\s*Question\s+(\d{1,2})\s*[\.:]?\s*")
OPTION_RE = re.compile(r"(?m)(?:^|\n|\s)\s*[-*]?\s*([ABCD])\.\s*")
ANSWER_PAIR_RE = re.compile(r"\b([1-9]|[1-3]\d|40)[\.-]([A-D])\b")

QUESTION_HEADER = "Họ, tên thí sinh"
EXPLANATION_MARKERS = (
    "Giải thích:",
    "Giải thích",
    "Thông tin:",
    "Tạm dịch:",
    "Tạm dịch",
    "Kiến thức",
    "=>",
    "→",
)
CONTEXT_STARTERS = (
    "Read the following",
    "Mark the letter",
    "A small, stylized illustration",
    "TaiLieuOnThi",
    "TailieuOnThi",
)
NOISY_LINE_PATTERNS = (
    re.compile(r"^\s*Họ,\s*tên thí sinh.*$", re.I),
    re.compile(r"^\s*Số báo danh.*$", re.I),
    re.compile(r"^\s*Mã đề.*$", re.I),
    re.compile(r"^\s*TaiLieuOnThi\s*$", re.I),
    re.compile(r"^\s*TailieuOnThi\s*$", re.I),
    re.compile(r"^\s*Tài liệu free tại.*$", re.I),
    re.compile(r"^\s*A small, stylized illustration.*$", re.I),
    re.compile(r"^\s*-+\s*$"),
)


@dataclass
class QuestionParse:
    number: int
    prompt: str
    options: list[str]
    trailing_context: str


@dataclass
class ParsedTest:
    pair_index: int
    source_ref: str
    questions: list[dict]
    parts: list[dict]


def ascii_fold(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


def slurp(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def normalize_block(raw: str) -> str:
    text = raw.replace("\r", "\n")
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</?(table|tbody|thead|tr|td|p|div|ul|ol|li|strong|em|span|h\d)[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("\\_", "_")
    text = text.replace("**", "")
    text = text.replace("__", "")
    text = text.replace("---", "\n")
    for starter in CONTEXT_STARTERS + ("Question ",):
        text = text.replace(starter, f"\n{starter}")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def clean_lines(text: str) -> str:
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue
        if any(pattern.match(line) for pattern in NOISY_LINE_PATTERNS):
            continue
        lines.append(line)
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def meaningful(text: str) -> bool:
    folded = ascii_fold(text)
    if not folded:
        return False
    folded = re.sub(r"[^a-z0-9]+", "", folded)
    return len(folded) >= 8


def find_test_blocks(source_text: str) -> list[int]:
    starts: list[int] = []
    offset = 0
    while True:
        idx = source_text.find(QUESTION_HEADER, offset)
        if idx < 0:
            break
        starts.append(idx)
        offset = idx + 1
    return starts


def block_kind(raw: str) -> str:
    head = ascii_fold(raw[:1200])
    if any(keyword in head for keyword in ("dap an", "huong dan giai", "loi giai")):
        return "solution"
    return "question"


def group_adjacent_pairs(full_text: str) -> tuple[list[tuple[int, int]], list[int]]:
    starts = find_test_blocks(full_text)
    blocks = [(idx, block_kind(full_text[idx: idx + 1400])) for idx in starts]
    adjacent_pairs: list[tuple[int, int]] = []
    used_solution_starts: set[int] = set()
    for i in range(len(blocks) - 1):
        current_idx, current_kind = blocks[i]
        next_idx, next_kind = blocks[i + 1]
        if current_kind == "question" and next_kind == "solution":
            adjacent_pairs.append((current_idx, next_idx))
            used_solution_starts.add(next_idx)
    solution_only = [idx for idx, kind in blocks if kind == "solution" and idx not in used_solution_starts]
    return adjacent_pairs, solution_only


def split_explanation(body: str) -> tuple[str, str]:
    cut = len(body)
    for marker in EXPLANATION_MARKERS:
        idx = body.find(marker)
        if idx >= 0:
            cut = min(cut, idx)
    return body[:cut].strip(), body[cut:].strip()


def split_last_option_and_tail(text: str) -> tuple[str, str]:
    cut = len(text)
    for starter in CONTEXT_STARTERS:
        idx = text.find(starter)
        if idx > 0:
            cut = min(cut, idx)
    option_text = text[:cut].strip()
    tail = text[cut:].strip()
    return option_text, tail


def normalize_prompt(prefix: str, number: int) -> str:
    prompt = prefix.strip()
    if not prompt:
        prompt = f"Question {number}."
    if not prompt.lower().startswith("question"):
        prompt = f"Question {number}. {prompt}"
    return re.sub(r"\s+", " ", prompt).strip()


def find_question_runs(matches: list[re.Match[str]]) -> list[list[re.Match[str]]]:
    runs: list[list[re.Match[str]]] = []
    for start_index, match in enumerate(matches):
        if int(match.group(1)) != 1:
            continue
        run = [match]
        expected = 2
        for next_match in matches[start_index + 1:]:
            number = int(next_match.group(1))
            if number == expected:
                run.append(next_match)
                expected += 1
                if expected == 41:
                    runs.append(run)
                    break
            elif number == 1:
                break
        if len(run) == 40:
            continue
    return runs


def parse_question_sequence(raw_block: str) -> tuple[list[QuestionParse], str]:
    block = clean_lines(normalize_block(raw_block))
    matches = list(QUESTION_RE.finditer(block))
    runs = find_question_runs(matches)
    if not runs:
        raise ValueError("Không tìm thấy chuỗi 40 câu liên tục.")
    picked = runs[0]

    prefix_before_first = block[: picked[0].start()].strip()
    parsed: list[QuestionParse] = []
    for idx, match in enumerate(picked):
        question_no = int(match.group(1))
        next_start = picked[idx + 1].start() if idx + 1 < len(picked) else len(block)
        segment = block[match.end(): next_start].strip()
        question_body, _ = split_explanation(segment)
        option_matches = list(OPTION_RE.finditer(question_body))
        if len(option_matches) < 4:
            raise ValueError(f"Câu {question_no} không đủ 4 lựa chọn.")

        ordered = option_matches[:4]
        letters = [m.group(1) for m in ordered]
        if letters != ["A", "B", "C", "D"]:
            raise ValueError(f"Câu {question_no} có thứ tự lựa chọn không chuẩn: {letters}.")

        prompt_prefix = question_body[: ordered[0].start()].strip()
        options: list[str] = []
        trailing_context = ""
        for option_idx, option_match in enumerate(ordered):
            next_option_start = ordered[option_idx + 1].start() if option_idx + 1 < len(ordered) else len(question_body)
            raw_option_text = question_body[option_match.end(): next_option_start].strip()
            if option_idx == 3:
                raw_option_text, trailing_context = split_last_option_and_tail(raw_option_text)
            option_text = re.sub(r"\s+", " ", raw_option_text).strip(" -")
            if not option_text:
                raise ValueError(f"Câu {question_no} có lựa chọn trống.")
            options.append(option_text)

        parsed.append(
            QuestionParse(
                number=question_no,
                prompt=normalize_prompt(prompt_prefix, question_no),
                options=options,
                trailing_context=clean_lines(trailing_context),
            )
        )
    return parsed, clean_lines(prefix_before_first)


def parse_answer_table(raw_solution_block: str) -> dict[int, str]:
    first_question = QUESTION_RE.search(normalize_block(raw_solution_block))
    head = raw_solution_block[: first_question.start()] if first_question else raw_solution_block[:4000]
    pairs = ANSWER_PAIR_RE.findall(head)
    answer_map: dict[int, str] = {}
    for number_text, letter in pairs:
        number = int(number_text)
        answer_map.setdefault(number, letter)
    if sorted(answer_map) == list(range(1, 41)):
        return answer_map
    return {}


def parse_answer_phrases(raw_solution_block: str) -> dict[int, str]:
    block = clean_lines(normalize_block(raw_solution_block))
    matches = list(QUESTION_RE.finditer(block))
    runs = find_question_runs(matches)
    if not runs:
        return {}
    picked = runs[-1]

    answer_map: dict[int, str] = {}
    patterns = (
        re.compile(r"chon dap an\s*([abcd])\b"),
        re.compile(r"\b([abcd])\s+la dap an\b"),
        re.compile(r"dap an\s*[: ]\s*([abcd])\b"),
    )
    for idx, match in enumerate(picked):
        question_no = int(match.group(1))
        next_start = picked[idx + 1].start() if idx + 1 < len(picked) else len(block)
        segment = ascii_fold(block[match.end(): next_start])
        answer_letter = None
        for pattern in patterns:
            found = pattern.search(segment)
            if found:
                answer_letter = found.group(1).upper()
                break
        if answer_letter is None:
            return {}
        answer_map[question_no] = answer_letter
    return answer_map


def infer_group_meta(prefix_text: str, start_question: int, fallback_title: str) -> tuple[str, str, list[str]]:
    cleaned = clean_lines(prefix_text)
    if not cleaned:
        return fallback_title, "", []

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", cleaned) if p.strip()]
    paragraphs = [p for p in paragraphs if "adapted from" not in ascii_fold(p)]
    if not paragraphs:
        return fallback_title, "", []

    title = ""
    instruction = ""
    context: list[str] = []

    def looks_like_title(line: str) -> bool:
        line = line.strip()
        if not line or len(line) > 140:
            return False
        return line.isupper() or sum(ch.isupper() for ch in line) >= max(4, len(line) // 2)

    if paragraphs and ascii_fold(paragraphs[0]).startswith(("read the following", "mark the letter", "read the passage", "read the text")):
        instruction = paragraphs.pop(0)

    if paragraphs and looks_like_title(paragraphs[0]):
        title = paragraphs.pop(0)

    if not title and paragraphs and ascii_fold(paragraphs[0]).startswith(("read the following", "mark the letter")):
        instruction = paragraphs.pop(0)

    if not title:
        title = fallback_title or f"Question set {start_question}"

    context = paragraphs
    return title, instruction, context


def build_groups(question_block: str, parsed_questions: list[QuestionParse]) -> list[dict]:
    _, prefix_before_first = parse_question_sequence(question_block)
    groups: list[dict] = []
    current_group: dict | None = None
    pending_prefix = prefix_before_first

    for item in parsed_questions:
        start_new_group = meaningful(pending_prefix) or current_group is None
        if start_new_group:
            title, instruction, context = infer_group_meta(
                pending_prefix,
                item.number,
                fallback_title=f"Câu {item.number}",
            )
            current_group = {
                "id": f"group-{len(groups) + 1}",
                "title": title,
                "instruction": instruction,
                "context": context,
                "questionNumbers": [],
            }
            groups.append(current_group)
        current_group["questionNumbers"].append(item.number)
        pending_prefix = item.trailing_context

    return groups


def split_groups_by_part(groups: list[dict], start_question: int, end_question: int, part_index: int) -> list[dict]:
    scoped: list[dict] = []
    for group_idx, group in enumerate(groups, start=1):
        numbers = [n for n in group["questionNumbers"] if start_question <= int(n) <= end_question]
        if not numbers:
            continue
        scoped.append(
            {
                "id": f"part-{part_index}-group-{group_idx}",
                "title": group["title"],
                "instruction": group["instruction"],
                "context": group["context"],
                "questionNumbers": numbers,
            }
        )
    return scoped


def create_parts(groups: list[dict]) -> list[dict]:
    parts: list[dict] = []
    ranges = [(1, 10), (11, 20), (21, 30), (31, 40)]
    for part_index, (start_question, end_question) in enumerate(ranges, start=1):
        parts.append(
            {
                "id": f"part-{part_index}",
                "label": f"Part {part_index}",
                "title": f"Câu {start_question}-{end_question}",
                "questionStart": start_question,
                "questionEnd": end_question,
                "groups": split_groups_by_part(groups, start_question, end_question, part_index),
            }
        )
    return parts


def build_questions(parsed_questions: list[QuestionParse], answer_map: dict[int, str], source_ref: str) -> list[dict]:
    questions: list[dict] = []
    for item in parsed_questions:
        letter = answer_map.get(item.number)
        if letter not in {"A", "B", "C", "D"}:
            raise ValueError(f"Câu {item.number} thiếu đáp án hợp lệ.")
        correct_index = "ABCD".index(letter)
        part_index = ((item.number - 1) // 10) + 1
        questions.append(
            {
                "id": f"q{item.number}",
                "number": item.number,
                "partId": f"part-{part_index}",
                "prompt": item.prompt,
                "options": item.options,
                "correctIndex": correct_index,
                "explanation": "Đáp án được đối chiếu trực tiếp từ lời giải gốc trong bộ 66 đề.",
                "explanationEvidence": f"Answer key nguồn gốc: {source_ref} -> {item.number}.{letter}",
            }
        )
    return questions


def validate_questions(questions: list[dict]) -> None:
    numbers = [int(item["number"]) for item in questions]
    if numbers != list(range(1, 41)):
        raise ValueError("Bộ câu hỏi không chạy liên tục từ 1 đến 40.")
    for item in questions:
        options = item.get("options") or []
        if len(options) != 4:
            raise ValueError(f"Câu {item['number']} không có đúng 4 đáp án.")
        if any(not str(option).strip() for option in options):
            raise ValueError(f"Câu {item['number']} có đáp án rỗng.")
        correct_index = int(item["correctIndex"])
        if correct_index < 0 or correct_index > 3:
            raise ValueError(f"Câu {item['number']} có correctIndex ngoài phạm vi.")


def parse_candidate(question_block: str, solution_block: str, pair_index: int, source_name: str) -> ParsedTest:
    parsed_questions, _ = parse_question_sequence(question_block)
    answer_map = parse_answer_table(solution_block) or parse_answer_phrases(solution_block)
    if sorted(answer_map) != list(range(1, 41)):
        raise ValueError("Không trích được đủ 40 đáp án chính xác từ block lời giải.")

    groups = build_groups(question_block, parsed_questions)
    parts = create_parts(groups)
    source_ref = f"{source_name}#pair-{pair_index}"
    questions = build_questions(parsed_questions, answer_map, source_ref)
    validate_questions(questions)
    return ParsedTest(
        pair_index=pair_index,
        source_ref=source_ref,
        questions=questions,
        parts=parts,
    )


def load_existing_bundle(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def generate_embedded_module(bundle: dict) -> str:
    raw = json.dumps(bundle, ensure_ascii=False, indent=2)
    return (
        "export const EMBEDDED_THPTQG_FULLTEST = JSON.parse(String.raw`"
        + raw
        + "`);\n"
    )


def import_fulltests(
    source_path: Path,
    current_bundle_path: Path,
    embedded_out_path: Path,
    report_path: Path,
    limit: int,
    keep_existing: int,
) -> dict:
    source_text = slurp(source_path)
    adjacent_pairs, solution_only_starts = group_adjacent_pairs(source_text)
    report: dict = {
        "source": str(source_path),
        "adjacent_pair_candidates": len(adjacent_pairs),
        "standalone_solution_candidates": len(solution_only_starts),
        "imported": [],
        "skipped": [],
    }

    bundle = load_existing_bundle(current_bundle_path)
    base_tests = list(bundle.get("tests") or [])[:keep_existing]
    imported_tests: list[dict] = []
    seen_pair_indexes: set[int] = set()

    candidate_index = 0
    for question_start, solution_start in adjacent_pairs:
        candidate_index += 1
        if candidate_index == 1:
            report["skipped"].append(
                {
                    "candidate": candidate_index,
                    "reason": "Giữ nguyên đề seed hiện tại, không import đè test 1.",
                    "source_ref": f"{source_path.name}#pair-{candidate_index}",
                }
            )
            continue
        next_question_after_solution = next((q for q, _ in adjacent_pairs if q > solution_start), None)
        question_block_end = solution_start
        solution_block_end = next_question_after_solution or len(source_text)
        question_block = source_text[question_start:question_block_end]
        solution_block = source_text[solution_start:solution_block_end]
        try:
            parsed = parse_candidate(question_block, solution_block, candidate_index, source_path.name)
        except Exception as exc:
            report["skipped"].append(
                {
                    "candidate": candidate_index,
                    "reason": str(exc),
                    "source_ref": f"{source_path.name}#pair-{candidate_index}",
                }
            )
            continue
        imported_tests.append(
            {
                "sourceCandidateIndex": candidate_index,
                "parts": parsed.parts,
                "questions": parsed.questions,
            }
        )
        seen_pair_indexes.add(candidate_index)
        report["imported"].append(
            {
                "candidate": candidate_index,
                "questionCount": len(parsed.questions),
                "sourceRef": parsed.source_ref,
            }
        )
        if len(imported_tests) >= limit:
            break

    if len(imported_tests) < limit:
        raise RuntimeError(
            f"Chỉ import được {len(imported_tests)}/{limit} đề từ {source_path.name}. Xem report để biết đề nào bị loại."
        )

    final_tests = list(base_tests)
    for import_idx, imported in enumerate(imported_tests, start=len(base_tests) + 1):
        final_tests.append(
            {
                "id": f"thptqg-simulation-test-{import_idx}",
                "title": f"THPTQG simulation test {import_idx}",
                "durationMinutes": 60,
                "questionCount": 40,
                "status": "available",
                "yearLabel": f"Mock {import_idx:02d}",
                "source": f"{source_path.name}#pair-{imported['sourceCandidateIndex']}",
                "parts": imported["parts"],
                "questions": imported["questions"],
            }
        )

    bundle["tests"] = final_tests
    bundle["_replace_note"] = (
        f"THPTQG full-test bundle. Seed giữ từ mockdata_40.md; thêm {limit} đề import tự động từ {source_path.name}."
    )
    current_bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    embedded_out_path.write_text(generate_embedded_module(bundle), encoding="utf-8")

    report["final_available_tests"] = len(final_tests)
    report["written_json"] = str(current_bundle_path)
    report["written_embedded"] = str(embedded_out_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def validate_sample(sample_path: Path) -> None:
    block = clean_lines(normalize_block(slurp(sample_path)))
    numbers = [int(match.group(1)) for match in QUESTION_RE.finditer(block)]
    unique = sorted(set(number for number in numbers if 1 <= number <= 40))
    if unique != list(range(1, 41)):
        raise ValueError(f"Sample {sample_path} không có đủ heading Question 1-40 theo form chuẩn.")


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import batch full THPTQG tests from a shared markdown form.")
    parser.add_argument("--source", required=True, help="Path tới 66_Full.md.")
    parser.add_argument("--seed", required=True, help="Path tới mockdata_40.md để xác nhận seed gốc tồn tại.")
    parser.add_argument("--sample", required=True, help="Path tới example5.md để validate parser form.")
    parser.add_argument("--limit", type=int, default=20, help="Số đề mới cần import.")
    parser.add_argument("--keep-existing", type=int, default=1, help="Giữ lại bao nhiêu đề đang có ở đầu bundle.")
    parser.add_argument("--out", required=True, help="Path output JSON source of truth.")
    parser.add_argument("--embedded-out", required=True, help="Path output embedded JS fallback.")
    parser.add_argument("--report", required=True, help="Path output report JSON.")
    return parser.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    source_path = Path(args.source)
    seed_path = Path(args.seed)
    sample_path = Path(args.sample)
    out_path = Path(args.out)
    embedded_out_path = Path(args.embedded_out)
    report_path = Path(args.report)

    for path in (source_path, seed_path, sample_path, out_path):
        if not path.exists():
            raise FileNotFoundError(f"Không tìm thấy file bắt buộc: {path}")

    validate_sample(sample_path)
    report = import_fulltests(
        source_path=source_path,
        current_bundle_path=out_path,
        embedded_out_path=embedded_out_path,
        report_path=report_path,
        limit=max(1, int(args.limit)),
        keep_existing=max(0, int(args.keep_existing)),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
