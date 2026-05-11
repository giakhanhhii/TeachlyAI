import { DIRECT_QUIZ_AUTOFILL_SAMPLES } from "./directQuizPresets.js";
import { DIRECT_SLIDE_AUTOFILL_SAMPLES } from "./directSlidePresets.js";
import { DIRECT_FLASH_AUTOFILL_SAMPLES } from "./directFlashPresets.js";
import { SLIDE_TEMPLATE_OPTIONS } from "./slideTemplateOptions.js";

const FULLSET_COUNT_PRESETS = [
  { s: "10", q: "20", f: "10" },
  { s: "15", q: "15", f: "10" },
  { s: "10", q: "15", f: "15" },
  { s: "20", q: "10", f: "10" },
  { s: "12", q: "18", f: "10" },
  { s: "10", q: "20", f: "10" },
  { s: "15", q: "10", f: "15" },
];

const FULLSET_LEVEL_PRESETS = ["Khá", "Cơ bản", "Nâng cao", "Khá", "Khá", "Cơ bản", "Nâng cao"];

const SAMPLES_FULLSET = DIRECT_SLIDE_AUTOFILL_SAMPLES.slice(0, 40).map((sample, i) => ({
  t: sample.t,
  l: FULLSET_LEVEL_PRESETS[i % FULLSET_LEVEL_PRESETS.length],
  m: SLIDE_TEMPLATE_OPTIONS[i % SLIDE_TEMPLATE_OPTIONS.length],
  ...FULLSET_COUNT_PRESETS[i % FULLSET_COUNT_PRESETS.length],
  e: "",
}));

const SAMPLES_SLIDE = DIRECT_SLIDE_AUTOFILL_SAMPLES.slice();

const SAMPLES_QUIZ = DIRECT_QUIZ_AUTOFILL_SAMPLES.slice();

const SAMPLES_FLASH = DIRECT_FLASH_AUTOFILL_SAMPLES.slice();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

shuffle(SAMPLES_FULLSET);
shuffle(SAMPLES_SLIDE);
shuffle(SAMPLES_FLASH);

/** Number of mock samples per type — autofill uses AI once counter reaches these. */
export const AUTOFILL_MOCK_LENGTHS = {
  slide: SAMPLES_SLIDE.length,
  quiz: SAMPLES_QUIZ.length,
  flash: SAMPLES_FLASH.length,
  fullset: SAMPLES_FULLSET.length,
};

export { SAMPLES_FULLSET, SAMPLES_SLIDE, SAMPLES_QUIZ, SAMPLES_FLASH };
