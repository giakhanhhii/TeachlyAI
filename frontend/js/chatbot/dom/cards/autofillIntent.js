function normalizeValue(value) {
  return String(value ?? "").trim();
}

function normalizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record || {}).map(([key, value]) => [key, normalizeValue(value)]),
  );
}

function recordsEqual(left, right) {
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => (left[key] ?? "") === (right[key] ?? ""));
}

export function createAutofillIntentTracker() {
  /** @type {Record<string, string> | null} */
  let snapshot = null;

  return {
    remember(values) {
      snapshot = normalizeRecord(values);
    },
    clear() {
      snapshot = null;
    },
    isUntouched(values) {
      if (!snapshot) return false;
      return recordsEqual(snapshot, normalizeRecord(values));
    },
    applyToPayload(payload, values) {
      if (!snapshot) return payload;
      if (this.isUntouched(values)) {
        return {
          ...payload,
          __forceMock: "1",
        };
      }
      return {
        ...payload,
        presetId: "",
        __forceAi: "1",
      };
    },
  };
}
