# Fix Full THPTQG - Test 4

## Scope

- Fixed `thptqg-simulation-test-4` in `backend/mock/thptqg_fulltest.json`.
- Synced the embedded frontend fallback bundle after the data fix.
- Did not edit importer or repair scripts.

## Issues Found

- Question 17 option D contained the next opera passage, so the passage was rendered as an answer choice.
- Part 3 had one empty arrangement group for questions 21-30, causing the missing-passage warning.
- Question 22 option D contained the plastic-bags passage, so the passage was rendered as an answer choice.
- Questions 31-40 used one long context string plus empty strings, so paragraph labels and paragraph-target highlighting could not work correctly.

## Manual Fixes

- Trimmed question 17 option D back to only `a-b-c-e-d`.
- Added a dedicated opera passage group for questions 18-20 in Part 2.
- Added the continued opera passage group for questions 21-22 in Part 3.
- Added a separate plastic-bags passage group for questions 23-30 in Part 3.
- Trimmed question 22 option D back to only the answer text.
- Split the conservation passage for questions 31-40 into five paragraph entries.
- Marked the underlined sentences with `[[u]]...[[/u]]` so the existing renderer can show emphasis.

## Verification Notes

- Test 4 now has reading context for questions 21-30.
- Plastic-bags and opera passages are no longer inside answer options.
- The conservation passage has multiple context entries, allowing `Paragraph 1` through `Paragraph 5` labels and prompt-based highlighting.

# Fix Full THPTQG - Test 5

## Scope

- Fixed `thptqg-simulation-test-5` questions 21-30 in `backend/mock/thptqg_fulltest.json`.
- Synced the same manual text fixes into `frontend/js/chatbot/services/embeddedThptqgFullTestBundle.js`.
- Did not edit importer, repair scripts, or rendering scripts.

## Issues Found

- Question 25 asked for `their` in paragraph 3, but the target word appears in paragraph 5.
- Question 26 asked for `groundbreaking` in paragraph 2, but the target word appears in paragraph 4.
- Question 27 quotes a long sentence, and the existing focus matcher may not catch that full sentence automatically.

## Manual Fixes

- Changed question 25 prompt to reference paragraph 5 so `their` is highlighted in the correct passage paragraph.
- Changed question 26 prompt to reference paragraph 4 so `groundbreaking` is highlighted in the correct passage paragraph.
- Wrapped the quoted sentence for question 27 with `[[u]]...[[/u]]` in the passage context so it is emphasized without changing renderer logic.

## Verification Notes

- Test 5 Part 3 now has corrected prompt references for the target words in questions 25 and 26.
- The sentence used by question 27 is explicitly marked for emphasis in the passage context.

# Fix Full THPTQG - Test 6

## Scope

- Fixed `thptqg-simulation-test-6` in `backend/mock/thptqg_fulltest.json`.
- Read only the targeted `pair-12` block from `data_output/66_Full.md` and the cleaner duplicate in `example5.md` to restore the original stems/passages.
- Did not edit importer or repair scripts.

## Issues Found

- Questions `1-12` had no real stem/context in the test data, so the UI could only show generic prompts.
- Questions `21-22` were detached from the Ronaldo cloze passage and were still using the wrong sports placeholder content.
- Questions `23-30` were showing the wrong passage (`gap year`) instead of the original `Vietnamese cultural identity` passage.
- Questions `31-40` were showing the wrong passage (`military robots`) instead of the original `news` passage, so the bolded target words and underlined sentence were also wrong or missing.

## Manual Fixes

- Restored the full original cloze stem for questions `1-6` (`TravelMate`) and `7-12` (`Sustainable Living`).
- Restored the missing continuation stem for questions `11-12`.
- Reattached questions `18-22` to the original Cristiano Ronaldo cloze passage and replaced the wrong placeholder options in questions `18-22`.
- Replaced the Part 3 passage with the original `Vietnamese cultural identity` reading and restored the intended emphasis markers:
  - `**indigenous**`
  - `**reverence**`
  - `[[u]]...[[/u]]` around the `Ao dai...` sentence
  - `**their**`
- Replaced the Part 4 passage with the original `news` reading and restored the intended emphasis markers:
  - `**limited**`
  - `**them**`
  - `**take a toll on**`
  - `[[u]]...[[/u]]` around the concluding sentence used by question `38`
- Updated question prompts `23-40` to match the restored passages instead of the wrong imported content.

## Verification Notes

- Test 6 now has actual passage text for questions `1-12` instead of empty context arrays.
- Questions `21-22` now sit inside the same Ronaldo passage block as `18-20`.
- Questions `23-30` and `31-40` now point at the correct restored readings, with the bolded and underlined text present in the passage context.
