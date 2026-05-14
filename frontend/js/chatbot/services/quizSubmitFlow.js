export function finalizePendingQuizAnswer(selected, correctIndex, alreadyGraded = false) {
  if (alreadyGraded) return null;
  if (!Number.isFinite(Number(correctIndex))) return null;
  if (selected == null || selected === "") return null;
  if (!Number.isFinite(Number(selected))) return null;
  const picked = Math.floor(Number(selected));
  return {
    picked,
    isCorrect: picked === Math.floor(Number(correctIndex)),
  };
}

export function findNextStepIndexByKind(steps, currentIndex, kind) {
  if (!Array.isArray(steps)) return -1;
  for (let i = Math.max(0, Math.floor(Number(currentIndex)) + 1); i < steps.length; i += 1) {
    if (steps[i]?.kind === kind) return i;
  }
  return -1;
}
