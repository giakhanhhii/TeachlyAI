# Architectural Recommendation: Optimizing "God Components"

This document serves as a roadmap for an AI Coding Agent (Cursor) to refactor oversized files into maintainable modules.

## Standard Line Count Rules
- **Utility/Component Files:** Maximum **250 lines**.
- **Controller/Service Files:** Maximum **400 lines**.
- **Immediate Action Rule:** Any file exceeding **500 lines** MUST be split into smaller, specialized modules.

---

## 2. Identified God Components & Cursor Prompts

| File Path | Lines | Analysis & Recommended Action | Cursor Prompt (English) |
| :--- | :--- | :--- | :--- |
| `process_pdfs.py` | 567 | **Issue:** Bloated orchestration of PDF extraction and chunking. | "Split `process_pdfs.py`. Extract PDF extraction logic to `src/pdf/extractor.py` and processing logic to `src/pdf/processor.py`. Keep `process_pdfs.py` as a high-level orchestrator." |
| `frontend/js/chatbot/chatController.js` | 517 | **Issue:** Core orchestrator still handles too many UI bindings. | "Refactor `chatController.js`. Move event listener bindings for the sidebar and main hub to a new `dom/uiEventManager.js`. Aim to reduce the file to under 350 lines." |
| `text_cleaner.py` | 314 | **Issue:** Large collection of regex-based cleaning rules. | "Modularize `text_cleaner.py`. Split rules into `cleaners/noise_removal.py` and `cleaners/formatting.py`. Use a registry pattern to apply them." |
| `frontend/js/chatbot/controllers/experienceController.js` | 308 | **Issue:** Mounting logic for various experience types (Quiz, Flash, Slide). | "Split `experienceController.js`. Extract mounting logic for Quiz, Slides, and Flashcards into individual sub-controllers in `controllers/experience/`. Keep this file for routing only." |
| `frontend/js/chatbot/dom/messageView.js` | 280 | **Issue:** DOM manipulation for all message types is centralized here. | "Modularize `messageView.js`. Move complex message rendering (like interactive cards) into `dom/renderers/cardRenderer.js`. Ensure the main view remains focused on the message container." |

---

## 3. Guiding Principles for AI Agents
1. **Maintain Contracts:** Ensure public API exports remain the same to avoid breaking dependencies.
2. **Path Integrity:** When creating new files, automatically update all relative imports.
3. **Atomic Changes:** Refactor one file at a time. Verify functionality before moving to the next.
4. **Consistency:** Use the existing design system and naming conventions.
