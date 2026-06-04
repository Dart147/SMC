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

    // If the workspace timed out before the judge finished, keep polling until done
    if (stillPending && latestId) {
      pollUntilTerminal(latestId, fetchHistory);
    }
  }, []);

  const totalScore = submissions.reduce((sum, s) => sum + (s.score ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 p-8 font-sans w-full">
      <div className="max-w-[85rem] mx-auto">
        <h2 className="text-3xl font-extrabold text-white mb-2">📋 My Results</h2>
        <p className="text-gray-500 text-sm mb-2">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Total
          score: <span className="text-blue-400 font-bold">{totalScore} pts</span>
        </p>

        {loading ? (
          <div className="text-indigo-400 animate-pulse text-center py-10">Loading results...</div>
        ) : submissions.length === 0 ? (
          <div className="text-gray-500 text-center py-10">
            No submissions yet. Write some code and submit!
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isAccepted = sub.status === "Accepted";
              const isPending = sub.status === "Pending";

              const statusColor = isAccepted
                ? "text-green-400"
                : isPending
                  ? "text-gray-400"
                  : "text-red-400";

              return (
                <div
                  key={sub.id}
                  className={`rounded-2xl overflow-hidden shadow-xl transition-all ${sub.id === latestId ? "bg-[#1a1f2e] border border-indigo-500/50" : "bg-[#1a1a1a] border border-gray-800"}`}
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex flex-col gap-1 w-1/3">
                      <span className="font-mono text-lg font-bold text-indigo-400">
                        {sub.problemTitle || `Problem ${sub.problemId}`}
                      </span>
                      <span className="text-xs text-gray-500">{sub.language}</span>
                    </div>

                    <div className="flex items-center justify-between w-2/3 pr-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                          Status
                        </span>
                        <span className={`text-sm font-bold ${statusColor}`}>{sub.status}</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                          Test Cases
                        </span>
                        <span className="font-mono text-sm text-indigo-300">
                          {sub.passedTestCases}/{sub.totalTestCases}
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                          Score
                        </span>
                        <span className="font-bold text-blue-400">{sub.score ?? 0} pts</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                          Run Time
                        </span>
                        <span className="font-mono text-sm text-emerald-400">
                          {sub.executionTimeMs != null && sub.executionTimeMs > 0
                            ? `${sub.executionTimeMs} ms`
                            : "—"}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportId(sub.id);
                        }}
                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-4 py-2 rounded-lg transition"
                      >
                        Report ➔
                      </button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reportId && <ReportModal submissionId={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
}
