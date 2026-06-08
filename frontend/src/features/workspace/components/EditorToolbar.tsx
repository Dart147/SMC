import { Language, Theme, THEME_CONFIG } from "../constants";

interface EditorToolbarProps {
  readonly language: Language;
  readonly theme: Theme;
  readonly onLanguageChange: (lang: Language) => void;
}

export default function EditorToolbar({ language, theme, onLanguageChange }: EditorToolbarProps) {
  const colors = THEME_CONFIG[theme];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 14px",
        background: colors.headerBg,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: "12px",
        gap: "8px",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          color: colors.text,
          opacity: 0.45,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "10px",
        }}
      >
        Language
      </span>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        style={{
          background: colors.secondaryBg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          padding: "3px 8px",
          borderRadius: "5px",
          outline: "none",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 500,
          transition: "background 0.15s",
        }}
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="go">Go</option>
        <option value="c">C</option>
        <option value="cpp">C++</option>
      </select>
    </div>
  );
}
