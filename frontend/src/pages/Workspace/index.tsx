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

import { apiClient } from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";

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
  const [isInitializing, setIsInitializing] = useState(true); // 🌟 新增：控制編輯器草稿載入狀態

  const { runCode, isRunning } = useRunCode(problemId ?? "");
  const debouncedCode = useDebounce(code, 500); // 🌟 新增：對程式碼進行防抖動處理

  // 3. 初始化題目資料 + 三段式回復機制
  useEffect(() => {
    if (!problemId) return;

    const initWorkspace = async () => {
      setLoading(true);
      setIsInitializing(true);

      try {
        // A. 抓取題目基本描述
        const problemData = await fetchProblemById(problemId);
        setCurrentProblem(problemData);

        // B. 執行草稿水合 (Hydration) 邏輯
        // 第一道防線：檢查 LocalStorage 是否有上次選擇的語言與草稿
        const savedLang = localStorage.getItem(`smc_lang_${problemId}`) as Language | null;
        const targetLang = savedLang || "python"; // 預設使用 python

        const savedCode = localStorage.getItem(`smc_draft_${problemId}_${targetLang}`);

        if (savedCode) {
          // LocalStorage 有資料，直接完美還原
          setLanguage(targetLang);
          setCode(savedCode);
        } else {
          // 第二道防線：LocalStorage 被清空，向後端 DB 請求最後一次的 Submission 紀錄
          try {
            const response = await apiClient.get(`/submissions/latest`, {
              params: { problemId },
            });
            const latestSub = response.data;

            if (latestSub && latestSub.code) {
              // DB 撈到歷史紀錄！同步至全域與本地暫存
              setLanguage(latestSub.language);
              setCode(latestSub.code);
              localStorage.setItem(`smc_lang_${problemId}`, latestSub.language);
              localStorage.setItem(`smc_draft_${problemId}_${latestSub.language}`, latestSub.code);
            } else {
              // 第三道防線：無任何歷史紀錄，載入全新題目預設模板
              setLanguage(targetLang);
              setCode(SKELETONS[targetLang] ?? "");
            }
          } catch (apiErr) {
            // 如果後端回傳 404 或連線異常，直接退回第三道防線
            setLanguage(targetLang);
            setCode(SKELETONS[targetLang] ?? "");
          }
        }
      } catch (error) {
        setNotFound(true);
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initWorkspace();
  }, [problemId]);

  // 4. debouncedCode 改變時，自動寫入 LocalStorage（過濾掉初始化階段）
  // 4. 🌟 當 debouncedCode 改變時，自動寫入 LocalStorage（過濾掉初始化階段與時間差）
  useEffect(() => {
    // 💡 新增 code === debouncedCode 的判斷
    // 這樣可以確保 debouncedCode 已經「追上」最新的 code，避免把延遲的舊狀態寫入覆蓋掉
    if (!loading && !isInitializing && problemId && code === debouncedCode) {
      localStorage.setItem(`smc_draft_${problemId}_${language}`, debouncedCode);
    }
  }, [debouncedCode, code, language, problemId, loading, isInitializing]);

  // 5. 錯誤處理：如果題目不存在，跳回列表頁
  if (loading || isInitializing) {
    return (
      <div
        style={{
          padding: "40px",
          color: "#d4d4d4",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div className="animate-spin">⏳</div>
        <span>正在載入工作區並回復程式碼狀態...</span>
      </div>
    );
  }

  if (notFound || !currentProblem) {
    return <Navigate to="/problems" replace />;
  }

  // 6. 切換語言時的處理：優先找尋該語言是否有 LocalStorage 草稿
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem(`smc_lang_${problemId}`, newLang);

    const existingDraft = localStorage.getItem(`smc_draft_${problemId}_${newLang}`);
    setCode(existingDraft || SKELETONS[newLang] || "");
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
            <ProblemDescription problem={currentProblem} />
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
