export type Language = "javascript" | "python" | "go" | "c" | "cpp";
export type Theme = "vs-dark" | "vs-light";

export const SKELETONS: Record<Language, string> = {
  javascript: `// write JavaScript here\nfunction hello() {\n  return "hi";\n}\n`,
  python: `# write Python here\ndef hello():\n    return "hi"\n`,
  go: `package main\n\nfunc hello() string {\n\treturn "hi"\n}\n`,
  c: `// write C here\n#include <stdio.h>\n\nint main() {\n    printf("hi\\n");\n    return 0;\n}\n`,
  cpp: `// write C++ here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "hi" << endl;\n    return 0;\n}\n`,
};

export const THEME_CONFIG = {
  "vs-dark": {
    bg: "#1e1e1e",
    headerBg: "#252526",
    text: "#d4d4d4",
    border: "#333",
    secondaryBg: "#2d2d2d",
    accent: "#007acc"
  },
  "vs-light": {
    bg: "#ffffff",
    headerBg: "#f3f3f3",
    text: "#333333",
    border: "#cccccc",
    secondaryBg: "#f0f0f0",
    accent: "#005fb8"
  }
};