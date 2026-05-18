import { Problem } from "../../../types/problem";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ProblemDescriptionProps {
  // theme: Theme; // 這裡可以考慮移除，因為我們現在直接交給 Tailwind 的 dark: class 處理
  problem: Problem;
}

// 統一的難易度標籤樣式 (對齊 SubmissionList 的風格)
const getDifficultyBadge = (diff: string) => {
  if (diff === "Easy")
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
  if (diff === "Medium")
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
  return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
};

export function ProblemDescription({ problem }: ProblemDescriptionProps) {
  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* 標題與標籤 */}
      <h1 className="text-2xl font-bold mb-3">{problem.title}</h1>

      <div className="flex gap-2 mb-6">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(problem.difficulty)}`}
        >
          {problem.difficulty}
        </span>
      </div>

      {/* Markdown 渲染區塊 (結合 Tailwind 排版) */}
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-pre:bg-gray-50 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-6 mb-3" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-5 space-y-1" {...props} />,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              return !match ? (
                // 行內程式碼
                <code
                  className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md font-mono text-sm before:content-none after:content-none"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                // 多行程式碼區塊
                <code className={`${className} font-mono text-sm`} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {problem.description}
        </ReactMarkdown>
      </div>
    </div>
  );
}
