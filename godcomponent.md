# God Components Audit & Refactoring Plan

This document identifies "God Components" in the project—files that have grown too large and take on too many responsibilities—and provides specific refactoring prompts for Cursor.

---

## 1. slideVisualEditorIframe.js (40KB, 1100+ lines)

### Analysis
This file is the single most complex "God Component" in the system. It manages everything happening inside the slide editing iframe:
- **Styles**: Contains a massive CSS string for the editor UI.
- **State**: Manages `selected`, `drag`, `resizeState`, `enabled` states.
- **Geometry**: Handles complex layout calculations (spacers, containing blocks, offset logic).
- **Interaction**: Pointer events for dragging, resizing, and toolbar hit-testing.
- **Rendering**: Manages the handle layer and the toolbar.
- **Logic**: Implements "Canva-style" text reflow and resizing constraints.

### Proposed Refactoring
Split into a modular directory `frontend/js/chatbot/slide/visualEditor/`:
- `styles.js`: Contains `SLIDE_VISUAL_EDITOR_CSS`.
- `geometry.js`: Helper functions for block/offset/containing block calculations.
- `handles.js`: Logic for creating and syncing the resize handles layer.
- `toolbar.js`: Logic for creating and managing the editor toolbar.
- `core.js`: The main IIFE orchestrator that wires everything together.

### Cursor Refactoring Prompt
> **Task**: Refactor `slideVisualEditorIframe.js` into a modular structure to eliminate the "God Component" pattern.
> 
> **Instructions**:
> 1. Create a folder `frontend/js/chatbot/slide/visualEditor/`.
> 2. Create `styles.js` and move `SLIDE_VISUAL_EDITOR_CSS` there.
> 3. Create `geometry.js` and move utility functions like `absoluteContainingBlock`, `insertFlowSpacerIfNeeded`, `offsetFromContainingBlock`, and `lockTextBoxFor*` there.
> 4. Create `handles.js` and move `buildHandleLayer`, `syncHandles`, and handle pointer events there.
> 5. Create `toolbar.js` and move toolbar creation/listener logic there.
> 6. Create `core.js` to host the main `(function(){...})()` IIFE. It should import fragments from other files to reconstruct the final `SLIDE_VISUAL_EDITOR_JS` string.
> 7. Ensure `slideVisualEditorIframe.js` remains the public API by exporting the final CSS and reconstructed JS string.

---

## 2. fullSetMixedExperienceView.js (24KB, 570+ lines)

### Analysis
This view manages the "Full Set" experience, which is a mix of Slides, Quizzes, and Flashcards. It is a God Component because it handles:
- **Data Prep**: Syncs/prepares data for 3 different content types.
- **State Machine**: Manages a complex internal index (global steps vs internal slide index).
- **Multi-Rendering**: Contains rendering logic for Slide iframes, Quiz interaction, and Flashcards.
- **Navigation Logic**: Complex "Next/Back" logic that behaves differently based on the current step kind.
- **UI Interaction**: Keyboard shortcuts, Fullscreen API, and Iframe postMessage logic.

### Proposed Refactoring
Split into:
- `fullSetMixedStateManager.js`: Pure logic for managing current step, results, and navigating between modes.
- `fullSetMixedIframeController.js`: Encapsulates iframe creation, srcdoc building, and postMessage syncing.
- `fullSetMixedSubViews.js`: Extracts the 3 content rendering branches into focused components.

### Cursor Refactoring Prompt
> **Task**: Refactor `fullSetMixedExperienceView.js` to separate state logic from UI rendering and iframe management.
> 
> **Instructions**:
> 1. Extract the state management (index, correct/wrong tracking, shuffle, review mode logic) into a helper or class (e.g., `fullSetMixedState.js`).
> 2. Move the Slide Iframe management (creation, `buildSlideDeckSrcdoc`, synchronization, fullscreen/keyboard listeners) into a dedicated component.
> 3. Simplify `mountFullSetMixedExperience` to be an orchestrator that delegates to specific renderers for "slide_deck", "quiz", and "flash" steps.
> 4. Ensure `renderReview` remains a separate module (it already mostly is, but ensure clean interface).

---

## 3. slideShellSrcdoc.js (27KB, 770+ lines)

### Analysis
This file is responsible for "re-shelling" raw HTML files into interactive slide decks. It is a God Component because it mixes:
- **HTML Parsing**: Uses `DOMParser` to manipulate and "decorate" slide prototypes.
- **Template Logic**: Implements the logic for variants and slots.
- **Content Injection**: Injects "Fit" scripts, "Editor" scripts, and "Styles".
- **Navigation Services**: Provides functions for syncing/scrolling slides in the iframe.

### Proposed Refactoring
- `slideShellParser.js`: Pure `DOMParser` manipulations.
- `slideShellInjections.js`: Repository of scripts/styles that get injected (Fit script, fit styles).
- `slideShellSync.js`: The public API for communicating with the iframe (sync, scroll, mode).

---

## 4. chatController.js (17KB, 480+ lines)

### Analysis
While it delegates to many sub-controllers, the `init` function has become a massive wiring hub. It also contains ad-hoc UI logic like the `openContinueCreateDialog` modal.

### Proposed Refactoring
- **Move Modals**: Create `frontend/js/chatbot/dom/modals.js` and move `openContinueCreateDialog` there.
- **Clean Registry**: Refactor `init` to use a more declarative approach or smaller registration functions.
- **Utility Extraction**: Move small utilities like `reenableFlowCard` to `dom/cards/flowCardShared.js`.

---

## Performance Tip for Cursor
When performing these refactorings, use `replace_file_content` sparingly and prefer `multi_replace_file_content` for targeted extractions. Always verify that imports are correctly updated across the project after splitting files.
