/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // 👉 加上這行！代表我們要用 class 來手動切換深淺色
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"), // 確保你剛剛有加這個 plugin
  ],
};
