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
