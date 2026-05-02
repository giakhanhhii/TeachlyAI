# Full THPTQG mock — recurring defect patterns (AI repair checklist)

**Caution:** edit **`backend/mock/thptqg_fulltest.json` directly** for real fixes; do not rely on one-off batch scripts to rewrite many tests unless you are deliberately repairing the import pipeline.

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

### Empty group (`instruction` + `context` missing)

**Symptom:** Banner such as “Passage này đang thiếu dữ liệu trong bundle hiện tại.” while stems still mention paragraph numbers, underline targets, or cloze blanks.

**Cause:** `solution-only` or broken import left `instruction: ""` and `context: []` for a range that still has live questions.

**Fix:** Restore the full reading or cloze passage for that `groups[]` entry; align markers (`[[u]]`, `**term**`, `(N)_`) with prompts.

### Instruction text disagrees with the passage topic

**Symptom:** Group title/instruction says e.g. “endangered languages” but `context` is clearly another theme (cultural diversity, plastic waste, etc.).

**Cause:** Copy-paste or partial merge after renumbering parts.

**Fix:** Rewrite the instruction/title to match the stored passage; adjust question ranges in the instruction string (`from 28 to 30` vs `from 31 to 35`) to match `questionNumbers`.

### Duplicate wiring for the same question number

**Symptom:** One blank index appears in two groups (e.g. `(22)_` in both a marine cloze block and an advertisement), or `questionNumbers` lists overlap inconsistently.

**Cause:** Import stitched unrelated fragments; answer keys were merged without resolving numbering.

**Fix:** Reserve each question index for one group only; renumber advertisement blanks or split passages so blanks and `questions[]` entries line up.

### Generic cloze fallback (“Answer question N”)

**Symptom:** UI shows a meaningless stem like “Answer question 17.” though options look like sentence-completion fragments.

**Cause:** Empty `prompt` / placeholder stem plus missing passage context for that blank.

**Fix:** Fill `context` and use explicit prompts such as “Choose the best phrase for blank (17).” when the formal stem text was never imported.

---

## Operational notes

- After editing `thptqg_fulltest.json`, regenerate the embedded fallback:  
  `node scripts/sync_thptqg_embedded_bundle.mjs`
- Prefer manual edits in mock JSON over importer one-offs unless the pipeline is being fixed project-wide.
