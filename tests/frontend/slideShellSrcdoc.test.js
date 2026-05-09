import { describe, expect, it } from "vitest";

import { DIRECT_SLIDE_PRESETS } from "../../frontend/js/chatbot/data/directSlidePresets.js";
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

const COMIC_STRATEGY_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Comic Strategy Shell 2026</title>
  </head>
  <body class="shell-theme-comic">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="slide-title">Placeholder</h2>
        <div class="content-area">
          <div class="strategy-strip">
            <div class="strategy-step">
              <span class="badge">1</span>
              <h3>Placeholder A</h3>
              <p>Placeholder detail A</p>
            </div>
            <div class="strategy-step">
              <span class="badge">2</span>
              <h3>Placeholder B</h3>
              <p>Placeholder detail B</p>
            </div>
            <div class="strategy-step">
              <span class="badge">3</span>
              <h3>Placeholder C</h3>
              <p>Placeholder detail C</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const COMIC_GRID_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Comic Grid Shell 2026</title>
  </head>
  <body class="shell-theme-comic">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="slide-title">Placeholder</h2>
        <div class="content-area">
          <div class="comic-grid-2 compact-grid-2" style="height: 100%;">
            <div class="mini-panel">
              <h3>One</h3>
              <p>Placeholder detail one</p>
            </div>
            <div class="mini-panel">
              <h3>Two</h3>
              <p>Placeholder detail two</p>
            </div>
            <div class="mini-panel">
              <h3>Three</h3>
              <p>Placeholder detail three</p>
            </div>
            <div class="mini-panel">
              <h3>Four</h3>
              <p>Placeholder detail four</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const SEA_LIFE_MIXED_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Sea Life Shell 2026</title>
  </head>
  <body class="shell-theme-sealife">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <div class="card title-card">
          <div class="title-content">
            <h1>Placeholder title</h1>
            <p>Placeholder detail</p>
          </div>
        </div>
      </div>
      <div class="slide-container" id="slide2">
        <h2 class="outer-title">Placeholder title</h2>
        <div class="card">
          <div class="cols-3">
            <div class="tl-item"><h3>One</h3><p>Placeholder detail one</p></div>
            <div class="tl-item"><h3>Two</h3><p>Placeholder detail two</p></div>
            <div class="tl-item"><h3>Three</h3><p>Placeholder detail three</p></div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const SEA_LIFE_IMAGE_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Sea Life Image Shell 2026</title>
  </head>
  <body class="shell-theme-sealife">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="outer-title">Placeholder title</h2>
        <div class="image-layout">
          <div class="card text-part">
            <p>Placeholder detail</p>
          </div>
          <div class="image-wrapper">
            <img src="https://example.com/test.jpg" alt="placeholder" />
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const SEA_LIFE_IMAGE_REVERSED_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Sea Life Image Reversed Shell 2026</title>
  </head>
  <body class="shell-theme-sealife">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <h2 class="outer-title" style="text-align: right; right: 60px;">Placeholder title</h2>
        <div class="image-layout">
          <div class="image-wrapper">
            <img src="https://example.com/test.jpg" alt="placeholder" />
          </div>
          <div class="card text-part">
            <p>Placeholder detail</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const SEA_LIFE_PRACTICE_SHELL = `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Sea Life Practice Shell 2026</title>
  </head>
  <body class="shell-theme-sealife">
    <div id="presentation-area">
      <div class="slide-container" id="slide1">
        <div class="card title-card">
          <div class="big-note">
            <p>Placeholder detail</p>
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

    expect(title.length).toBeLessThanOrEqual(34);
    expect(bullets.length).toBeLessThanOrEqual(4);
    bullets.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(56);
    });
  });

  it("keeps comic strategy panels extra short to protect three-column layouts", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      COMIC_STRATEGY_SHELL,
      [
        {
          title: "Câu điều kiện hỗn hợp - công thức và cách dùng trong bài tập",
          bullets: [
            "Khái niệm: kết nối nguyên nhân quá khứ với kết quả hiện tại; cần xác định rõ hai mốc thời gian.",
            "Công thức: If + past perfect, would + V now. Bước 1: nhìn mệnh đề if. Bước 2: xác định kết quả ở hiện tại.",
            "Lỗi hay gặp: dùng would have cho kết quả hiện tại hoặc không nhận ra mixed conditional.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const headings = Array.from(doc.querySelectorAll(".strategy-step h3")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );
    const details = Array.from(doc.querySelectorAll(".strategy-step p")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );

    headings.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(14);
    });
    details.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(30);
    });
  });

  it("keeps comic grid titles and panel copy compact for dense layouts", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      COMIC_GRID_SHELL,
      [
        {
          title: "Word Formation - Lộ trình kiến thức để tránh tràn chữ trên slide comic",
          bullets: [
            "Knowledge: Danh từ thường xuất hiện sau article, adjective hoặc preposition.",
            "Ví dụ 1: The explanation was clear and the invention became famous worldwide.",
            "Note: Dạy mẹo chọn đáp án theo từ loại và hậu tố để học sinh không rối.",
            "Bước 2: đối chiếu lại công thức be/seem/become + adjective + noun.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const title = doc.querySelector(".slide-title")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const headings = Array.from(doc.querySelectorAll(".mini-panel h3")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );
    const details = Array.from(doc.querySelectorAll(".mini-panel p")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );

    expect(title.length).toBeLessThanOrEqual(20);
    headings.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(20);
      expect(item).not.toMatch(/^(?:Knowledge|Ví dụ|Note|Bước)\b/i);
    });
    details.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(34);
      expect(item).not.toMatch(/^(?:Knowledge|Ví dụ|Note|Bước)\b/i);
    });
  });

  it("keeps Sea Life title cards and dense columns short enough for the viewport", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      SEA_LIFE_MIXED_SHELL,
      [
        {
          title: "Word Formation - Lộ trình kiến thức",
          bullets: [
            "Knowledge: Danh từ thường xuất hiện sau article, adjective hoặc preposition.\nExample: The explanation was clear.\nNote: Dạy mẹo chọn đáp án theo từ loại và hậu tố. Tiền tố/hậu tố.",
            "Knowledge: Tính từ đứng trước danh từ hoặc sau linking verb.\nExample: The route is shorter than the old one.\nNote: Dùng ví dụ ngắn và bài tập viết lại câu.",
          ],
        },
        {
          title: "Dấu hiệu tính từ - Công thức",
          bullets: [
            "Khái niệm: dùng -er hoặc more theo độ dài tính từ.\nVai trò: so sánh hơn giúp nối ý gọn và đúng ngữ pháp.\nDấu hiệu: comparative + than.\nVí dụ 1: This route is shorter than the old one.",
            "Công thức cốt lõi: comparative + than.\nBước 1: xác định tính từ hoặc trạng từ.\nBước 2: chọn đúng dạng theo số âm tiết.\nBước 3: đọc lại cả mệnh đề.",
            "Cách áp dụng: nhìn từ đứng sau than.\nMẫu quen thuộc: The new method is more effective.\nTránh lỗi: dùng more với tính từ ngắn.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const titleCardDetail = doc.querySelector(".title-card p")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const outerTitle = doc.querySelector(".outer-title")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const denseHeadings = Array.from(doc.querySelectorAll(".cols-3 h3")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );
    const denseDetails = Array.from(doc.querySelectorAll(".cols-3 p")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim(),
    );

    expect(titleCardDetail.length).toBeLessThanOrEqual(112);
    expect(titleCardDetail).not.toContain("Tiền tố/hậu tố");
    expect(outerTitle.length).toBeLessThanOrEqual(18);
    denseHeadings.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(17);
    });
    denseDetails.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(33);
    });
  });

  it("compacts Sea Life image-layout text and long titles before rendering", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      SEA_LIFE_IMAGE_SHELL,
      [
        {
          title: "Dấu hiệu tính từ - Ví dụ áp dụng trong bài word form",
          bullets: [
            "Trong câu The method is effective, enough for weak students, từ effective là tính từ vì nó đứng sau linking verb is.",
            "Ý 2 -> be/seem/become + adjective; adjective + noun.",
            "Ý 3 -> tránh lỗi dùng trạng từ sau linking verb, đồng thời không nhầm adjective với noun.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const outerTitle = doc.querySelector(".outer-title")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const detail = doc.querySelector(".image-layout .text-part p")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const detailHtml = doc.querySelector(".image-layout .text-part p")?.innerHTML || "";
    const titleStyle = doc.querySelector(".outer-title")?.getAttribute("style") || "";

    expect(outerTitle.length).toBeLessThanOrEqual(21);
    expect(detail.length).toBeLessThanOrEqual(165);
    expect((detailHtml.match(/<br>/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(titleStyle).toContain("left: 60px");
    expect(titleStyle).toContain("right: calc(50% + 25px)");
  });

  it("keeps Sea Life image-layout titles centered over the white box on the right", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      SEA_LIFE_IMAGE_REVERSED_SHELL,
      [
        {
          title: "So sánh hơn - Ví dụ",
          bullets: [
            "Ví dụ 1 -> This route is shorter than the old one.",
            "Ví dụ 2 -> The new method is more effective.",
            "Lưu ý -> nhìn than để xác định vế so sánh.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const detailHtml = doc.querySelector(".image-layout .text-part p")?.innerHTML || "";
    const titleStyle = doc.querySelector(".outer-title")?.getAttribute("style") || "";

    expect((detailHtml.match(/<br>/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(titleStyle).toContain("left: calc(50% + 25px)");
    expect(titleStyle).toContain("right: 60px");
  });

  it("formats Sea Life practice cards into three labeled lines", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      SEA_LIFE_PRACTICE_SHELL,
      [
        {
          title: "Mixed conditional - Luyện tập",
          bullets: [
            "Phân tích mốc thời gian trong 3 câu.",
            "Viết 2 câu mixed conditional.",
            "Giải thích vì sao chọn đúng cấu trúc.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const detailHtml = doc.querySelector(".big-note p")?.innerHTML || "";
    const detailText = doc.querySelector(".big-note p")?.textContent?.replace(/\s+/g, " ").trim() || "";

    expect((detailHtml.match(/<br>/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(detailText).toContain("Ý 1 ->");
    expect(detailText).toContain("Ý 2 ->");
    expect(detailText).toContain("Ý 3 ->");
  });

  it("keeps Sea Life single-line detail centered and only left-aligns multiline detail", () => {
    const srcdoc = buildSlideDeckSrcdoc(
      SEA_LIFE_MIXED_SHELL,
      [
        {
          title: "Câu so sánh",
          bullets: [
            "Dùng as...as và not as/so...as.",
          ],
        },
      ],
      { shellYear: "2026" },
    );

    const doc = new DOMParser().parseFromString(srcdoc, "text/html");
    const styleText = doc.querySelector("style[data-slide-shell-fit]")?.textContent || "";

    expect(styleText).toContain("body.shell-theme-sealife .shell-slide-instance[data-shell-authored-slide=\"1\"] .title-card p");
    expect(styleText).toContain("text-align: center !important;");
    expect(styleText).toContain("p.shell-sealife-multiline");
    expect(styleText).toContain("text-align: left !important;");
  });

  it("uses concrete reported-question rewriting prompts instead of placeholders", () => {
    const preset = DIRECT_SLIDE_PRESETS.find((item) => item.id === "slide-reported-speech");
    const practiceSlide = preset?.slides.find((slide) => slide.title === "Câu hỏi tường thuật - Luyện tập");
    const prompt = practiceSlide?.bullets[0] || "";

    expect(prompt).toContain('"Do you like English?"');
    expect(prompt).toContain('"Where do you live?"');
    expect(prompt).toContain('"Can you help me?"');
    expect(prompt).toContain('"What are you doing?"');
    expect(prompt).toContain('"Did you finish homework?"');
    expect(prompt).not.toBe("Viết lại 5 câu hỏi.");
  });
});
