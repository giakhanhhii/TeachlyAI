import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__dirname, "..");
const mockDir = path.join(repo, "backend", "mock");
const outPath = path.join(repo, "frontend", "js", "chatbot", "services", "embeddedMockBundles.js");

const quiz = JSON.parse(fs.readFileSync(path.join(mockDir, "quiz_thpt_en.json"), "utf8"));
const flash = JSON.parse(fs.readFileSync(path.join(mockDir, "flashcard_en.json"), "utf8"));
const slide = JSON.parse(fs.readFileSync(path.join(mockDir, "slide_thpt_en.json"), "utf8"));
delete quiz._replace_note;
delete flash._replace_note;
delete slide._replace_note;

const body =
  "/** Synced from backend/mock for offline fetch fallback. */\n" +
  `export const EMBEDDED_QUIZ = ${JSON.stringify({ title: quiz.title, questions: quiz.questions })};\n` +
  `export const EMBEDDED_FLASHCARD = ${JSON.stringify({ title: flash.title, cards: flash.cards })};\n` +
  `export const EMBEDDED_SLIDE = ${JSON.stringify({ title: slide.title, slides: slide.slides })};\n`;

fs.writeFileSync(outPath, body);
console.log("Wrote", outPath, body.length, "bytes");
