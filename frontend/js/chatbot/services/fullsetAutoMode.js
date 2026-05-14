export function buildAutoModeFullsetSpec(topic, counts, slideTemplate, opts = {}) {
  const prefetchKey = String(opts.prefetchKey || "");
  const isAi = opts.isAi === true;
  const isWarmup = opts.isWarmup === true;

  return {
    topic,
    slides: String(counts?.slides ?? 15),
    quiz: String(counts?.quiz ?? 15),
    flash: String(counts?.flash ?? 10),
    slideTemplate: slideTemplate || "",
    __autoMode: "1",
    ...(prefetchKey ? { __prefetchId: prefetchKey } : {}),
    ...(isAi ? { __forceAi: "1" } : { __forceMock: "1" }),
    ...(isWarmup ? { __forceMock: "1" } : {}),
  };
}

export function resolveFullsetContentSource(opts = {}) {
  const forceAi = opts.forceAi === true;
  const forceMock = opts.forceMock === true;
  const autoMode = opts.autoMode === true;
  const aiModeActive = opts.aiModeActive === true;
  const topic = typeof opts.topic === "string" ? opts.topic.trim() : "";

  if (forceMock) return "mock";

  const isAutoTopic = !topic || topic === "(Teachly tự động)" || autoMode;
  const thresholdAllowsAi = !autoMode && aiModeActive;

  return forceAi || thresholdAllowsAi || !isAutoTopic ? "ai" : "mock";
}
