import { describe, expect, it } from "vitest";

import { buildSlideDeckSrcdoc } from "../../frontend/js/chatbot/slide/slideShellSrcdoc.js";

const FRIENDLY_TWO_BOX_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Friendly Shell 2026</title>
  </head>
  <body class="shell-theme-friendly">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="slide-title">Placeholder</h2>
        <div class="content-area">
          <div class="two-column tiled">
            <div>
              <h3>Box 1</h3>
              <p>Placeholder 1</p>
            </div>
            <div>
              <h3>Box 2</h3>
              <p>Placeholder 2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const COMIC_LIST_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Comic Shell 2026</title>
  </head>
  <body class="shell-theme-comic">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="slide-title">Placeholder</h2>
        <div class="content-area">
          <div class="comic-panel">
            <ul class="comic-list">
              <li>Placeholder 1</li>
              <li>Placeholder 2</li>
              <li>Placeholder 3</li>
              <li>Placeholder 4</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

describe("slideShellSrcdoc.js", () => {
  it("balances long knowledge text across paired authored boxes", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      FRIENDLY_TWO_BOX_SHELL,
      [
        {
          title: "Rút gọn bằng to V",
          bullets: [
            "Khái niệm: Dùng với the first, the last, the only và so sánh nhất. Vai trò: giúp câu gọn và đúng ngữ pháp. Dấu hiệu: thường xuất hiện sau danh từ đặc biệt hoặc cụm có tính giới hạn. Ví dụ: He was the first person who arrived -> He was the first person to arrive. Ví dụ khác: She is the only student who can solve it -> She is the only student to solve it. Lỗi cần tránh: không dùng to V cho mọi mệnh đề quan hệ.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const headings = Array.from(doc.querySelectorAll(".two-column.tiled h3")).map((node) =>
      node.textContent.trim(),
    );
    const details = Array.from(doc.querySelectorAll(".two-column.tiled p")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );

    expect(headings).toHaveLength(2);
    expect(details).toHaveLength(2);
    expect(headings[0]).not.toBe(headings[1]);
    expect(details[0].length).toBeGreaterThan(90);
    expect(details[1].length).toBeGreaterThan(90);
    expect(Math.abs(details[0].length - details[1].length)).toBeLessThan(120);
  });

  it("keeps comic generated text intentionally short to avoid overflow", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      COMIC_LIST_SHELL,
      [
        {
          title: "Sự hòa hợp chủ ngữ số ít và số nhiều - khái niệm, quy tắc, lỗi thường gặp trong đề thi",
          bullets: [
            "Khái niệm: Động từ phải hòa hợp với chủ ngữ thật của câu. Vai trò: chủ ngữ số ít và số nhiều giúp nối ý gọn và đúng ngữ pháp. Dấu hiệu: Singular subject + singular verb; plural subject + plural verb.",
            "Công thức cốt lõi: Singular subject + singular verb; plural subject + plural verb. Bước 1: xác định chủ ngữ chính. Bước 2: chọn dạng động từ đúng.",
            "Cách áp dụng nhanh: nhìn từ đứng trước và đứng sau chỗ cần điền, không để cụm giới từ đánh lạc hướng.",
            "Ghi chú triển khai: tập trung vào lỗi subject-verb agreement trong câu trắc nghiệm.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const title = doc.querySelector(".slide-title")?.textContent?.trim() || "";
    const bullets = Array.from(doc.querySelectorAll(".comic-list li")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );

    expect(title.length).toBeLessThanOrEqual(45);
    expect(bullets.length).toBeLessThanOrEqual(2);
    bullets.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(45);
    });
  });
});
