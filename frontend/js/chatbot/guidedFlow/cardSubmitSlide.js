/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeSlideCardSubmit(guided, cardType, payload) {
  if (guided.kind === "slide" && guided.step === "await_pdf_meta" && cardType === "slide_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Mẫu: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp: ${pdfFn}` : "",
      "Nguồn: file",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic: payload.name || "—",
      count: payload.count || "—",
      notes: notes || "—",
      slideTemplate: String(payload.style || ""),
      structure: String(payload.structure || ""),
      style: String(payload.style || ""),
      ...(payload.presetId ? { presetId: payload.presetId } : {}),
      ...(guided.data?.pdfFile instanceof File ? { __pdfFile: guided.data.pdfFile } : {}),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Slide — file] ${meta.topic} — ${meta.count} slide${meta.notes !== "—" ? ` — ${meta.notes}` : ""}`,
        },
        { type: "showSlide", meta },
      ],
    };
  }

  if (guided.kind === "slide" && guided.step === "await_topic_form" && cardType === "slide_form") {
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Mẫu: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic: payload.topic || "—",
      count: payload.count || "—",
      notes: notes || "—",
      slideTemplate: String(payload.style || ""),
      structure: String(payload.structure || ""),
      style: String(payload.style || ""),
      ...(payload.presetId ? { presetId: payload.presetId } : {}),
      ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
      ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Slide] ${meta.topic} — ${meta.count} slide${meta.notes !== "—" ? ` — ${meta.notes}` : ""}`,
        },
        { type: "showSlide", meta },
      ],
    };
  }

  return null;
}

