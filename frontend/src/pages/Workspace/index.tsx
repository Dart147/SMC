import { useState } from "react";
import { Language, Theme, SKELETONS } from "../../features/workspace/constants";
import CodeEditor from "../../features/workspace/components/CodeEditor";
import EditorToolbar from "../../features/workspace/components/EditorToolbar";

export function Workspace() {
  const [language, setLanguage] = useState<Language>("javascript");
  const [theme, setTheme] = useState<Theme>("vs-dark");
  const [code, setCode] = useState<string>(SKELETONS["javascript"]);

  // 當使用者切換語言時，同步切換對應的骨架程式碼
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(SKELETONS[newLang]);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "vs-dark" ? "vs-light" : "vs-dark"));
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 頂部工具列 */}
      <EditorToolbar
        language={language}
        theme={theme}
        onLanguageChange={handleLanguageChange}
        onThemeToggle={handleThemeToggle}
      />

      {/* 編輯器主體 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor
          language={language}
          theme={theme}
          value={code}
          onChange={(val) => setCode(val || "")}
        />
      </div>
    </div>
  );
}
