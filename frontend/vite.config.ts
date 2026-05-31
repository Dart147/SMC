import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom", // 啟用瀏覽器模擬
    setupFiles: "./vitest.setup.ts", // 載入剛剛建好的 setup 檔
  },
  server: {
    host: true,
    port: 5173,
  },
});
