# Test Plan: Fix Paralyzed UI - Startup Hub

## 1. Objective
Resolve the issue where all UI elements (Sidebar, New Chat button, Hub Cards, Home Button) are unresponsive/unclickable on the `chatbot_ui.html` interface.

## 2. Debugging & Fix Steps (For Cursor)

### Step 0: Critical Bug Fixes (High Priority)
- **Fix Initialization Crash:** Ensure the `init()` function in `chatController.js` does NOT abort entirely if a DOM element (like `topHomeBtn` or `toggleSidebar`) is missing. Use optional chaining or simple null checks to prevent crashing the whole app.
- **Fix UI Lock-out:** In the session `delete` action handler, ensure the `actionInFlight` flag is reset to `false` even if the user cancels the `window.confirm` dialog.
- **Fix Deletion Race Condition:** Ensure all asynchronous operations in `onSessionDeleted` and the deletion logic are correctly sequenced to prevent UI inconsistency.
A "paralyzed" system usually means the `init()` function in `chatController.js` crashed midway, stopping further execution.
- **Verify Imports:** Ensure all imported files in `chatController.js` (e.g., `messageController.js`, `sessionController.js`, `historyService.js`) exist at the correct paths.
- **Add Debug Logs:** Insert `console.log("Init started")` at the beginning of `init()` and at key milestones to identify exactly where the script stops.

### Step 2: Check Dependencies
- Ensure new controllers (`messageController`, `experienceController`) are properly instantiated before they are used.
- Check for any `undefined` variables being passed into services (e.g., `msgView`, `layerView`).

### Step 3: Verify Element Binding
- Confirm that IDs like `newChatBtn`, `toggleSidebar`, and `topHomeBtn` in `chatbot_ui.html` exactly match the selectors used in `chatController.js` and `sessionController.js`.
- Specifically check the `bindNewChatButton` function in `sessionController.js` to ensure the listener is successfully attached.

### Step 4: Validate Startup Hub Cards
- In `startupHubCards.js`, check the `querySelectorAll(".card[data-flow]")` loop.
- Ensure the `onPick` callback passed from `chatController` to `createStartupHubElement` is not null.

### Step 5: Check for Invisible Overlays
- Inspect CSS files (`chatbot-experience.css` or `chatbot-layout.css`) for elements like `experienceLayer` that might have a high `z-index` and cover the entire screen even when hidden.
- Ensure `experienceLayer` has `pointer-events: none` or `display: none` when it's not active.

## 3. Expected Results
- "+ New Chat" button works (creates a new session).
- Sidebar can be collapsed/expanded.
- All 4 hub cards (Full Set, Slide, Quiz, Flashcard) are clickable and initiate the corresponding flow.
- No red error messages remain in the browser console
