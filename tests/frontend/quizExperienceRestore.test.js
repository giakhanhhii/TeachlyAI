import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMockResource, renderQuizReviewView } = vi.hoisted(() => ({
  fetchMockResource: vi.fn(),
  renderQuizReviewView: vi.fn(),
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
  renderQuizStepView: ({ stage, question, isBookmarked, onToggleBookmark }) => {
    stage.innerHTML = "";
    const text = document.createElement("div");
    text.className = "quiz-step-text";
    text.textContent = question?.text || "";
    stage.appendChild(text);
    if (typeof onToggleBookmark === "function") {
      const bookmarkBtn = document.createElement("button");
      bookmarkBtn.type = "button";
      bookmarkBtn.textContent = isBookmarked ? "Đã bookmark" : "Bookmark câu này";
      bookmarkBtn.addEventListener("click", (event) => onToggleBookmark(event));
      stage.appendChild(bookmarkBtn);
    }
    return { hasQuestion: true };
  },
}));

vi.mock("../../frontend/js/chatbot/dom/quizReviewView.js", () => ({
  renderQuizReviewView,
}));

import { mountQuizExperience } from "../../frontend/js/chatbot/dom/quizExperienceView.js";

describe("quizExperience restore", () => {
  beforeEach(() => {
    fetchMockResource.mockReset();
    renderQuizReviewView.mockReset();
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

  it("supports bookmarking quiz questions and filtering to bookmarked ones like full set", async () => {
    const layerView = {
      prepareShow: vi.fn(),
      body: document.createElement("div"),
    };
    const onStateChange = vi.fn();

    await mountQuizExperience(
      layerView,
      { topic: "Grammar", count: "2" },
      {},
      {
        initialState: {
          title: "Quiz - Grammar",
          meta: { topic: "Grammar", count: "2" },
          index: 0,
          questionsSnapshot: [
            {
              id: "q1",
              text: "Question 1",
              options: ["A", "B", "C", "D"],
              correctIndex: 0,
            },
            {
              id: "q2",
              text: "Question 2",
              options: ["A", "B", "C", "D"],
              correctIndex: 1,
            },
          ],
          selectedByIndex: [0, 1],
          gradedByIndex: [true, true],
        },
        onStateChange,
      },
    );

    const bookmarkQuestionBtn = Array.from(layerView.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Bookmark câu này"),
    );
    expect(bookmarkQuestionBtn).toBeTruthy();
    bookmarkQuestionBtn.click();

    const bookmarkState = onStateChange.mock.calls.at(-1)?.[0];
    expect(bookmarkState?.bookmarkedQuestionKeys).toHaveLength(1);
    expect(bookmarkState?.bookmarkFilter).toBe(false);

    const nextBtn = Array.from(layerView.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Tiếp theo",
    );
    expect(nextBtn).toBeTruthy();
    nextBtn.click();
    expect(layerView.body.textContent).toContain("Question 2");

    const bookmarkFilterBtn = layerView.body.querySelector(".flash-bookmark-filter-btn");
    expect(bookmarkFilterBtn).toBeTruthy();
    bookmarkFilterBtn.click();

    const filteredState = onStateChange.mock.calls.at(-1)?.[0];
    expect(filteredState?.bookmarkFilter).toBe(true);
    expect(filteredState?.index).toBe(0);
    expect(layerView.body.textContent).toContain("Question 1");

    const submitBtn = Array.from(layerView.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Nộp bài",
    );
    expect(submitBtn).toBeTruthy();
    submitBtn.click();

    expect(renderQuizReviewView).toHaveBeenCalled();
    expect(renderQuizReviewView.mock.calls.at(-1)?.[0]?.bookmarkFilter).toBe(true);
    expect(renderQuizReviewView.mock.calls.at(-1)?.[0]?.bookmarkedQuestionKeys).toHaveLength(1);
  });
});
