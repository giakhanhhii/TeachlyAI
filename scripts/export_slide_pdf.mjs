import { readFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "@playwright/test";

const [, , payloadPath, outputPath] = process.argv;

if (!payloadPath || !outputPath) {
  console.error("Usage: node scripts/export_slide_pdf.mjs <payload.json> <output.pdf>");
  process.exit(1);
}

/**
 * @returns {Promise<import("@playwright/test").Browser>}
 */
async function launchBrowser() {
  try {
    return await chromium.launch({
      channel: "msedge",
      headless: true,
    });
  } catch {
    return chromium.launch({
      headless: true,
    });
  }
}

const payload = JSON.parse(await readFile(payloadPath, "utf8"));
const srcdoc = String(payload?.srcdoc || "");

if (!srcdoc.trim()) {
  console.error("Slide srcdoc is empty.");
  process.exit(1);
}

const browser = await launchBrowser();

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.setContent(srcdoc, { waitUntil: "load" });
  await page.evaluate(async () => {
    try {
      await document.fonts?.ready;
    } catch {
      /* ignore font loading failures */
    }

    document.body?.classList.remove("slide-visual-edit-on");
    document
      .querySelectorAll(
        'style[data-slide-visual-editor], script[data-slide-visual-editor], .slide-visual-edit-toolbar, .slide-visual-edit-handles, [data-edit-flow-spacer="1"]',
      )
      .forEach((node) => node.remove());
    document.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    document
      .querySelectorAll("[data-edit-selected], [data-edit-text-active], [data-edit-flow-spacer], [spellcheck]")
      .forEach((node) => {
        node.removeAttribute("data-edit-selected");
        node.removeAttribute("data-edit-text-active");
        node.removeAttribute("data-edit-flow-spacer");
        node.removeAttribute("spellcheck");
      });

    const master = document.querySelector("#slides-master-container");
    if (master) {
      master.setAttribute("data-nav-mode", "scroll");
    }
    document.querySelectorAll(".shell-slide-instance").forEach((node) => node.classList.add("active"));

    const style = document.createElement("style");
    style.setAttribute("data-slide-pdf-export", "1");
    style.textContent = `
      @page {
        size: 1280px 720px;
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 1280px !important;
        min-width: 1280px !important;
        background: #ffffff !important;
        overflow: visible !important;
      }
      body {
        display: block !important;
        min-height: auto !important;
      }
      #presentation-area {
        position: static !important;
        width: 1280px !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        transform: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #slides-master-container {
        display: block !important;
        width: 1280px !important;
        margin: 0 !important;
        padding: 0 !important;
        gap: 0 !important;
        overflow: visible !important;
        break-after: avoid !important;
        page-break-after: auto !important;
      }
      .shell-slide-instance {
        display: flex !important;
        position: relative !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
        width: 1280px !important;
        min-width: 1280px !important;
        max-width: 1280px !important;
        height: 720px !important;
        min-height: 720px !important;
        max-height: 720px !important;
        margin: 0 !important;
        break-after: avoid-page !important;
        page-break-after: auto !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .shell-slide-instance:not(:last-child) {
        break-after: page !important;
        page-break-after: always !important;
      }
    `;
    document.head.appendChild(style);
  });

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(150);
  await page.pdf({
    path: outputPath,
    printBackground: true,
    width: "1280px",
    height: "720px",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
}
