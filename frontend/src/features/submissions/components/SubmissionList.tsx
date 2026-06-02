import React, { useState } from "react";
import { Submission } from "../../../types/submission";
<<<<<<< HEAD
import ReportModal from "../../../components/Common/ReportModal";
=======
>>>>>>> feat/SonarQube-code-check

interface Props {
  submissions: Submission[];
  isLoading?: boolean;
}

export const SubmissionList: React.FC<Props> = ({ submissions, isLoading }) => {
<<<<<<< HEAD
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

=======
  // 💡 新增狀態：記錄目前哪一筆 Submission 的 ID 被展開了 (null 代表全收合)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 💡 切換展開/收合的函式
  const toggleExpand = (id: string) => {
    // 如果點擊的是已經展開的行，就收合 (設為 null)；否則展開該行
    setExpandedId(expandedId === id ? null : id);
  };

  // 載入中畫面
>>>>>>> feat/SonarQube-code-check
  if (isLoading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 animate-pulse">
        <svg className="w-6 h-6 mr-3 animate-spin" viewBox="0 0 24 24">
<<<<<<< HEAD
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
=======
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
>>>>>>> feat/SonarQube-code-check
        </svg>
        Loading submissions...
      </div>
    );
  }

<<<<<<< HEAD
=======
  // 空資料畫面
>>>>>>> feat/SonarQube-code-check
  if (!submissions || submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No submissions yet. Write some code and submit!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => {
        const isAccepted = submission.status === "Accepted";
        const isPending = submission.status === "Pending";
        const isError = ["Runtime Error", "Compile Error"].includes(submission.status);
<<<<<<< HEAD
=======

        // 💡 判斷當前這筆是否處於「展開狀態」
>>>>>>> feat/SonarQube-code-check
        const isExpanded = expandedId === submission.id;

        const statusColor = isAccepted
          ? "text-green-500"
          : isPending
            ? "text-gray-500"
            : "text-red-500";

        return (
          <div
            key={submission.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 overflow-hidden transition-all duration-200"
          >
<<<<<<< HEAD
            {/* 摘要行 */}
            <div 
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default"
              onClick={() => toggleExpand(submission.id)}
            >
              <div className="flex items-center space-x-6">
                {/* 狀態文字：點擊開啟詳細報告彈窗 */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation(); // 防止觸發父層的 toggleExpand
                    setReportId(submission.id);
                  }}
                  className={`font-bold w-32 ${statusColor} flex items-center gap-2 cursor-pointer hover:underline underline-offset-4 decoration-2 group`}
                  title="View detailed analysis report"
                >
                  {isPending && <span className="w-2 h-2 bg-gray-400 rounded-full animate-ping" />}
                  {submission.status}
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    REPORT
                  </span>
                </div>

                {/* 題目資訊 */}
                <div className="flex flex-col">
=======
            {/* ========================================== */}
            {/* 1. 摘要行 (點擊這裡可以切換展開/收合) */}
            {/* ========================================== */}
            <div
              onClick={() => toggleExpand(submission.id)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-6">
                {/* 狀態大字 */}
                <div className={`font-bold w-32 ${statusColor} flex items-center gap-2`}>
                  {isPending && <span className="w-2 h-2 bg-gray-400 rounded-full animate-ping" />}
                  {submission.status}
                </div>

                {/* 題目與語言資訊 */}
                <div className="flex flex-col">
                  {/* 💡 注意：目前後端只回傳 ProblemID，所以這裡先顯示 ID。如果你之後後端有 Join 題目名稱，可以換成 submission.problemTitle */}
>>>>>>> feat/SonarQube-code-check
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    Problem {submission.problemId}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
<<<<<<< HEAD
                    {submission.language} • Click for details
=======
                    {submission.language} • {new Date().toLocaleTimeString()}{" "}
                    {/* 這裡可換成真實的 created_at */}
>>>>>>> feat/SonarQube-code-check
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
<<<<<<< HEAD
                {!isPending && !isError && (
                  <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <span className={isAccepted ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
=======
                {/* 測資通過比例 */}
                {!isPending && !isError && (
                  <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <span
                      className={isAccepted ? "text-green-500 font-bold" : "text-red-500 font-bold"}
                    >
>>>>>>> feat/SonarQube-code-check
                      {submission.passedTestCases}
                    </span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {submission.totalTestCases}
                    </span>
                  </div>
                )}

<<<<<<< HEAD
=======
                {/* 展開/收合的小箭頭 Icon */}
>>>>>>> feat/SonarQube-code-check
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
<<<<<<< HEAD
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
=======
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
>>>>>>> feat/SonarQube-code-check
                </svg>
              </div>
            </div>

<<<<<<< HEAD
            {/* 詳細內容區塊 */}
            {isExpanded && (
              <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
=======
            {/* ========================================== */}
            {/* 2. 詳細內容 (只有 isExpanded 為 true 才會渲染) */}
            {/* ========================================== */}
            {isExpanded && (
              <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                {/* Runtime Error / Compile Error 區塊 */}
>>>>>>> feat/SonarQube-code-check
                {isError && submission.error && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-red-500">Error Log</h3>
                    <pre className="p-4 overflow-x-auto text-sm text-red-400 bg-red-50 rounded-md dark:bg-red-900/20 whitespace-pre-wrap font-mono border border-red-100 dark:border-red-900/30">
                      {submission.error}
                    </pre>
                  </div>
                )}

<<<<<<< HEAD
=======
                {/* Wrong Answer 區塊 (你的與預期的 Output 對比) */}
>>>>>>> feat/SonarQube-code-check
                {submission.status === "Wrong Answer" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-red-500">Your Output</h3>
                      <pre className="p-3 overflow-x-auto text-sm bg-white rounded-md dark:bg-gray-900 font-mono text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-inner">
                        {submission.output || "No output"}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-green-500">Expected Output</h3>
                      <pre className="p-3 overflow-x-auto text-sm bg-white rounded-md dark:bg-gray-900 font-mono text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-inner">
                        {submission.expectedOutput}
                      </pre>
                    </div>
                  </div>
                )}

<<<<<<< HEAD
                {isAccepted && (
                  <div className="text-sm text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All test cases passed successfully!
=======
                {/* Accepted 區塊 */}
                {isAccepted && (
                  <div className="text-sm text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    All test cases passed successfully! You are awesome!
>>>>>>> feat/SonarQube-code-check
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
<<<<<<< HEAD

      {/* 報告分析彈窗 */}
      {reportId && (
        <ReportModal 
          submissionId={reportId} 
          onClose={() => setReportId(null)} 
        />
      )}
    </div>
  );
};
=======
    </div>
  );
};
>>>>>>> feat/SonarQube-code-check
