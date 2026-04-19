# Checklist — flash EN→VI: **min 2 glosses**, **max 3 glosses** (per item)

*(Here “gloss” means a **Vietnamese sense** on the card back, comma-separated.)*

## What was implemented

### `src/flash_translate_service.py`

- **Batch prompt:** each string in JSON `g` must contain **exactly 2 or 3** Vietnamese glosses, `comma+space`; if only one dictionary sense exists, add a **close synonym / near-sense** as the second gloss; **never** return a single gloss with no comma.
- **Batch `max_tokens`:** raised (`32 + n*32`, cap `1600`) so output can fit up to 3 glosses × many lines.
- **`_clamp_vietnamese_glosses`:** split on `, ; / |`, **dedupe** (case-insensitive), keep **at most 3** segments.
- **`_gloss_segment_count`:** count glosses after split (regex `[,;]+`) to detect fewer than 2.
- **`_repair_min_two_glosses(term)`:** if after batch (or after single-path parse) there are still **fewer than 2** glosses, fire **one extra OpenAI** request for that term only, forcing 2–3 glosses on one line.
- **Single path `_single_openai_cached`:** system/user ask for **2 or 3** glosses; `max_tokens=72`; after clamp, if count is still below 2 call `_repair_min_two_glosses`, then clamp again; return string capped around **220** chars.

### `src/api_server.py`

- Flash translate endpoint docstrings: **min 2, max 3** glosses (single + batch).

### `.env.example`

- Comment for “direct vocabulary” card: **EN→VI min 2, max 3 glosses**.

### `frontend/js/chatbot/dom/cards/flashVocabCard.js`

- Comments + backend error hint text: user-facing copy says **2–3 glosses** (not “max 2 only”).

## Notes for the next agent

- To change gloss-count rules → edit **`flash_translate_service.py`** (prompts + `_clamp_*` + `_repair_*`); if output shape changes, review **chunk cache** (`_CHUNK_CACHE`, keys are term tuples).
- **API cost:** any term that still has fewer than 2 glosses after the batch pass incurs **+1** `/chat/completions` call (repair).
