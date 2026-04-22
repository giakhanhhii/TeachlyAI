"""
One-shot: strip static slides from slide_html_template/*.html, add #slides-master-container + <template> layouts.
Run from repo root: python scripts/apply_slide_shell_bodies.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "frontend" / "slide_html_template"
LEGACY_DIR = ROOT / "slide_html_template"

LEGACY_NAME_MAP = {
    "4.space-bright.html": ("4.thptqg.html",),
}

BODY_1 = """<body>

<template id="layout-title">
<div class="slide-container theme-1 layout-diagonal">
    <div class="title-group">
        <h1 data-shell="title"></h1>
        <h2 data-shell="subtitle"></h2>
    </div>
</div>
</template>

<template id="layout-content">
<div class="slide-container theme-3 layout-angled">
    <div class="content-card">
        <h2 class="slide-title" data-shell="title"></h2>
        <div class="content-area">
            <ul class="styled-list" data-shell="bullets"></ul>
        </div>
    </div>
</div>
</template>

<template id="layout-two-column">
<div class="slide-container theme-4 layout-split">
    <div class="content-card">
        <h2 class="slide-title" data-shell="title"></h2>
        <div class="content-area">
            <div class="two-column">
                <div class="text-column"><ul data-shell="col-left" style="padding-left:20px;"></ul></div>
                <div class="text-column"><ul data-shell="col-right" style="padding-left:20px;"></ul></div>
            </div>
        </div>
    </div>
</div>
</template>

<div id="slides-master-container" data-nav-mode="scroll"></div>

</body>"""

BODY_3 = """<body>

<div id="presentation-area">

<template id="layout-title">
<div class="slide-container">
    <div class="title-layout">
        <h1 data-shell="title"></h1>
        <p class="subtitle" data-shell="subtitle"></p>
    </div>
</div>
</template>

<template id="layout-content">
<div class="slide-container">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="bullet-list"><ul data-shell="bullets"></ul></div>
    </div>
</div>
</template>

<template id="layout-two-column">
<div class="slide-container">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="two-column tiled">
            <div><ul data-shell="col-left"></ul></div>
            <div><ul data-shell="col-right"></ul></div>
        </div>
    </div>
</div>
</template>

<div id="slides-master-container" data-nav-mode="active"></div>

</div>

<div class="nav-hint">Dùng nút Tiếp theo / Quay lại trên Teachly để chuyển slide.</div>

</body>"""

# 4, 5.2 same shell structure as 1 (thptqg family)
BODY_4 = BODY_1
BODY_5_2 = BODY_1

BODY_6 = """<body>

<template id="layout-title">
<div class="slide-container">
    <div class="title-layout">
        <h1 data-shell="title"></h1>
        <p class="subtitle" data-shell="subtitle"></p>
    </div>
</div>
</template>

<template id="layout-content">
<div class="slide-container wave-bottom">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="bullet-list"><ul data-shell="bullets"></ul></div>
    </div>
</div>
</template>

<template id="layout-two-column">
<div class="slide-container wave-bottom">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="two-column">
            <div class="bullet-list"><ul data-shell="col-left"></ul></div>
            <div class="bullet-list"><ul data-shell="col-right"></ul></div>
        </div>
    </div>
</div>
</template>

<div id="slides-master-container" data-nav-mode="scroll"></div>

</body>"""

BODY_7 = """<body>

<template id="layout-title">
<div class="slide-container">
    <div class="card title-card">
        <div class="title-content">
            <h1 data-shell="title"></h1>
            <p data-shell="subtitle"></p>
        </div>
    </div>
</div>
</template>

<template id="layout-content">
<div class="slide-container" style="padding-top:100px;">
    <h2 class="outer-title" data-shell="title"></h2>
    <div class="card">
        <ul data-shell="bullets" style="margin:24px 48px;font-size:24px;line-height:1.7;"></ul>
    </div>
</div>
</template>

<template id="layout-two-column">
<div class="slide-container" style="padding-top:80px;">
    <h2 class="outer-title" data-shell="title"></h2>
    <div class="card" style="display:flex;gap:32px;">
        <ul data-shell="col-left" style="flex:1;margin:16px 24px;font-size:22px;"></ul>
        <ul data-shell="col-right" style="flex:1;margin:16px 24px;font-size:22px;"></ul>
    </div>
</div>
</template>

<div id="slides-master-container" data-nav-mode="scroll"></div>

</body>"""

BODY_8 = """<body>

<template id="layout-title">
<div class="slide-container">
    <div class="comic-panel" style="text-align:center;padding:80px;max-width:900px;">
        <h1 class="comic-title" data-shell="title"></h1>
    </div>
</div>
</template>

<template id="layout-content">
<div class="slide-container">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="comic-panel">
            <ul class="comic-list" data-shell="bullets"></ul>
        </div>
    </div>
</div>
</template>

<template id="layout-two-column">
<div class="slide-container">
    <h2 class="slide-title" data-shell="title"></h2>
    <div class="content-area">
        <div class="two-column">
            <div class="comic-panel"><ul class="comic-list" data-shell="col-left"></ul></div>
            <div class="comic-panel"><ul class="comic-list" data-shell="col-right"></ul></div>
        </div>
    </div>
</div>
</template>

<div id="slides-master-container" data-nav-mode="scroll"></div>

</body>"""

FILE_2_FULL = r"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ôn thi TN THPT — Tiếng Anh</title>
    <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #eee; }
  #slides-master-container { max-width: 1100px; margin: 0 auto; padding: 24px 0 80px; }
  .slide { width: 100%; padding: 60px 80px; }
  .slide-blue { background: #1a3bbf; color: white; }
  .slide-white { background: #fff; color: #111; }
  .slide-light { background: #f5f7ff; color: #111; }
  h1.main-title { font-size: 52px; font-weight: 900; color: white; line-height: 1.1; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 18px; }
  .subtitle-bar { display: flex; align-items: center; gap: 10px; margin-top: 10px; color: #cdd5ff; font-size: 15px; }
  .subtitle-bar span.tag { background: #111; color: #fff; padding: 4px 12px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; }
  .section-title { font-size: 28px; font-weight: 900; color: #d62c2c; text-transform: uppercase; margin-bottom: 28px; letter-spacing: 0.5px; }
  .divider { border: none; border-top: 1px solid #eee; margin: 0; }
  ul[data-shell="bullets"] { padding-left: 20px; font-size: 15px; color: #444; line-height: 1.7; }
  ul[data-shell="bullets"] li { margin-bottom: 8px; }
</style>
</head>
<body>

<template id="layout-title">
<div class="slide slide-blue" style="min-height:200px;display:flex;flex-direction:column;justify-content:center;">
  <h1 class="main-title" data-shell="title"></h1>
  <div class="subtitle-bar"><span data-shell="subtitle"></span><span class="tag" data-shell="tag"></span></div>
</div>
<hr class="divider">
</template>

<template id="layout-content">
<div class="slide slide-white">
  <div class="section-title" data-shell="title"></div>
  <ul data-shell="bullets"></ul>
</div>
<hr class="divider">
</template>

<template id="layout-two-column">
<div class="slide slide-light">
  <div class="section-title" data-shell="title"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
    <ul data-shell="col-left" style="padding-left:18px;font-size:14px;color:#444;"></ul>
    <ul data-shell="col-right" style="padding-left:18px;font-size:14px;color:#444;"></ul>
  </div>
</div>
<hr class="divider">
</template>

<div id="slides-master-container" data-nav-mode="scroll"></div>

</body>
</html>
"""

BODY_BY_FILE = {
    "1.thptqg.html": BODY_1,
    "3.thptqg.html": BODY_3,
    "4.space-bright.html": BODY_4,
    "5.2-color-slide.html": BODY_5_2,
    "6.space-black.html": BODY_6,
    "7.sealife.html": BODY_7,
    "8.comic.html": BODY_8,
}


def patch_title_year(html: str) -> str:
    """Loosen hardcoded exam year in <title> (shell year applied in app)."""
    return re.sub(
        r"(<title>[^<]*?)20\d{2}([^<]*</title>)",
        r"\1\2",
        html,
        count=1,
        flags=re.IGNORECASE,
    )


def replace_body(html: str, new_body: str) -> str:
    return re.sub(r"(?is)<body[^>]*>.*?</body>", new_body.strip(), html, count=1)


def resolve_template_path(name: str) -> Path:
    candidates: list[Path] = [DIR / name]
    for legacy_name in LEGACY_NAME_MAP.get(name, ()):
        candidates.append(DIR / legacy_name)
    candidates.append(LEGACY_DIR / name)
    for legacy_name in LEGACY_NAME_MAP.get(name, ()):
        candidates.append(LEGACY_DIR / legacy_name)
    for path in candidates:
        if path.is_file():
            return path
    checked = "\n - ".join(str(path) for path in candidates)
    raise FileNotFoundError(f"Missing template '{name}'. Checked:\n - {checked}")


def main() -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    for name, body in BODY_BY_FILE.items():
        path = resolve_template_path(name)
        raw = path.read_text(encoding="utf-8")
        out = patch_title_year(replace_body(raw, body))
        target_path = DIR / name
        target_path.write_text(out, encoding="utf-8")
        print("patched", name)

    p2 = DIR / "2.on_thi_tn_thpt_2026.html"
    p2.write_text(FILE_2_FULL.strip() + "\n", encoding="utf-8")
    print("patched", p2.name)

if __name__ == "__main__":
    main()
