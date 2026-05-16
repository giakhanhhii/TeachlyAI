import { init } from "./chatController.js";

void init().catch((err) => {
  console.error("[chatController] init failed", err);
});
