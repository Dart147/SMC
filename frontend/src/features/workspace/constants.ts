export type Language = "javascript" | "python" | "go" | "c" | "cpp";
export type Theme = "vs-dark" | "vs-light";

export const SKELETONS: Record<Language, string> = {
  javascript: `// write JavaScript here\nfunction hello() {\n  return "hi";\n}\n`,
  python: `# write Python here\ndef hello():\n    return "hi"\n`,
  go: `package main\n\nfunc hello() string {\n\treturn "hi"\n}\n`,
  c: `// write C here\n#include <stdio.h>\n\nint main() {\n    printf("hi\\n");\n    return 0;\n}\n`,
  cpp: `// write C++ here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "hi" << endl;\n    return 0;\n}\n`,
};
