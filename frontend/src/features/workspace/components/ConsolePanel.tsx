import { useState, useEffect } from "react";
import { Theme, THEME_CONFIG } from "../constants";
import { useWorkspaceStore } from "../store";

interface ConsolePanelProps {
  theme: Theme;
}

const STATUS_COLORS: Record<string, string> = {
  Accepted: "#22c55e",
  "Wrong Answer": "#ef4444",
  "Runtime Error": "#ef4444",
  "Compile Error": "#ef4444",
  "Time Limit Exceeded": "#f59e0b",
  "Memory Limit Exceeded": "#f59e0b",
  Pending: "#9ca3af",
};

export function ConsolePanel({ theme }: ConsolePanelProps) {
  const colors = THEME_CONFIG[theme];
  const { result } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<"testcases" | "result">("testcases");

  // Switch to result tab automatically when a result arrives
  useEffect(() => {
    if (result) setActiveTab("result");
  }, [result]);

  const statusColor = result ? (STATUS_COLORS[result.status] ?? "#9ca3af") : "#9ca3af";

  return (
    <div
      style={{
        height: "100%",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
      }}
    >
      {/* Tabs */}
      <div
        style={{
          padding: "8px 16px",
          background: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: "13px",
          display: "flex",
          gap: "16px",
        }}
      >
        <span
          onClick={() => setActiveTab("testcases")}
          style={{
            color: activeTab === "testcases" ? colors.text : "#888",
            cursor: "pointer",
            borderBottom: activeTab === "testcases" ? `2px solid ${colors.text}` : "2px solid transparent",
            paddingBottom: "2px",
          }}
        >
          Testcases
        </span>
        <span
          onClick={() => setActiveTab("result")}
          style={{
            color: activeTab === "result" ? colors.text : "#888",
            cursor: "pointer",
            borderBottom: activeTab === "result" ? `2px solid ${colors.text}` : "2px solid transparent",
            paddingBottom: "2px",
          }}
        >
          Test Result
          {result && (
            <span
              style={{
                marginLeft: "6px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
          )}
        </span>
      </div>

      {/* Tab content */}
      <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
        {activeTab === "testcases" && (
          <>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>nums =</div>
              <div style={{ background: colors.secondaryBg, padding: "8px", borderRadius: "4px", fontFamily: "monospace" }}>
                [2,7,11,15]
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>target =</div>
              <div style={{ background: colors.secondaryBg, padding: "8px", borderRadius: "4px", fontFamily: "monospace" }}>
                9
              </div>
            </div>
          </>
        )}

        {activeTab === "result" && !result && (
          <div style={{ color: "#888", fontSize: "13px" }}>
            Submit your code to see results.
          </div>
        )}

        {activeTab === "result" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: statusColor }}>
                {result.status}
              </span>
              {result.totalTestCases > 0 && (
                <span style={{ fontSize: "13px", color: "#888" }}>
                  {result.passedTestCases}/{result.totalTestCases} test cases passed
                </span>
              )}
            </div>

            {/* Actual vs Expected output */}
            {result.output !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Your output</div>
                <pre
                  style={{
                    background: colors.secondaryBg,
                    padding: "8px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {result.output === "" ? "(empty)" : result.output}
                </pre>
              </div>
            )}
            {result.expectedOutput && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Expected output</div>
                <pre
                  style={{
                    background: colors.secondaryBg,
                    padding: "8px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {result.expectedOutput}
                </pre>
              </div>
            )}

            {/* Error message */}
            {result.error && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Error</div>
                <pre
                  style={{
                    background: colors.secondaryBg,
                    padding: "8px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    color: "#ef4444",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {result.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
