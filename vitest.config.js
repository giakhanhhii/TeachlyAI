import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/frontend/**/*.test.js"],
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:4173/chatbot_ui.html",
      },
    },
    restoreMocks: true,
    clearMocks: true,
  },
});
