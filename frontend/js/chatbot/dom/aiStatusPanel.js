/**
 * Floating mini-panel showing real-time Mock vs AI mode status.
 * Reads localStorage play counts + in-memory autofill counters.
 * Mount once from chatController.init().
 */

import { getApiOrigin } from "../config.js";
import { AI_THRESHOLD, STORAGE_KEY, getPlayCounts } from "../services/aiContentApi.js";
import { AUTOFILL_MOCK_LENGTHS, getMockPos, resetAutofillState } from "../data/sampleFlowData.js";

/** @type {["slide","quiz","flash","fullset"]} */
const TYPES = ["slide", "quiz", "flash", "fullset"];
const LABELS = { slide: "Slide", quiz: "Quiz", flash: "Flash", fullset: "Full Set" };

function isAutofillAi(type) {
  return getMockPos(type) >= (AUTOFILL_MOCK_LENGTHS[type] ?? Infinity);
}

function anyModeActive() {
  const counts = getPlayCounts();
  return TYPES.some((t) => (counts[t] || 0) >= AI_THRESHOLD || isAutofillAi(t));
}

function buildDots(filled, total) {
  const cap = Math.min(total, 5);
  const filledCap = Math.min(filled, cap);
  let html = '<span class="ai-sp-dots">';
  for (let i = 0; i < cap; i++) {
    html += `<span class="ai-sp-dot${i < filledCap ? " ai-sp-dot--on" : ""}"></span>`;
  }
  html += "</span>";
  return html;
}

function badgeAi() {
  return '<span class="ai-sp-badge ai-sp-badge--ai">AI</span>';
}

function badgeMock(cur, total) {
  return `<span class="ai-sp-badge ai-sp-badge--mock">${parseInt(cur, 10) || 0}/${parseInt(total, 10) || 0}</span>`;
}

export function mountAiStatusPanel() {
  let openKeyOk = null;
  let panelOpen = false;
  let _contentSrc = null;

  // --- Trigger button ---
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ai-sp-trigger";
  trigger.title = "Trạng thái Mock / AI — nhấn để xem chi tiết";
  trigger.setAttribute("aria-label", "Xem trạng thái Mock / AI");
  document.body.appendChild(trigger);

  // --- Panel ---
  const panel = document.createElement("div");
  panel.className = "ai-sp-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Trạng thái dữ liệu Mock / AI");
  document.body.appendChild(panel);

  // Delegated listeners — attached once so renderPanel re-renders don't pile up handlers
  panel.addEventListener("click", (e) => {
    if (e.target.closest(".ai-sp-close")) closePanel();
    if (e.target.closest(".ai-sp-reset")) {
      localStorage.removeItem(STORAGE_KEY);
      resetAutofillState();
      updateTrigger();
      renderPanel();
    }
  });

  // --- Fetch backend status once ---
  async function fetchBackendStatus() {
    try {
      const res = await fetch(`${getApiOrigin()}/api/status`);
      if (res.ok) {
        const d = await res.json();
        openKeyOk = Boolean(d.openai_key_ok);
      } else {
        openKeyOk = false;
      }
    } catch {
      openKeyOk = false;
    }
  }

  function updateTrigger() {
    const isAi = _contentSrc !== null ? _contentSrc === "ai" : anyModeActive();
    trigger.className = "ai-sp-trigger" + (isAi ? " ai-sp-trigger--ai" : " ai-sp-trigger--mock");
    trigger.innerHTML = isAi
      ? '<span class="ai-sp-trigger-dot"></span>⚡ AI'
      : '<span class="ai-sp-trigger-dot"></span>📦 Mock';
  }

  function renderPanel() {
    const counts = getPlayCounts();

    // OpenAI key row
    let keyHtml;
    if (openKeyOk === null) {
      keyHtml = `<div class="ai-sp-key-row">
        <span>OpenAI API key</span>
        <span class="ai-sp-badge ai-sp-badge--pending">kiểm tra…</span>
      </div>`;
    } else if (openKeyOk) {
      keyHtml = `<div class="ai-sp-key-row">
        <span>OpenAI API key</span>
        <span class="ai-sp-badge ai-sp-badge--ok">✓ OK</span>
      </div>`;
    } else {
      keyHtml = `<div class="ai-sp-key-row">
        <span>OpenAI API key</span>
        <span class="ai-sp-badge ai-sp-badge--err">✗ Chưa có</span>
      </div>`;
    }

    // Content rows
    const contentRows = TYPES.map((t) => {
      const cur = counts[t] || 0;
      const isAi = cur >= AI_THRESHOLD;
      return `<div class="ai-sp-row">
        <span class="ai-sp-type">${LABELS[t]}</span>
        ${buildDots(cur, AI_THRESHOLD)}
        ${isAi ? badgeAi() : badgeMock(cur, AI_THRESHOLD)}
      </div>`;
    }).join("");

    // Autofill rows
    const autofillRows = TYPES.map((t) => {
      const cur = getMockPos(t);
      const total = AUTOFILL_MOCK_LENGTHS[t] || 0;
      const isAi = cur >= total;
      return `<div class="ai-sp-row">
        <span class="ai-sp-type">${LABELS[t]}</span>
        ${buildDots(cur, total)}
        ${isAi ? badgeAi() : badgeMock(cur, total)}
      </div>`;
    }).join("");

    panel.innerHTML = `
      <div class="ai-sp-header">
        <span class="ai-sp-title">Mock / AI Status</span>
        <button type="button" class="ai-sp-close" aria-label="Đóng">✕</button>
      </div>
      ${keyHtml}
      <div class="ai-sp-section">
        <div class="ai-sp-section-label">Nội dung random</div>
        <div class="ai-sp-section-hint">Sau ${AI_THRESHOLD} lần play → dùng AI</div>
        ${contentRows}
      </div>
      <div class="ai-sp-section">
        <div class="ai-sp-section-label">Auto fill form</div>
        <div class="ai-sp-section-hint">Sau khi hết mock → dùng AI</div>
        ${autofillRows}
      </div>
      <div class="ai-sp-footer">
        <button type="button" class="ai-sp-reset">Reset nội dung về Mock</button>
      </div>
    `;

  }

  function openPanel() {
    panelOpen = true;
    panel.hidden = false;
    renderPanel();
    updateTrigger();
    if (openKeyOk === null) {
      fetchBackendStatus().then(() => {
        if (panelOpen) renderPanel();
      });
    }
  }

  function closePanel() {
    panelOpen = false;
    panel.hidden = true;
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panelOpen) closePanel();
    else openPanel();
  });

  document.addEventListener("click", (e) => {
    if (panelOpen && !panel.contains(e.target) && !trigger.contains(e.target)) {
      closePanel();
    }
  });

  // Refresh trigger when localStorage changes (other tabs or resets)
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      updateTrigger();
      if (panelOpen) renderPanel();
    }
  });

  // Experience views dispatch this to reflect actual content source on the trigger
  document.addEventListener("teachly:content-src", (e) => {
    _contentSrc = typeof e.detail === "string" ? e.detail : null;
    updateTrigger();
  });

  // Initial render
  updateTrigger();
  fetchBackendStatus().then(updateTrigger);
}
