import { Language, Theme, THEME_CONFIG } from "../constants";

interface EditorToolbarProps {
  language: Language;
  theme: Theme;
  onLanguageChange: (lang: Language) => void;
  onThemeToggle: () => void;
}

export default function EditorToolbar({
  language,
  theme,
  onLanguageChange,
  onThemeToggle,
}: EditorToolbarProps) {
  // 取得目前主題的色彩設定
  const colors = THEME_CONFIG[theme];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        background: colors.headerBg,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text, // 🌟 關鍵：讓文字顏色跟隨主題變化
        fontSize: "14px",
        transition: "all 0.2s ease",
      }}
    >
      {/* 移除寫死的 color: "white" 或 #fff，統一使用 colors.text */}
      <strong style={{ marginRight: "auto", color: colors.text }}>SMC — Workspace</strong>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ color: colors.text }}>Language:</label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          style={{
            background: colors.secondaryBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            padding: "4px 8px",
            borderRadius: "4px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>

        <button
          onClick={onThemeToggle}
          style={{
            background: colors.secondaryBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            padding: "4px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.border)}
          onMouseLeave={(e) => (e.currentTarget.style.background = colors.secondaryBg)}
        >
          Toggle theme ({theme === "vs-dark" ? "dark" : "light"})
        </button>
      </div>
    </div>
  );
}
