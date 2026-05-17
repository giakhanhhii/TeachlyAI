import { afterAll, describe, expect, it, vi } from "vitest";

const originalSrcdocDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");

Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", {
  configurable: true,
  get() {
    return this._srcdoc || "";
  },
  set(value) {
    this._srcdoc = value;
    queueMicrotask(() => {
      this.dispatchEvent(new Event("load"));
    });
  },
});

vi.mock("../../frontend/js/chatbot/services/mockContentApi.js", () => ({
  fetchMockResource: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/aiContentApi.js", () => ({
  isAiModeActive: () => false,
  incrementPlayCount: vi.fn(),
  fetchAiFullsetContent: vi.fn(),
  fetchAiFileContent: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/dwellStore.js", () => ({
  beginDwell: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/backgroundFetchStore.js", () => ({
  getFetch: vi.fn(),
  startFetch: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/dom/experienceLoading.js", () => ({
  createAiLoadingOverlay: () => ({
    remove: vi.fn(),
  }),
}));

vi.mock("../../frontend/js/chatbot/services/contentTitles.js", () => ({
  buildExperienceTitle: (_kind, topic, initialTitle, bundleTitle) => bundleTitle || initialTitle || topic || "Full set",
}));

vi.mock("../../frontend/js/chatbot/services/sessionContentPrep.js", () => ({
  prepareQuizSessionData: vi.fn(),
  prepareSlideSessionData: vi.fn(),
  prepareFlashSessionData: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/data/slideThemeShellMap.js", () => ({
  resolveSlideShellFilename: () => "forest.html",
}));

vi.mock("../../frontend/js/chatbot/slide/slideShellLoad.js", () => ({
  fetchSlideShellHtml: async () => "<html><body><div>mock shell</div></body></html>",
}));

vi.mock("../../frontend/js/chatbot/slide/slideShellSrcdoc.js", () => ({
  buildSlideDeckSrcdoc: () => "<html><body><div>mock srcdoc</div></body></html>",
  setSlideShellNavMode: vi.fn(),
  syncShellSlideNav: vi.fn(),
  setSlideVisualEditMode: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/slideExportApi.js", () => ({
  exportSlideDeckToPdf: vi.fn(),
  triggerPdfDownload: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/dom/experienceChrome.js", () => ({
  createExperienceTopBar: () => {
    const bar = document.createElement("div");
    const right = document.createElement("div");
    const actionButton = document.createElement("button");
    right.className = "exp-topbar-right";
    right.appendChild(actionButton);
    bar.appendChild(right);
    return { bar, actionButton };
  },
  createProgressRow: () => {
    const wrap = document.createElement("div");
    return {
      wrap,
      paint: ({ total }) => {
        wrap.innerHTML = "";
        for (let i = 0; i < total; i += 1) {
          const segment = document.createElement("span");
          segment.className = "exp-progress-seg";
          wrap.appendChild(segment);
        }
      },
    };
  },
  createPrimaryNavButton: ({ label, disabled }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = Boolean(disabled);
    return button;
  },
}));

vi.mock("../../frontend/js/chatbot/services/speechService.js", () => ({
  hookFlashSpeechVoicesOnce: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/fullsetAutoMode.js", () => ({
  resolveFullsetContentSource: () => "mock",
}));

vi.mock("../../frontend/js/chatbot/dom/fullSetMixedStepView.js", () => ({
  applyQuizRevealStyles: vi.fn(),
  createStepBadge: (kind) => {
    const badge = document.createElement("div");
    badge.className = "step-badge";
    badge.textContent = kind;
    return badge;
  },
  renderFlashStep: vi.fn(),
  renderQuizStep: (stage, { question }) => {
    const quiz = document.createElement("div");
    quiz.className = "quiz-step";
    quiz.textContent = question?.text || "";
    stage.appendChild(quiz);
    return { canProceed: false };
  },
  renderSlideStep: (stage, slide) => {
    const slideCard = document.createElement("div");
    slideCard.className = "slide-step";
    slideCard.textContent = slide?.title || "";
    stage.appendChild(slideCard);
  },
}));

vi.mock("../../frontend/js/chatbot/dom/fullSetMixedReviewView.js", () => ({
  renderFullSetMixedReviewView: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/dom/slideExperienceImagePicker.js", () => ({
  openSlideImagePicker: vi.fn(),
}));

import { mountFullSetMixedExperience } from "../../frontend/js/chatbot/dom/fullSetMixedExperienceView.js";

afterAll(() => {
  if (originalSrcdocDescriptor) {
    Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", originalSrcdocDescriptor);
    return;
  }
  delete HTMLIFrameElement.prototype.srcdoc;
});

describe("mountFullSetMixedExperience", () => {
  it("advances to the next quiz when the slide next arrow is clicked on the last slide", async () => {
    const body = document.createElement("div");
    document.body.appendChild(body);
    const layerView = {
      prepareShow: vi.fn(),
      body,
    };

    await mountFullSetMixedExperience(
      layerView,
      {
        title: "Full Set",
        spec: {
          topic: "Environment",
          slides: "1",
          quiz: "1",
          flash: "0",
          slideTemplate: "forest",
        },
      },
      {},
      {
        initialState: {
          index: 0,
          slideDeckIndex: 0,
          stepsSnapshot: [
            {
              kind: "slide_deck",
              data: {
                slides: [{ title: "Summary" }],
              },
            },
            {
              kind: "quiz",
              data: {
                text: "Quiz question after slide",
                options: ["A", "B", "C", "D"],
                correctIndex: 0,
              },
            },
          ],
        },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const nextArrow = body.querySelector(".exp-slide-arrow--next");
    const exportBtn = body.querySelector(".exp-topbar-right > button");
    expect(nextArrow).not.toBeNull();
    expect(nextArrow.disabled).toBe(false);
    expect(exportBtn.hidden).toBe(false);
    expect(exportBtn.style.display).toBe("");

    nextArrow.click();

    expect(body.textContent).toContain("Quiz question after slide");
    expect(exportBtn.hidden).toBe(true);
    expect(exportBtn.style.display).toBe("none");

    body.querySelector(".exp-back-btn").click();

    expect(body.textContent).toContain("slide_deck");
    expect(exportBtn.hidden).toBe(false);
    expect(exportBtn.style.display).toBe("");
    body._kbAbort?.();
    body.remove();
  });
});
