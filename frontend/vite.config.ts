import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",

    // 🌟 關鍵在這裡！把 exclude 加在 test 的第一層 🌟
    // 使用 configDefaults.exclude 可以保留 Vitest 預設要排除的 node_modules 等資料夾
    exclude: [
      ...configDefaults.exclude,
      "tests/**/*", // 拒絕 Vitest 進入 Playwright 的地盤！
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/App.tsx",
        "src/**/*.spec.{ts,tsx}",
        "src/types/**/*",
        "src/vite-env.d.ts",
      ],
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
