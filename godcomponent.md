# Architectural Recommendation: Optimizing "God Components"

This document provides specific guidelines and prompts for an AI Coding Agent (Cursor) to refactor oversized files into smaller, maintainable modules.

## Code Line Count Guidelines
- **Ideal:** Under **300 lines**. Ensures the file follows the Single Responsibility Principle.
- **Maximum (for complex logic):** No more than **400-500 lines**.
- **Red Line (> 500 lines):** Immediate refactoring is required.

---

## 2. Refactoring Plan & Prompts for Cursor

### 1. File: `frontend/js/chatbot/dom/flowCards.js` (~1075 lines)
**Issue:** Contains excessive static sample data (SAMPLES) and DOM generation logic.
**Prompt for Cursor:**
> "Move all SAMPLES arrays to a new file `data/sampleFlowData.js`. Then, split the remaining code into sub-modules under `dom/cards/` (e.g., `quizCard.js`, `pdfCard.js`). Keep the `create...Card` function signatures unchanged to avoid breaking external dependencies."

### 2. File: `frontend/js/chatbot/chatController.js` (~691 lines)
**Issue:** Handles message history loading and flow utility functions that should be delegated.
**Prompt for Cursor:**
> "Extract Flow Utilities (normalizeFlowParam, buildNextFlowSessionTitle) to `services/flowService.js`. Extract Message History logic (loadMoreHistory, renderMessages) to `services/messageHistoryService.js`. Aim to bring this file under 400 lines."

### 3. File: `frontend/js/chatbot/guidedFlow.js` (~656 lines)
**Issue:** State transition and effect calculation logic is too coupled and lengthy.
**Prompt for Cursor:**
> "Split the Effect calculation logic (computePickAction, computeStartFlow) into smaller modules based on action types. Keep the main `guidedFlow.js` file focused strictly on state transition coordination."

### 4. File: `frontend/css/chatbot-experience.css` (~529 lines)
**Issue:** Combined CSS for all experience screens (Quiz, Slide, Flashcard).
**Prompt for Cursor:**
> "Split this CSS file into smaller components: `quiz-exp.css`, `slide-exp.css`, and `flash-exp.css`. Use `@import` in the main file or import them directly in JS as needed."

### 5. File: `src/pdf_chunker.py` (~413 lines)
**Issue:** (Backend) OCR and text processing logic are concentrated in a single file.
**Prompt for Cursor:**
> "Extract the OCR class and text processing functions (cleaning/normalization) to `src/utils/ocr_helper.py`. Keep `pdf_chunker.py` restricted to high-level flow orchestration."

---

## 3. Implementation Notes
1. Always prioritize **Fixing bugs/UI paralysis** before **Refactoring**.
2. Use `git status` to track newly created files.
3. Process one file at a time, click "Apply", and verify functionality before moving to the next task.
