import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMockResource } = vi.hoisted(() => ({
  fetchMockResource: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/services/mockContentApi.js", () => ({
  fetchMockResource,
}));

vi.mock("../../frontend/js/chatbot/services/aiContentApi.js", () => ({
  isAiModeActive: () => false,
  incrementPlayCount: vi.fn(),
  fetchAiContent: vi.fn(),
  fetchAiFileContent: vi.fn(),
}));

vi.mock("../../frontend/js/chatbot/dom/quizStepView.js", () => ({
  renderQuizStepView: ({ stage, question }) => {
    stage.innerHTML = `<div>${question?.text || ""}</div>`;
    return { hasQuestion: true };
  },
}));

vi.mock("../../frontend/js/chatbot/dom/quizReviewView.js", () => ({
  renderQuizReviewView: vi.fn(),
}));

import { mountQuizExperience } from "../../frontend/js/chatbot/dom/quizExperienceView.js";

describe("quizExperience restore", () => {
  beforeEach(() => {
    fetchMockResource.mockReset();
  });

  it("reuses the saved question snapshot instead of fetching a new quiz", async () => {
    const layerView = {
      prepareShow: vi.fn(),
      body: document.createElement("div"),
    };
    const onStateChange = vi.fn();

    await mountQuizExperience(
      layerView,
      { topic: "Health", count: "10" },
      {},
      {
        initialState: {
          title: "Quiz - Health",
          meta: { topic: "Health", count: "10" },
          index: 0,
          questionsSnapshot: [
            {
              id: "q1",
              text: "Saved question",
              options: ["A", "B", "C", "D"],
              correctIndex: 2,
            },
          ],
          selectedByIndex: [null],
          gradedByIndex: [false],
        },
        onStateChange,
      },
    );

    expect(fetchMockResource).not.toHaveBeenCalled();
    expect(layerView.body.textContent).toContain("Saved question");
    expect(onStateChange).toHaveBeenCalled();
    expect(onStateChange.mock.calls.at(-1)?.[0]?.questionsSnapshot?.[0]?.text).toBe("Saved question");
  });
});
