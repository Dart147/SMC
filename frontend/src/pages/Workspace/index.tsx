import { useEffect, useState } from "react";
// 引入 V4 最新 API：Group, Panel
import { Panel, Group } from "react-resizable-panels";

import CodeEditor from "../../features/workspace/components/CodeEditor";
import EditorToolbar from "../../features/workspace/components/EditorToolbar";
import { ConsolePanel } from "../../features/workspace/components/ConsolePanel";
import { ProblemDescription } from "../../features/problems/components/ProblemDescription";
import { ResizeHandle } from "../../components/Common/ResizeHandle";
import { Language, Theme, SKELETONS, THEME_CONFIG } from "../../features/workspace/constants";
import { useRunCode } from "../../features/workspace/hooks/useRunCode";
import { useWorkspaceStore } from "../../features/workspace/store";
import { fetchProblemById } from "../../features/problems/api";
import { Problem } from "../../types/problem";

import { useParams, Navigate } from "react-router-dom";

export function Workspace() {
  // 1. 取得網址列上的 problemId
  const { problemId } = useParams<{ problemId: string }>();

  const { code, language, setCode, setLanguage } = useWorkspaceStore();
  const [theme, setTheme] = useState<Theme>("vs-dark");

  // 2. 從後端取得對應的題目
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { runCode, isRunning } = useRunCode(problemId ?? "");

  useEffect(() => {
    if (!problemId) return;
    fetchProblemById(problemId)
      .then(setCurrentProblem)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [problemId]);

  // 3. 錯誤處理：如果題目不存在，跳回列表頁
  if (loading) return <div style={{ padding: "40px", color: "#d4d4d4" }}>Loading...</div>;
  if (notFound || !currentProblem) {
    return <Navigate to="/problems" replace />;
  }

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(SKELETONS[newLang] ?? "");
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "vs-dark" ? "vs-light" : "vs-dark"));
  };

  const colors = THEME_CONFIG[theme];
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: colors.bg, // 全域背景色
        color: colors.text, // 全域文字顏色
        transition: "all 0.2s ease", // 讓切換更滑順
      }}
    >
      {/* 頂部全域導覽列 */}
      <header
        style={{
          height: "50px",
          background: "#252526",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        <strong style={{ color: "#fff", fontSize: "18px" }}>SMC Judge</strong>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button
            style={{
              background: "#2d2d2d",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "4px",
              border: "1px solid #444",
              cursor: "pointer",
            }}
          >
            Run
          </button>
          <button
            onClick={runCode}
            disabled={isRunning}
            style={{
              background: "#22c55e",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "4px",
              border: "none",
              fontWeight: "bold",
              cursor: isRunning ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            {isRunning ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {/* 主體分割區塊 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {/* 外層左右分割：注意這裡改成了 Group 以及 orientation="horizontal" */}
        <Group orientation="horizontal">
          {/* 左半邊：題目描述 */}
          <Panel defaultSize={50} minSize={20}>
            <ProblemDescription theme={theme} problem={currentProblem} />
          </Panel>

          {/* 左右拖拉把手 */}
          <ResizeHandle direction="horizontal" />

          {/* 右半邊：右側內容群組 */}
          <Panel defaultSize={50} minSize={30}>
            {/* 內層上下分割：注意這裡改成了 orientation="vertical" */}
            <Group orientation="vertical">
              {/* 右上：程式碼編輯器 */}
              <Panel
                defaultSize={70}
                minSize={20}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <EditorToolbar
                  language={language}
                  theme={theme}
                  onLanguageChange={handleLanguageChange}
                  onThemeToggle={handleThemeToggle}
                />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor
                    language={language}
                    theme={theme}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                  />
                </div>
              </Panel>

              {/* 上下拖拉把手 */}
              <ResizeHandle direction="vertical" />

              {/* 右下：測試案例與主控台 */}
              <Panel defaultSize={30} minSize={10}>
                <ConsolePanel theme={theme} />
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
