import Editor from "@monaco-editor/react";
import { Language, Theme } from "../constants";

interface CodeEditorProps {
  language: Language;
  theme: Theme;
  value: string;
  onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ language, theme, value, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      // 你在 POC 中寫的 path 屬性非常棒！這能讓 Monaco 知道語言切換了，從而重置語法解析器
      path={`solution.${language}`}
      value={value}
      theme={theme}
      onChange={onChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 4,
      }}
    />
  );
}
