import { Theme, THEME_CONFIG } from "../../workspace/constants";
import { Problem } from "../../../types/problem";
// 引入 Markdown 相關套件
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
// 必須引入 KaTeX 的 CSS，數學公式才會排版正確！
import "katex/dist/katex.min.css";

interface ProblemDescriptionProps {
  theme: Theme;
  problem: Problem;
}

export function ProblemDescription({ theme, problem }: ProblemDescriptionProps) {
  const colors = THEME_CONFIG[theme];

  const tagBg = theme === "vs-dark" ? "#166534" : "#dcfce7";
  const difficultyColor =
    problem.difficulty === "Easy"
      ? "#4ade80"
      : problem.difficulty === "Medium"
        ? "#fbbf24"
        : "#f87171";

  // 決定行內程式碼與區塊的底色
  const codeBg = theme === "vs-dark" ? "#333333" : "#e5e5e5";
  const preBg = colors.secondaryBg;

  return (
    <div
      style={{
        padding: "20px 24px",
        height: "100%",
        overflowY: "auto",
        background: colors.bg,
        color: colors.text,
        transition: "all 0.2s ease",
      }}
    >
      {/* 標題與標籤 */}
      <h1 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px", color: colors.text }}>
        {problem.title}
      </h1>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <span
          style={{
            color: difficultyColor,
            background: tagBg,
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {problem.difficulty}
        </span>
      </div>

      {/* Markdown 渲染區塊 */}
      <div
        className="markdown-body"
        style={{
          lineHeight: "1.6",
          fontSize: "15px",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // 自定義 <h3> 標題樣式 (對應 ### Example)
            h3: ({ node, ...props }) => (
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginTop: "24px",
                  marginBottom: "12px",
                }}
                {...props}
              />
            ),
            // 自定義 <ul> 列表樣式 (對應 Constraints)
            ul: ({ node, ...props }) => (
              <ul style={{ margin: "0 0 20px 20px", padding: 0, lineHeight: "1.8" }} {...props} />
            ),
            // 🌟 最關鍵：自定義 <code> 標籤，讓它能跟著主題變換底色
            code: ({ className, children, ...props }) => {
              // 檢查是不是被 <pre> 包起來的多行程式碼
              const match = /language-(\w+)/.exec(className || "");
              return !match ? (
                // 行內程式碼 (如 `nums`)
                <code
                  style={{
                    background: codeBg,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "0.9em",
                  }}
                  {...props}
                >
                  {children}
                </code>
              ) : (
                // 多行程式碼區塊
                <code
                  className={className}
                  style={{ fontFamily: "monospace", fontSize: "14px" }}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            // 自定義 <pre> 標籤 (對應多行程式碼區塊的外框)
            pre: ({ node, ...props }) => (
              <pre
                style={{
                  background: preBg,
                  padding: "16px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.border}`,
                  overflowX: "auto",
                  marginTop: "8px",
                  marginBottom: "16px",
                }}
                {...props}
              />
            ),
          }}
        >
          {problem.description}
        </ReactMarkdown>
      </div>
    </div>
  );
}
