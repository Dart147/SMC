import { Language, Theme } from "../constants";

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
  return (
    <header
      style={{
        padding: "10px 16px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        borderBottom: "1px solid #333",
        background: "#252526",
      }}
    >
      <strong style={{ marginRight: "auto" }}>SMC — Workspace</strong>

      <label>
        Language:&nbsp;
        <select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>
      </label>

      <button onClick={onThemeToggle}>
        Toggle theme ({theme === "vs-dark" ? "dark" : "light"})
      </button>
    </header>
  );
}
