import React from "react";
import { Problem } from "../../../types/problem";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ProblemDescriptionProps {
  readonly problem: Problem;
}

const getDifficultyBadge = (diff: string) => {
  if (diff === "Easy")
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
  if (diff === "Medium")
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
  return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
};

/** Recursively extract plain text from React nodes */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

/** Parse an Input/Output/Explanation block without ReDoS-prone regex */
function parseExampleRaw(raw: string): {
  input: string;
  output: string;
  explanation: string | null;
} | null {
  type Section = "input" | "output" | "explanation";
  let section: Section | null = null;
  const buckets: Record<Section, string[]> = { input: [], output: [], explanation: [] };

  for (const line of raw.split("\n")) {
    if (/^Input:/.exec(line)) {
      section = "input";
      const rest = line.slice("Input:".length).trimStart();
      if (rest) buckets.input.push(rest);
    } else if (/^Output:/.exec(line)) {
      section = "output";
      const rest = line.slice("Output:".length).trimStart();
      if (rest) buckets.output.push(rest);
    } else if (/^Explanation:/.exec(line)) {
      section = "explanation";
      const rest = line.slice("Explanation:".length).trimStart();
      if (rest) buckets.explanation.push(rest);
    } else if (section !== null) {
      buckets[section].push(line);
    }
  }

  if (buckets.input.length === 0 || buckets.output.length === 0) return null;

  return {
    input: buckets.input.join("\n").trim(),
    output: buckets.output.join("\n").trim(),
    explanation: buckets.explanation.length > 0 ? buckets.explanation.join("\n").trim() : null,
  };
}

/** Render a polished Input / Output example card */
function ExampleBlock({ raw }: { readonly raw: string }) {
  const parsed = parseExampleRaw(raw);
  if (!parsed) return null;

  const { input: inputVal, output: outputVal, explanation } = parsed;

  return (
    <div className="my-3 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-slate-700">
        {/* Input panel */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-gray-200 dark:border-slate-700">
            <svg
              className="w-3 h-3 text-indigo-500 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Input
            </span>
          </div>
          <pre className="m-0 px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 whitespace-pre-wrap flex-1">
            {inputVal}
          </pre>
        </div>

        {/* Output panel */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-gray-200 dark:border-slate-700">
            <svg
              className="w-3 h-3 text-emerald-500 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Output
            </span>
          </div>
          <pre className="m-0 px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 whitespace-pre-wrap flex-1">
            {outputVal}
          </pre>
        </div>
      </div>

      {/* Explanation row (optional) */}
      {explanation && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-t border-gray-200 dark:border-slate-700">
          <svg
            className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-[0.78rem] text-amber-700 dark:text-amber-300 leading-relaxed">
            {explanation}
          </span>
        </div>
      )}
    </div>
  );
}

// Markdown component renderers defined at module level to avoid re-definition on each render
/* eslint-disable @typescript-eslint/no-explicit-any */
const markdownComponents = {
  h3: ({ node: _node, ...props }: any) => (
    <h3
      className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-7 mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800"
      {...props}
    />
  ),
  ol: ({ node: _node, ...props }: any) => (
    <ol className="list-decimal ml-5 mb-4 space-y-1" {...props} />
  ),
  ul: ({ node: _node, ...props }: any) => (
    <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />
  ),
  code: ({ node: _node, className, children, ...props }: any) => {
    const isBlock = /language-(\w+)/.exec(className ?? "");
    if (isBlock) {
      return (
        <code className={`${className} font-mono text-[0.78rem]`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono text-[0.82em] before:content-none after:content-none"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => {
    const raw = extractText(children).trim();
    if (raw.includes("Input:") && raw.includes("Output:")) {
      return <ExampleBlock raw={raw} />;
    }
    return (
      <pre className="my-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 overflow-x-auto font-mono text-[0.82rem] leading-relaxed text-gray-800 dark:text-slate-200">
        {children}
      </pre>
    );
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ProblemDescription({ problem }: ProblemDescriptionProps) {
  return (
    <div className="font-sans p-6 h-full overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Title */}
      <h1 className="text-xl font-bold mb-2 leading-snug tracking-tight text-gray-900 dark:text-gray-50">
        {problem.title}
      </h1>

      {/* Difficulty badge */}
      <div className="flex gap-2 mb-6">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(problem.difficulty)}`}
        >
          {problem.difficulty}
        </span>
      </div>

      {/* Markdown body */}
      <div
        className="
          prose prose-sm dark:prose-invert max-w-none
          prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed
          prose-ul:my-2 prose-ol:my-2
          prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100
          prose-em:text-gray-500 dark:prose-em:text-gray-400
          prose-code:before:content-none prose-code:after:content-none
          prose-code:font-mono
        "
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {problem.description}
        </ReactMarkdown>
      </div>
    </div>
  );
}
