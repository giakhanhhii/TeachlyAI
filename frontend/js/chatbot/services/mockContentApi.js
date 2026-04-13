import { getApiOrigin } from "../config.js";

/** @typedef {'quiz' | 'flashcard' | 'slide'} MockResource */

/** Dùng khi không gọi được API (file:// hoặc server chưa bật). */
export const FALLBACK_QUIZ = {
  title: "Ôn tập Tiếng Anh Nâng cao",
  questions: [
    {
      id: "fb1",
      text: "Had I known about the severe weather warning, I _______ my flight to London.",
      options: ["cancelled", "would have cancelled", "would cancel", "will cancel"],
      correctIndex: 1,
      hint: "Had I known → If I had known (điều kiện III).",
    },
  ],
};

export const FALLBACK_FLASHCARD = {
  title: "Từ vựng quan trọng (Offline)",
  cards: [
    { id: "fb1", front: "allocate", phonetic: "/ˈæləkeɪt/", back: "phân bổ", hint: "Động từ trang trọng: allocate resources to..." },
    { id: "fb2", front: "curriculum", phonetic: "/kəˈrɪkjələm/", back: "chương trình học", hint: "Hay gặp trong đoạn về giáo dục." },
    { id: "fb3", front: "abandon", phonetic: "/əˈbændən/", back: "từ bỏ", hint: "" },
    { id: "fb4", front: "meticulous", phonetic: "/məˈtɪkjələs/", back: "tỉ mỉ", hint: "" },
  ],
};

export const FALLBACK_SLIDE = {
  title: "Slide (offline)",
  slides: [
    { id: "fb1", title: "Giới thiệu", bullets: ["Nội dung mẫu khi chưa có API."] },
  ],
};

/**
 * @param {MockResource} name
 * @returns {Promise<any>}
 */
export async function fetchMockResource(name) {
  try {
    const url = `${getApiOrigin()}/api/mock/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    if (name === "quiz") return { ...FALLBACK_QUIZ };
    if (name === "flashcard") return { ...FALLBACK_FLASHCARD };
    if (name === "slide") return { ...FALLBACK_SLIDE };
    throw new Error(`Unknown mock: ${name}`);
  }
}
