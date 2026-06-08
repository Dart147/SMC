import { useEffect, useState } from "react";
import { Panel, Group } from "react-resizable-panels";

import CodeEditor from "../../features/workspace/components/CodeEditor";
import EditorToolbar from "../../features/workspace/components/EditorToolbar";
import { ConsolePanel } from "../../features/workspace/components/ConsolePanel";
import { ProblemDescription } from "../../features/problems/components/ProblemDescription";
import { ResizeHandle } from "../../components/Common/ResizeHandle";
import { Language, Theme as EditorTheme, SKELETONS } from "../../features/workspace/constants";
import { useRunCode } from "../../features/workspace/hooks/useRunCode";
import { useRunSample } from "../../features/workspace/hooks/useRunSample";
import { useWorkspaceStore } from "../../features/workspace/store";
import { fetchProblemById } from "../../features/problems/api";
import { Problem } from "../../types/problem";
import { useTheme } from "../../contexts/ThemeContext";

import { apiClient } from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";

import { useParams, Navigate } from "react-router-dom";

export function Workspace() {
  const { problemId } = useParams<{ problemId: string }>();

  const { code, language, setCode, setLanguage, setResult } = useWorkspaceStore();

  const { theme: globalTheme } = useTheme();
  const editorTheme: EditorTheme = globalTheme === "dark" ? "vs-dark" : "vs-light";

  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const { runCode, isRunning } = useRunCode(problemId ?? "");
  const { runSample, isRunSample } = useRunSample(problemId ?? "");
  const debouncedCode = useDebounce(code, 500);

  useEffect(() => {
    if (!problemId) return;

    const initWorkspace = async () => {
      setLoading(true);
      setIsInitializing(true);
      setResult(null);

      try {
        const problemData = await fetchProblemById(problemId);
        setCurrentProblem(problemData);

        const savedLang = localStorage.getItem(`smc_lang_${problemId}`) as Language | null;
        const targetLang = savedLang || "python";
        const savedCode = localStorage.getItem(`smc_draft_${problemId}_${targetLang}`);

        if (savedCode) {
          setLanguage(targetLang);
          setCode(savedCode);
        } else {
          try {
            const response = await apiClient.get(`/submissions/latest`, {
              params: { problemId },
            });
            const latestSub = response.data;

            if (latestSub && latestSub.code) {
              setLanguage(latestSub.language);
              setCode(latestSub.code);
              localStorage.setItem(`smc_lang_${problemId}`, latestSub.language);
              localStorage.setItem(`smc_draft_${problemId}_${latestSub.language}`, latestSub.code);
            } else {
              setLanguage(targetLang);
              setCode(SKELETONS[targetLang] ?? "");
            }
          } catch {
            setLanguage(targetLang);
            setCode(SKELETONS[targetLang] ?? "");
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initWorkspace();
  }, [problemId]);

  useEffect(() => {
    if (!loading && !isInitializing && problemId && code === debouncedCode) {
      localStorage.setItem(`smc_draft_${problemId}_${language}`, debouncedCode);
    }
  }, [debouncedCode, code, language, problemId, loading, isInitializing]);

  if (loading || isInitializing) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950 text-slate-400 text-sm gap-2 font-sans">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>Loading workspace...</span>
      </div>
    );
  }

  if (notFound || !currentProblem) {
    return <Navigate to="/problems" replace />;
  }

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem(`smc_lang_${problemId}`, newLang);
    const existingDraft = localStorage.getItem(`smc_draft_${problemId}_${newLang}`);
    setCode(existingDraft || SKELETONS[newLang] || "");
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col font-sans bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Workspace sub-header */}
      <header className="h-11 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-5 transition-colors duration-200">
        <strong className="text-gray-600 dark:text-slate-400 text-xs font-semibold tracking-tight select-none uppercase">
          Workspace
        </strong>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={runSample}
            disabled={isRunSample || isRunning}
            className={`text-xs font-semibold px-3 py-1 rounded-md border transition-all cursor-pointer ${
              isRunSample || isRunning
                ? "bg-gray-100 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {isRunSample ? "Running..." : "Run"}
          </button>

          <button
            onClick={runCode}
            disabled={isRunning}
            className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
              isRunning
                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/20"
            }`}
          >
            {isRunning ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 min-h-0">
        <Group orientation="horizontal">
          {/* Left: problem description */}
          <Panel defaultSize={50} minSize={20}>
            <ProblemDescription problem={currentProblem} />
          </Panel>

          <ResizeHandle direction="horizontal" />

          {/* Right: editor + console */}
          <Panel defaultSize={50} minSize={30}>
            <Group orientation="vertical">
              <Panel
                defaultSize={70}
                minSize={20}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <EditorToolbar
                  language={language}
                  theme={editorTheme}
                  onLanguageChange={handleLanguageChange}
                />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor
                    language={language}
                    theme={editorTheme}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                  />
                </div>
              </Panel>

              <ResizeHandle direction="vertical" />

              <Panel defaultSize={30} minSize={10}>
                <ConsolePanel
                  theme={editorTheme}
                  sampleTestCase={currentProblem?.testCases?.[0]}
                  onRun={runSample}
                  isRunSample={isRunSample}
                />
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
