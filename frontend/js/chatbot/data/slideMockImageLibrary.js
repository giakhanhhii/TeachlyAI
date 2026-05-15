const SHARED_IMG_PARAMS = "?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80";

const SLIDE_MOCK_IMAGE_LIBRARY = Object.freeze([
  {
    id: "study-roadmap",
    url: `https://images.unsplash.com/photo-1455390582262-044cdead277a${SHARED_IMG_PARAMS}`,
    alt: "Study roadmap with branching choices",
  },
  {
    id: "grammar-puzzle",
    url: `https://images.unsplash.com/photo-1503676260728-1c00da094a0b${SHARED_IMG_PARAMS}`,
    alt: "Puzzle pieces representing grammar logic and structure",
  },
  {
    id: "listening-headphones",
    url: `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f${SHARED_IMG_PARAMS}`,
    alt: "Student using headphones for listening practice",
  },
  {
    id: "pronunciation-dictionary",
    url: `https://images.unsplash.com/photo-1516979187457-637abb4f9353${SHARED_IMG_PARAMS}`,
    alt: "Dictionary and pronunciation reference tools",
  },
  {
    id: "teacher-speaking",
    url: `https://images.unsplash.com/photo-1513258496099-48168024aec0${SHARED_IMG_PARAMS}`,
    alt: "Teacher guiding speaking and pronunciation practice",
  },
  {
    id: "grammar-notes",
    url: `https://images.unsplash.com/photo-1456735190827-d1262f71b8a3${SHARED_IMG_PARAMS}`,
    alt: "Student reviewing English grammar notes",
  },
  {
    id: "vocab-collocations",
    url: `https://images.unsplash.com/photo-1517842645767-c639042777db${SHARED_IMG_PARAMS}`,
    alt: "Creative vocabulary and collocation study scene",
  },
  {
    id: "exam-practice",
    url: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8${SHARED_IMG_PARAMS}`,
    alt: "Student completing an English practice test",
  },
  {
    id: "reading-strategy",
    url: `https://images.unsplash.com/photo-1507842217343-583bb7270b66${SHARED_IMG_PARAMS}`,
    alt: "Focused reading and comprehension practice",
  },
  {
    id: "digital-laptop",
    url: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3${SHARED_IMG_PARAMS}`,
    alt: "Students using laptops for digital learning",
  },
  {
    id: "workplace-team",
    url: `https://images.unsplash.com/photo-1522202176988-66273c2fd55f${SHARED_IMG_PARAMS}`,
    alt: "Professional team collaborating in a modern workplace",
  },
  {
    id: "forest-climate",
    url: `https://images.unsplash.com/photo-1441974231531-c6227db76b6e${SHARED_IMG_PARAMS}`,
    alt: "Green forest landscape representing climate and sustainability",
  },
  {
    id: "health-clinic",
    url: `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d${SHARED_IMG_PARAMS}`,
    alt: "Healthcare professional using digital medical tools",
  },
  {
    id: "travel-journey",
    url: `https://images.unsplash.com/photo-1488646953014-85cb44e25828${SHARED_IMG_PARAMS}`,
    alt: "Traveller planning a new journey",
  },
  {
    id: "culture-library",
    url: `https://images.unsplash.com/photo-1521587760476-6c12a4b040da${SHARED_IMG_PARAMS}`,
    alt: "Library shelves representing language and cultural learning",
  },
  {
    id: "ocean-whale",
    url: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "Whale tail above the ocean",
  },
  {
    id: "ocean-diver",
    url: "https://images.unsplash.com/photo-1551244072-5d12893278ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Scuba diver exploring the blue ocean",
  },
  {
    id: "ocean-school",
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "School of fish moving together underwater",
  },
  {
    id: "space-galaxy",
    url: `https://images.unsplash.com/photo-1462331940025-496dfbfc7564${SHARED_IMG_PARAMS}`,
    alt: "Spiral galaxy in deep space",
  },
  {
    id: "space-earth",
    url: `https://images.unsplash.com/photo-1446776811953-b23d57bd21aa${SHARED_IMG_PARAMS}`,
    alt: "Illustrated Earth in space",
  },
  {
    id: "space-ring",
    url: `https://images.unsplash.com/photo-1614728894747-a83421789f10${SHARED_IMG_PARAMS}`,
    alt: "Ringed planet floating in space",
  },
]);

const IMAGE_BY_ID = new Map(SLIDE_MOCK_IMAGE_LIBRARY.map((item) => [item.id, item]));

const THEME_IMAGE_RULES = Object.freeze([
  {
    test: /\b(?:sea life|sealife|shell-theme-sealife|ocean|sea|marine)\b/i,
    imageIds: ["ocean-diver", "ocean-whale", "ocean-school"],
  },
  {
    test: /\b(?:space light|space dark|space-bright|space-black|space|galaxy|planet|astronomy|universe)\b/i,
    imageIds: ["space-galaxy", "space-earth", "space-ring"],
  },
  {
    test: /\b(?:comic|shell-theme-comic)\b/i,
    imageIds: ["teacher-speaking", "travel-journey", "digital-laptop"],
  },
  {
    test: /\b(?:friendly|warm|shell-theme-friendly)\b/i,
    imageIds: ["travel-journey", "workplace-team", "forest-climate"],
  },
  {
    test: /\b(?:professional|multicolor|academic|minimal)\b/i,
    imageIds: ["workplace-team", "digital-laptop", "forest-climate"],
  },
]);

const IMAGE_RULES = Object.freeze([
  {
    test: /\b(?:pronunciation|phonetic|stress|intonation|speaking|listening|conversation|communication)\b/i,
    imageIds: ["teacher-speaking", "listening-headphones", "pronunciation-dictionary"],
  },
  {
    test: /\b(?:vocabulary|word formation|collocation|collocations|phrasal|idiom|synonym|antonym|lexical)\b/i,
    imageIds: ["vocab-collocations", "pronunciation-dictionary", "grammar-puzzle"],
  },
  {
    test: /\b(?:reading|passage|skim|skimming|scan|scanning|inference|paraphrase|comprehension|context)\b/i,
    imageIds: ["reading-strategy", "culture-library", "study-roadmap"],
  },
  {
    test: /\b(?:time management|timeline|checklist|review|overview|strategy|strategies|exam|practice|plan|planning|stamina)\b/i,
    imageIds: ["study-roadmap", "exam-practice", "reading-strategy"],
  },
  {
    test: /\b(?:grammar|tense|tenses|conditional|conditionals|passive|relative|reported speech|modal|clause|clauses|transformation|agreement|articles|determiners|question tags|inversion)\b/i,
    imageIds: ["grammar-notes", "grammar-puzzle", "exam-practice"],
  },
  {
    test: /\b(?:technology|artificial intelligence|ai|digital|internet|robot|robotics|innovation|social media|online|cyber|computer)\b/i,
    imageIds: ["digital-laptop", "workplace-team", "reading-strategy"],
  },
  {
    test: /\b(?:environment|climate|forest|deforestation|sustainable|sustainability|pollution|biodiversity|wildlife|ecology)\b/i,
    imageIds: ["forest-climate", "ocean-whale", "study-roadmap"],
  },
  {
    test: /\b(?:health|medicine|medical|hospital|doctor|public health|nutrition|mental health)\b/i,
    imageIds: ["health-clinic", "workplace-team", "study-roadmap"],
  },
  {
    test: /\b(?:travel|tourism|journey|holiday|destination|trip|leisure)\b/i,
    imageIds: ["travel-journey", "study-roadmap", "reading-strategy"],
  },
  {
    test: /\b(?:career|employment|workplace|interview|job|professional|leadership|teamwork)\b/i,
    imageIds: ["workplace-team", "digital-laptop", "study-roadmap"],
  },
  {
    test: /\b(?:culture|language|heritage|globalisation|exchange|literature|reading list)\b/i,
    imageIds: ["culture-library", "reading-strategy", "study-roadmap"],
  },
  {
    test: /\b(?:ocean|sea|marine|underwater|fish|whale)\b/i,
    imageIds: ["ocean-whale", "ocean-school"],
  },
  {
    test: /\b(?:space|planet|solar|galaxy|astronomy|universe)\b/i,
    imageIds: ["space-galaxy", "space-earth", "space-ring"],
  },
]);

const FALLBACK_IMAGE_IDS = Object.freeze([
  "travel-journey",
  "forest-climate",
  "digital-laptop",
  "workplace-team",
  "study-roadmap",
]);

function normalizeSlideImageText(slide, options = {}) {
  const bullets = Array.isArray(slide?.bullets) ? slide.bullets.map((item) => String(item || "")) : [];
  return [
    String(slide?.title || ""),
    ...bullets,
    String(options.topic || ""),
    String(options.deckTitle || ""),
    String(options.themeLabel || ""),
    String(options.themeKey || ""),
  ]
    .join(" \n ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildCandidateImageIds(text) {
  const ordered = [];
  const seen = new Set();
  const push = (id) => {
    if (!id || seen.has(id) || !IMAGE_BY_ID.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  THEME_IMAGE_RULES.forEach((rule) => {
    if (!rule.test.test(text)) return;
    rule.imageIds.forEach(push);
  });
  IMAGE_RULES.forEach((rule) => {
    if (!rule.test.test(text)) return;
    rule.imageIds.forEach(push);
  });
  FALLBACK_IMAGE_IDS.forEach(push);
  return ordered;
}

function pickLibraryEntryById(id) {
  const item = IMAGE_BY_ID.get(id);
  return item ? { ...item } : null;
}

/**
 * @param {any} slide
 * @param {{ count?: number, topic?: string, deckTitle?: string, themeLabel?: string, themeKey?: string, usedImageIds?: Set<string> }} [options]
 * @returns {{ id: string, url: string, alt: string }[]}
 */
export function pickMockImagesForSlide(slide, options = {}) {
  const count = Math.max(1, Math.floor(Number(options.count) || 1));
  const text = normalizeSlideImageText(slide, options);
  const usedImageIds = options.usedImageIds instanceof Set ? options.usedImageIds : new Set();
  const existingImageUrl = String(slide?.imageUrl || "").trim();
  const existingImageAlt = String(slide?.imageAlt || slide?.title || "Slide illustration").trim();
  const candidates = buildCandidateImageIds(text);
  const ranked = candidates
    .map((id) => ({
      id,
      usedPenalty: usedImageIds.has(id) ? 1 : 0,
    }))
    .sort((a, b) => a.usedPenalty - b.usedPenalty)
    .map((item) => item.id);

  const picks = [];
  if (existingImageUrl) {
    picks.push({
      id: `direct:${existingImageUrl}`,
      url: existingImageUrl,
      alt: existingImageAlt,
    });
  }
  for (const id of ranked) {
    const entry = pickLibraryEntryById(id);
    if (!entry) continue;
    if (existingImageUrl && entry.url === existingImageUrl) continue;
    picks.push(entry);
    usedImageIds.add(entry.id);
    if (picks.length >= count) break;
  }

  while (picks.length < count && FALLBACK_IMAGE_IDS.length) {
    const fallbackId = FALLBACK_IMAGE_IDS[picks.length % FALLBACK_IMAGE_IDS.length];
    const fallback = pickLibraryEntryById(fallbackId);
    if (!fallback) break;
    picks.push(fallback);
  }

  return picks;
}

/**
 * @param {any} slide
 * @param {{ topic?: string, deckTitle?: string, themeLabel?: string, themeKey?: string, usedImageIds?: Set<string> }} [options]
 * @returns {any}
 */
export function enrichSlideWithMockImage(slide, options = {}) {
  if (!slide || typeof slide !== "object") return slide;
  if (typeof slide.imageUrl === "string" && slide.imageUrl.trim()) {
    return {
      ...slide,
      imageUrl: slide.imageUrl.trim(),
      imageAlt: String(slide.imageAlt || slide.title || "Slide illustration").trim(),
    };
  }
  const [pick] = pickMockImagesForSlide(slide, options);
  if (!pick) return { ...slide };
  return {
    ...slide,
    imageUrl: pick.url,
    imageAlt: pick.alt,
  };
}

/**
 * @param {any[]} slides
 * @param {{ topic?: string, deckTitle?: string, themeLabel?: string, themeKey?: string }} [options]
 * @returns {any[]}
 */
export function enrichSlidesWithMockImages(slides, options = {}) {
  const usedImageIds = new Set();
  return (Array.isArray(slides) ? slides : []).map((slide) =>
    enrichSlideWithMockImage(slide, { ...options, usedImageIds }),
  );
}
