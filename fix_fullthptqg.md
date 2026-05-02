# Full THPTQG mock — recurring defect patterns (AI repair checklist)
Caution: MUST EDIT RIGHT INTO THE TEST DON"T WRITE ANY SCRIPT TO EDIT A BUNCH
Use this as a **generic** log when auditing or fixing imports/heuristic-built entries in `backend/mock/thptqg_fulltest.json`. Patterns apply across mocks; verify against the answer key and original PDF/source when available.

---

## Stems and prompts

### Arrangement / reordering items rendered on one line (`a - … b - …`)

**Symptom:** Utterances run together in one paragraph; labels `a`–`e` are hard to scan.

**Cause:** Stems often use `a -` / `b -` (space-hyphen) instead of `A.` / `B.`; default line-break helpers may only split the latter.

**Fix:** Ensure `insertInlineMcLineBreaks` in `quizService.js` inserts newlines before each `[a-e] - ` label; or store explicit `\n` after each label line in JSON.

### Blank stems (`Question N.` only)

**Symptom:** UI falls back to generic copy (“Choose the best arrangement…”).

**Cause:** Missing real stem text or empty `context` for cloze blocks.

**Fix:** Restore full passage/cloze from source material; wire group `instruction` + `context` + question prompts consistently.

### Answer option polluted by passage text

**Symptom:** A reading passage or next question’s stem appears inside an option string.

**Cause:** Bad merge or paste during import.

**Fix:** Trim options to the intended sequence/text only; move prose back into `context` or `prompt`.

---

## Reading passages (`parts[].groups[].context`)

### Padding entries (`""`) or fake splits

**Symptom:** Blank stripes between paragraphs, wrong “Paragraph N” mapping, or long-reading layout treating unrelated chunks as separate paragraphs.

**Cause:** `context` arrays padded with empty strings, or one blob split arbitrarily.

**Fix:** Remove empty strings; use either **one** continuous string when the section should read as a single block (no artificial paragraph breaks), or **one string per real paragraph** aligned with prompts that reference paragraph numbers.

### Marked emphasis missing

**Symptom:** “Underlined sentence”, “the word X in paragraph Y”, or bold targets do not highlight.

**Cause:** Passage text lacks markers the renderer expects.

**Fix:** Use `**word**` for bold targets and `[[u]]…[[/u]]` around sentences meant to be underlined, consistent with how the experience view resolves emphasis.

### Prompt paragraph index ≠ passage layout

**Symptom:** Question asks for “paragraph 2” but the target appears elsewhere.

**Cause:** Passage was merged/split without updating prompts.

**Fix:** Renumber prompt **or** reshuffle `context` strings so paragraph indices match.

### Wrong passage attached to a question range

**Symptom:** Questions clearly refer to topic A while sidebar shows topic B.

**Cause:** Wrong group wiring after partial import.

**Fix:** Replace `context` for that group and reconcile prompts/options with the restored passage.

---

## Operational notes

- After editing `thptqg_fulltest.json`, regenerate the embedded fallback:  
  `node scripts/sync_thptqg_embedded_bundle.mjs`
- Prefer manual edits in mock JSON over importer one-offs unless the pipeline is being fixed project-wide.
