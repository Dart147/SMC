import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReportModal from "../../components/Common/ReportModal";
import { useSubmissionsStore } from "../../features/submissions/store";

export function SubmissionsPage() {
  const [reportId, setReportId] = useState<string | null>(null);
  const location = useLocation();
  const {
    history: submissions,
    isLoading: loading,
    fetchHistory,
    pollUntilTerminal,
  } = useSubmissionsStore();

  const latestId: string | undefined = location.state?.submissionId;
  const stillPending: boolean = location.state?.stillPending ?? false;

  useEffect(() => {
    fetchHistory();

    if (stillPending && latestId) {
      pollUntilTerminal(latestId, fetchHistory);
    }
  }, []);

  const totalScore = submissions.reduce((sum, s) => sum + (s.score ?? 0), 0);

  const statusConfig = {
    Accepted: { color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-800/40" },
    Pending: { color: "text-slate-400", bg: "bg-slate-800/30 border-slate-700/40" },
  } as Record<string, { color: string; bg: string }>;

  const getStatusStyle = (status: string) =>
    statusConfig[status] ?? { color: "text-red-400", bg: "bg-red-950/30 border-red-800/40" };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 w-full">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50 tracking-tight">My Results</h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-slate-500 text-sm">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-500 text-sm">
              Total score: <span className="text-indigo-400 font-semibold">{totalScore} pts</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
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
            Loading results...
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <svg
              className="w-12 h-12 text-slate-800"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm">No submissions yet. Write some code and submit!</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_140px_100px_90px_100px_120px] gap-4 px-5 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                Problem
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-center">
                Status
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-center">
                Test Cases
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-center">
                Score
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-center">
                Run Time
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-right">
                Action
              </span>
            </div>

            <div className="space-y-2">
              {submissions.map((sub) => {
                const { color, bg } = getStatusStyle(sub.status);

                return (
                  <div
                    key={sub.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      sub.id === latestId
                        ? "bg-slate-900 border-indigo-700/40 shadow-lg shadow-indigo-950/20"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_140px_100px_90px_100px_120px] gap-4 items-center p-4 px-5">
                      {/* Problem */}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-100 text-sm truncate block">
                          {sub.problemTitle || `Problem ${sub.problemId}`}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          {sub.language}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex justify-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md border ${bg} ${color}`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      {/* Test cases */}
                      <div className="text-center">
                        <span className="font-mono text-sm text-slate-300">
                          {sub.passedTestCases}/{sub.totalTestCases}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="text-center">
                        <span className="font-semibold text-indigo-400 text-sm">
                          {sub.score ?? 0}
                        </span>
                        <span className="text-slate-600 text-xs"> pts</span>
                      </div>

                      {/* Run time */}
                      <div className="text-center">
                        <span className="font-mono text-sm text-emerald-400">
                          {sub.executionTimeMs != null && sub.executionTimeMs > 0
                            ? `${sub.executionTimeMs} ms`
                            : "—"}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportId(sub.id);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-700/50 transition-all duration-150 cursor-pointer"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {reportId && <ReportModal submissionId={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
}
