// DEV-ONLY panel — remove mountRecommendPanel() call and recommendation-panel.css before deploy
import { getLog, getActiveDwell } from "../services/dwellStore.js";

let _panelEl = null;
let _pendingUpdate = null;
let _liveTimer = null;

export function mountRecommendPanel() {
  if (_panelEl) return;
  _panelEl = document.createElement("div");
  _panelEl.id = "rec-panel";
  _panelEl.className = "rec-panel rec-panel--collapsed";
  _panelEl.innerHTML = `
    <button class="rec-panel__toggle" title="Recommendation System — DEV">REC</button>
    <div class="rec-panel__body">
      <div class="rec-panel__status">Đang thu thập dữ liệu…</div>
      <div class="rec-panel__log"></div>
      <div class="rec-panel__suggestions"></div>
    </div>`;
  document.body.appendChild(_panelEl);
  _panelEl.querySelector(".rec-panel__toggle").addEventListener("click", () => {
    _panelEl.classList.toggle("rec-panel--collapsed");
    if (!_panelEl.classList.contains("rec-panel--collapsed")) _repaint({});
  });
  if (_pendingUpdate) {
    const upd = _pendingUpdate;
    _pendingUpdate = null;
    updateRecommendPanel(upd);
  }
}

function _repaint({ status, log, suggestions } = {}) {
  if (!_panelEl) return;
  const statusEl = _panelEl.querySelector(".rec-panel__status");
  const logEl = _panelEl.querySelector(".rec-panel__log");
  const sugEl = _panelEl.querySelector(".rec-panel__suggestions");
  const currentLog = log || getLog();

  if (status === "ready") {
    statusEl.textContent = `✓ Đề xuất sẵn sàng (${currentLog.length} lịch sử)`;
    statusEl.className = "rec-panel__status rec-panel__status--ready";
  } else if (status === "loading") {
    statusEl.textContent = "Đang gọi AI…";
    statusEl.className = "rec-panel__status rec-panel__status--loading";
  } else {
    statusEl.textContent = `Đang thu thập: ${currentLog.length}/${Math.ceil(currentLog.length / 5) * 5 || 5}…`;
    statusEl.className = "rec-panel__status";
  }

  if (currentLog.length > 0) {
    logEl.innerHTML = "<b>Gần đây:</b><br>" +
      currentLog.slice(-5).map(e => `[${e.kind}] ${e.topic} — ${e.dwellSeconds}s`).join("<br>");
  } else {
    logEl.innerHTML = "<i>Chưa có lịch sử</i>";
  }

  if (suggestions?.length) {
    sugEl.innerHTML = "<b>Gợi ý chủ đề:</b><br>" + suggestions.map(s =>
      `• [${s.kind}] <b>${s.topic}</b><br><small>${s.reason || ""}</small>`
    ).join("<br>");
  }
}

export function updateRecommendPanel(opts = {}) {
  if (!_panelEl) { _pendingUpdate = opts; return; }
  _repaint(opts);
}
