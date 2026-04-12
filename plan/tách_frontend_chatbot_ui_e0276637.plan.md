---
name: Tách frontend chatbot_ui
overview: "Tách frontend/chatbot_ui.html theo cursorrules.md §7: UI/DOM tách khỏi logic (session, guided, API); ES modules + file CSS riêng; HTML mỏng. Stack vanilla (không React). Serve HTTP cho type=module."
todos:
  - id: extract-css
    content: Tách CSS chatbot_ui thành frontend/css/chatbot-*.css và link từ HTML
    status: completed
  - id: extract-config-constants
    content: Tạo config.js, constants.js, assets.js (API base, keys, SVG)
    status: completed
  - id: extract-session-store
    content: Tạo sessionStore.js — toàn bộ localStorage sessions/activeSession
    status: completed
  - id: extract-guided-flow
    content: Tạo guidedFlow.js — logic pick/quiz/flash/startFromFlow (không DOM)
    status: completed
  - id: extract-chat-api
    content: Tạo chatApi.js — POST chat, xử lý lỗi response
    status: completed
  - id: extract-dom-views
    content: Tạo dom/messageView, chatListView, experience* views
    status: completed
  - id: wire-controller-main
    content: Tạo chatController.js + main.js; HTML chỉ bootstrap module
    status: completed
  - id: optional-main-hub
    content: (Sau) Tách main_hub.css + main-hub.js nếu muốn đồng bộ pattern
    status: pending
isProject: false
---

# Tách chatbot_ui (token-light)

**Mục tiêu:** `frontend/chatbot_ui.html` → shell + `frontend/css/*` + `frontend/js/chatbot/*` (ESM). **§7:** logic/state/API không nằm trong view; `guidedFlow.js` không `document`. **Hạn chế:** không `file://` cho module — dùng server (uvicorn).

**Cây file**

```
frontend/chatbot_ui.html
frontend/css/chatbot-tokens.css          :root
frontend/css/chatbot-layout.css          .app sidebar main top
frontend/css/chatbot-sidebar.css
frontend/css/chatbot-chat.css            messages composer
frontend/css/chatbot-experience.css      experienceLayer quiz flash
frontend/js/chatbot/config.js            meta API base → URL
frontend/js/chatbot/constants.js         localStorage keys
frontend/js/chatbot/assets.js            bot avatar SVG
frontend/js/chatbot/sessionStore.js      sessions, active, ensure, save, getCurrent
frontend/js/chatbot/guidedFlow.js        startFromFlow, handleGuidedSubmit, handleFlowAction logic only
frontend/js/chatbot/chatApi.js           POST /api/chat + errors
frontend/js/chatbot/dom/messageView.js   addMessage, thinking, stream, disableActionButtons
frontend/js/chatbot/dom/chatListView.js  renderChatList
frontend/js/chatbot/dom/experienceLayerView.js  hide/show layer
frontend/js/chatbot/dom/quizExperienceView.js
frontend/js/chatbot/dom/flashExperienceView.js
frontend/js/chatbot/chatController.js    form, flow query, new chat, switch session, orchestrate
frontend/js/chatbot/main.js              listeners sidebar home back; init; import controller
```

**Thứ tự làm:** 1 CSS → 2 config+constants+assets → 3 sessionStore → 4 guidedFlow → 5 chatApi → 6 dom/* → 7 chatController → 8 main.js → 9 HTML link CSS + `<script type="module" src="js/chatbot/main.js">`.

**Smoke:** `?flow=fullset|quiz|slide|image`, đổi phiên, gửi chat, guided quiz/flash, back experience.

**Sau (optional):** `main_hub.css` + `main-hub.js`; `main_hub.html` chỉ link.

**Nếu đổi Vite/React:** giữ cùng ranh giới file (store / guided pure / api / views / controller).
