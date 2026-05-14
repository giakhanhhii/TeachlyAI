function cleanTopic(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text || text === "(Teachly tự động)" || text === "—") return "";
  return text;
}

export function resolveTopicLabel(...candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const topic = cleanTopic(candidates[i]);
    if (topic) return topic;
  }
  return "";
}

export function buildExperienceTitle(kind, ...candidates) {
  const topic = resolveTopicLabel(...candidates);
  const prefix =
    kind === "fullset"
      ? "Fullset"
      : kind === "slide"
        ? "Slide"
        : kind === "quiz"
          ? "Quiz"
          : "Flashcard";
  return topic ? `${prefix} - chủ đề ${topic}` : prefix;
}

export function buildFormTitle(kind, ...candidates) {
  const topic = resolveTopicLabel(...candidates);
  const prefix =
    kind === "fullset"
      ? "Form Fullset"
      : kind === "slide"
        ? "Form Slide"
        : kind === "quiz"
          ? "Form Quiz"
          : "Form Flashcard";
  return topic ? `${prefix} - chủ đề ${topic}` : prefix;
}
