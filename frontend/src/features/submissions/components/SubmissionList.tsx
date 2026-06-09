import React, { useState } from "react";
import { Submission } from "../../../types/submission";
import ReportModal from "../../../components/Common/ReportModal";

interface Props {
  submissions: Submission[];
  isLoading?: boolean;
}

export const SubmissionList: React.FC<Props> = ({ submissions, isLoading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-slate-500 text-sm gap-2">
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
        Loading submissions...
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-slate-500 text-sm">
        No submissions yet. Write some code and submit!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((submission) => {
        const isAccepted = submission.status === "Accepted";
        const isPending = submission.status === "Pending";
        const isError = ["Runtime Error", "Compile Error"].includes(submission.status);
        const isExpanded = expandedId === submission.id;

        const statusColor = isAccepted
          ? "text-emerald-600 dark:text-emerald-400"
          : isPending
            ? "text-gray-500 dark:text-slate-400"
            : "text-red-600 dark:text-red-400";

        const statusBg = isAccepted
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40"
          : isPending
            ? "bg-gray-100 dark:bg-slate-800/30 border-gray-200 dark:border-slate-700/40"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40";

        return (
          <div
            key={submission.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-all duration-200"
          >
            {/* Summary row */}
            <div className="flex items-stretch hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
              {/* Report status button */}
              <div className="flex items-center pl-4 py-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportId(submission.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${statusBg} ${statusColor}`}
                  title="View detailed analysis report"
                >
                  {isPending && (
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-ping" />
                  )}
                  {submission.status}
                  <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold text-gray-400 dark:text-slate-400 ml-0.5">
                    REPORT
                  </span>
                </button>
              </div>

              {/* Expand button */}
              <button
                type="button"
                className="flex flex-1 items-center justify-between pl-4 pr-4 py-4 text-left cursor-pointer focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-800/60 transition-colors"
                onClick={() => toggleExpand(submission.id)}
              >
                {/* Problem info */}
                <div>
                  <p className="text-gray-800 dark:text-slate-100 font-semibold text-sm">
                    Problem {submission.problemId}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {submission.language}
                  </p>
                </div>

                {/* Right side: test cases + chevron */}
                <div className="flex items-center gap-4">
                  {!isPending && !isError && (
                    <div className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center">
                      <span
                        className={
                          isAccepted
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-red-600 dark:text-red-400 font-bold"
                        }
                      >
                        {submission.passedTestCases}
                      </span>
                      <span className="text-gray-300 dark:text-slate-600 mx-1">/</span>
                      <span className="text-gray-500 dark:text-slate-400">
                        {submission.totalTestCases}
                      </span>
                    </div>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 dark:text-slate-500 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40">
                {isError && submission.error && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Error Log
                    </h3>
                    <pre className="p-4 overflow-x-auto text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800/30 whitespace-pre-wrap font-mono">
                      {submission.error}
                    </pre>
                  </div>
                )}

                {submission.status === "Wrong Answer" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        Your Output
                      </h3>
                      <pre className="p-3 overflow-x-auto text-xs bg-white dark:bg-slate-900 rounded-xl font-mono text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800">
                        {submission.output || "No output"}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Expected Output
                      </h3>
                      <pre className="p-3 overflow-x-auto text-xs bg-white dark:bg-slate-900 rounded-xl font-mono text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800">
                        {submission.expectedOutput}
                      </pre>
                    </div>
                  </div>
                )}

                {isAccepted && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    All test cases passed successfully!
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {reportId && <ReportModal submissionId={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
};
