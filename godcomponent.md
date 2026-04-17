# God Component Rules & Audit

Target: Eliminate oversized components and enforce modular architecture to ensure codebase maintainability.

## 1. Identified God Components (Requires Refactor)
- **`frontend/js/chatbot/dom/fullSetMixedExperienceView.js`**: Mixed concerns (Fetch, State, complex UI). ~490 lines.
- **`frontend/js/chatbot/dom/quizExperienceView.js`**: Monolithic quiz lifecycle management. ~424 lines.
- **`frontend/js/chatbot/chatController.js`**: Orchestration logic overloaded with DOM/Event init. ~474 lines.
- **`frontend/js/chatbot/controllers/experienceController.js`**: Mixed navigation, history, and persistence logic. ~497 lines.

---

## 2. Refactoring Strategy: Phased Execution Plan

To maximize safety and efficiency, we will refactor one by one following these logical steps:

### STEP 1: Quiz Experience Refactor (HIGHEST PRIORITY)
**Why first?** It's a leaf feature but has the most complex state/UI interactions (scoring, filtering review, AI drafts). It will serve as the "Master Template" for FullSet mixed view later.

**Execution plan for Quiz:**
1. **Logic/State Extraction:** Create `frontend/js/chatbot/services/quizService.js`. Move pure functions here (`quizStemToSafeHtml`, `insertInlineMcLineBreaks`, `buildAiDraftQuiz`, `recomputeScore`). 
2. **Sub-component Splitting (UI):** Create two new files to break down the monolithic `renderQuestion()` and `renderReview()` functions:
   - `frontend/js/chatbot/dom/quizStepView.js`: Renders a single question card and handles option clicks.
   - `frontend/js/chatbot/dom/quizReviewView.js`: Renders the end-of-quiz result, filters (All/Wrong), and explanation logic.
3. **Orchestration:** Transform the existing `frontend/js/chatbot/dom/quizExperienceView.js` into a lightweight Controller (or rename to `quizExperienceController.js`) that ONLY manages the `index` state and calls the step/review views.

### STEP 2: FullSet Mixed Refactor
- Apply the exact same pattern from Step 1 (`fullSetMixedStepView.js` already exists partially, we need to extract the review view and state logic).
- Extract `fullSetMixedService.js` for calculating scores across mixed types.

### STEP 3: Experience Controller Refactor (`controllers/experienceController.js`)
- Move persistence logic (History/Save) to a dedicated `frontend/js/chatbot/services/experienceHistoryService.js`.
- Keep the controller strictly for navigation events (opening/resuming docks).

### STEP 4: Chat Controller Refactor (`chatController.js`)
- Move all the inline dialogs (like `openContinueCreateDialog`) into a separate `frontend/js/chatbot/dom/dialogView.js`.
- Delegate flow setup to specialized sub-controllers, keeping this file strictly as the main Hub.

---

## 3. The "Standard Refactor" Workflow
*For each God Component, follow this 4-step internal process:*

1. **Phase 1: Logic Extraction (`*Service.js`)**
   - Extract pure functions, math, data transformations, and API calls.
   - **Goal:** Zero DOM dependencies in this file.
2. **Phase 2: Template Extraction (`*View.js`)**
   - Extract HTML strings and DOM element creation code.
   - **Goal:** Only rendering and basic UI event binding.
3. **Phase 3: State & Store Extraction (`*Store.js`)**
   - If the component manages complex persistence, move it to a dedicated store.
4. **Phase 4: Orchestration (`*Controller.js` or `Init`)**
   - The original file is reduced to a clean factory function that wires logic to UI.

---

## 4. Mandatory Architectural Standards

### Line Count Limits
- **Views/Components:** Max **200 lines**.
- **Services/Logic/Controllers:** Max **250 lines**.
- **HARD LIMIT:** No file shall exceed **300 lines**.

### Concern Separation
- `*Service.js`: Pure logic/API.
- `*View.js`: Rendering/UI events.
- `*Controller.js`: Orchestration and Dependency Injection.