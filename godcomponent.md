# Architectural Recommendation: Optimizing "God Components"

This document serves as a roadmap for an AI Coding Agent (Cursor) to refactor oversized files into maintainable modules.

## Standard Line Count Rules
- **Simple Files:** Maximum **300 lines**.
- **Complex Logic Files:** Maximum **500 lines**.
- **Rule of Thumb:** Any file exceeding **500 lines** MUST be split immediately.

---

## 2. Identified God Components & Cursor Prompts

| File Path | Lines | Analysis & Recommended Action |
| :--- | :--- | :--- |
| `frontend/js/chatbot/dom/flowCards.js` | 1075 | **Issue:** Bloated with static sample data and UI logic. <br> **Prompt:** "Move all SAMPLES to `data/sampleFlowData.js`. Split remaining logic into specialized modules in `dom/cards/` (e.g., `quizCard.js`). Keep `create...Card` exports." |
| `frontend/js/chatbot/chatController.js` | 727 | **Issue:** Still contains orchestration and history logic. <br> **Prompt:** "Extract Flow Utils to `services/flowService.js` and Message History/Rendering to `services/messageHistoryService.js`. Aim for < 400 lines." |
| `frontend/js/chatbot/guidedFlow.js` | 656 | **Issue:** Large State Machine and Effect transitions. <br> **Prompt:** "Split action effect computations into smaller specialized modules. Keep `guidedFlow.js` as the high-level state coordinator." |
| `frontend/css/chatbot-experience.css` | 531 | **Issue:** Combined styles for multiple experience types. <br> **Prompt:** "Split into component-scoped CSS: `quiz-exp.css`, `slide-exp.css`, `flash-exp.css`. Use `@import` in the root file." |
| `frontend/js/chatbot/dom/fullSetMixedExperienceView.js` | 426 | **Issue:** Complex UI rendering for mixed sets. <br> **Prompt:** "Modularize UI component creation into smaller functions. Move helper logic to a separate service if possible." |
| `src/pdf_chunker.py` | 413 | **Issue:** Combined OCR and text processing logic. <br> **Prompt:** "Extract OCR classes and text-cleaning functions to `src/utils/ocr_helper.py`. Keep `pdf_chunker.py` for process orchestration." |
| `frontend/js/chatbot/controllers/experienceController.js` | 391 | **Issue:** Mounting logic for various experiences. <br> **Prompt:** "Review and ensure each mount function is concise. Move specialized state calculation logic to external helpers." |
| `frontend/css/chatbot-chat.css` | 380 | **Issue:** General chat UI styles. <br> **Prompt:** "Divide into logical sections: `message-bubbles.css`, `chat-layout.css`, `animations.css`." |
| `frontend/main_hub.html` | 318 | **Issue:** Large HTML structure with many SVGs. <br> **Prompt:** "Consider extracting large inline SVGs into separate files or using a sprite sheet to reduce HTML size." |

---

## 3. Guiding Principles for Cursor
1. **Functional First:** Only refactor if the feature is currently working and error-free.
2. **Path Integrity:** Ensure all relative imports are updated after moving files.
3. **One by One:** Apply changes for a single file, verify it works, then move to the next.
