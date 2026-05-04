import { useState } from 'react';
import Editor from '@monaco-editor/react';

type Language = 'javascript' | 'python' | 'go' | 'c' | 'cpp';
type Theme = 'vs-dark' | 'vs-light';

const SKELETONS: Record<Language, string> = {
  javascript: `// write JavaScript here
function hello() {
  return "hi";
}
`,
  python: `# write Python here
def hello():
    return "hi"
`,
  go: `package main

func hello() string {
\treturn "hi"
}
`,
  c: `// write C here
#include <stdio.h>

int main() {
    printf("hi\\n");
    return 0;
}
`,
  cpp: `// write C++ here
#include <iostream>
using namespace std;

int main() {
    cout << "hi" << endl;
    return 0;
}
`,
};

export default function App() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [theme, setTheme] = useState<Theme>('vs-dark');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '10px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderBottom: '1px solid #333',
          background: '#252526',
        }}
      >
        <strong style={{ marginRight: 'auto' }}>Online Code Test — editor POC</strong>
        <label>
          Language:&nbsp;
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </label>
        <button onClick={() => setTheme((t) => (t === 'vs-dark' ? 'vs-light' : 'vs-dark'))}>
          Toggle theme ({theme === 'vs-dark' ? 'dark' : 'light'})
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          path={`solution.${language}`}
          defaultValue={SKELETONS[language]}
          theme={theme}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
}
