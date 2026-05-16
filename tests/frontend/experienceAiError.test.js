import { describe, expect, it } from "vitest";

import { isUploadLimitError, resolveExperienceAiErrorMessage } from "../../frontend/js/chatbot/dom/experienceAiError.js";

describe("experienceAiError", () => {
  it("recognizes upload-length rejection messages", () => {
    expect(isUploadLimitError(new Error("Tài liệu quá dài. Giới hạn 40,000 ký tự (tương đương 20 trang)."))).toBe(true);
    expect(isUploadLimitError(new Error("Tài liệu có 25 trang, vượt quá giới hạn 20 trang."))).toBe(true);
    expect(isUploadLimitError(new Error("Ảnh quá lớn (12 MB). Giới hạn 10 MB."))).toBe(true);
    expect(isUploadLimitError(new Error("Không thể xử lý tệp. Vui lòng thử lại."))).toBe(false);
  });

  it("prefers backend detail text when rendering the message", () => {
    expect(resolveExperienceAiErrorMessage(new Error("Tài liệu quá dài"), "fallback")).toBe("Tài liệu quá dài");
    expect(resolveExperienceAiErrorMessage({}, "fallback")).toBe("fallback");
  });
});
