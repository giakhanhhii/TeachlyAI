import {
  computePickAction,
  computeGuidedTextSubmit,
  computeFlowCardSubmit,
  PDF_SOURCE_ACTION_VALUES,
  getRestartAwaitSourceEffects,
} from "../guidedFlow.js";
import { setPendingPdfFile } from "../pdfPrefillStore.js";
import { createFlowActionHandler } from "../services/flowIntegration.js";

/**
 * @returns {Promise<File | null>}
 */
/**
 * Khi `guided` bị mất (vd. sau reload / edge case) nhưng biểu mẫu chủ đề vẫn còn trong chat,
 * khôi phục tối thiểu để `computeFlowCardSubmit` xử lý được.
 * @param {string} cardType
 */
function recoverGuidedForOrphanTopicForm(cardType) {
  if (cardType === "slide_form") return { kind: "slide", step: "await_topic_form", data: {} };
  if (cardType === "quiz_form") return { kind: "quiz", step: "await_topic_form", data: {} };
  if (cardType === "flash_form") return { kind: "flash", step: "await_topic_form", data: {} };
  if (cardType === "fullset_topic") return { kind: "fullset", step: "await_topic_form", data: {} };
  return null;
}

function pickPdfWithDialog() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";

    let settled = false;
    const done = (/** @type {File | null} */ f) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      resolve(f);
    };

    const onFocus = () => {
      setTimeout(() => {
        if (settled) return;
        const f = input.files?.[0] ?? null;
        done(f);
      }, 280);
    };

    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) done(f);
    });

    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}

/**
 * @param {{
 *   getGuided: () => any,
 *   setGuided: (next: any) => void,
 *   pushUser: (text: string) => void,
 *   pushBot: (text: string, opts?: any) => void,
 *   openSingleExperience: (kind: "quiz" | "slide" | "flash", meta: Record<string, string>, mode: "fresh" | "resume") => Promise<void>,
 *   pushQuickResumeDock: (kind: "quiz" | "slide" | "flash", meta: Record<string, string>) => void,
 *   reenableFlowCard: (cardRoot: HTMLElement | undefined) => void,
 *   disableActionButtons: (btnEl: HTMLElement) => void,
 * }} deps
 */
export function createGuidedInteractionController(deps) {
  const {
    getGuided,
    setGuided,
    pushUser,
    pushBot,
    openSingleExperience,
    pushQuickResumeDock,
    reenableFlowCard,
    disableActionButtons,
  } = deps;

  async function applyEffects(effects) {
    for (const e of effects) {
      if (e.type === "pushUser") pushUser(e.text);
      else if (e.type === "pushBot") pushBot(e.text, { actions: e.actions, cardType: e.cardType, resumeDock: e.resumeDock });
      else if (e.type === "showQuiz") {
        await openSingleExperience("quiz", e.meta || {}, "fresh");
        pushQuickResumeDock("quiz", e.meta || {});
      } else if (e.type === "showFlash") {
        await openSingleExperience("flash", e.meta || {}, "fresh");
        pushQuickResumeDock("flash", e.meta || {});
      } else if (e.type === "showSlide") {
        await openSingleExperience("slide", e.meta || {}, "fresh");
        pushQuickResumeDock("slide", e.meta || {});
      }
    }
  }

  const onFlowAction = createFlowActionHandler({
    getGuided,
    setGuided,
    computePickAction,
    getRestartAwaitSourceEffects,
    pdfSourceActionValues: PDF_SOURCE_ACTION_VALUES,
    pickPdfWithDialog,
    setPendingPdfFile: (file) => setPendingPdfFile(file),
    pushBot,
    applyEffects,
    disableActionButtons: (btnEl) => disableActionButtons(btnEl),
  });

  /**
   * @param {string} cardType
   * @param {Record<string, string>} payload
   * @param {HTMLElement | undefined} cardRoot
   */
  function handleFlowCardSubmit(cardType, payload, cardRoot) {
    let guidedForSubmit = getGuided();
    if (!guidedForSubmit) {
      const recovered = recoverGuidedForOrphanTopicForm(cardType);
      if (recovered) guidedForSubmit = recovered;
    }
    const result = computeFlowCardSubmit(guidedForSubmit, cardType, payload);
    if (!result.handled) {
      reenableFlowCard(cardRoot);
      return;
    }
    void (async () => {
      try {
        await applyEffects(result.effects);
        setGuided(result.guided);
      } catch {
        reenableFlowCard(cardRoot);
        pushBot("Không thể xử lý biểu mẫu vừa gửi. Bạn thử lại một lần nữa nhé.");
      }
    })();
  }

  /**
   * @param {string} prompt
   * @param {any} guidedState
   * @param {HTMLInputElement} inputEl
   * @returns {Promise<boolean>}
   */
  async function handleGuidedPrompt(prompt, guidedState, inputEl) {
    const result = computeGuidedTextSubmit(guidedState, prompt);
    if (!result.handled) return false;
    const prevGuided = getGuided();
    setGuided(result.guided);
    try {
      await applyEffects(result.effects);
      inputEl.value = "";
      inputEl.focus();
    } catch {
      setGuided(prevGuided);
      pushBot("Không thể xử lý yêu cầu này ngay bây giờ. Bạn thử lại một lần nữa nhé.");
    }
    return true;
  }

  return {
    applyEffects,
    onFlowAction,
    handleFlowCardSubmit,
    handleGuidedPrompt,
  };
}
