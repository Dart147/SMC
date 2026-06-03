import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ReportModal from "../../components/Common/ReportModal";
import { useSubmissionsStore } from "../../features/submissions/store";

export function SubmissionsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  // Auto-expand the submission that was just navigated from
  const didExpand = useRef(false);
  useEffect(() => {
    if (latestId && !didExpand.current) {
      setExpandedId(latestId);
      didExpand.current = true;
    }
  }, [latestId]);

  useEffect(() => {
    fetchHistory();

    // If the workspace timed out before the judge finished, keep polling until done
    if (stillPending && latestId) {
      pollUntilTerminal(latestId, fetchHistory);
    }
  }, []);

  const totalScore = submissions.reduce((sum, s) => sum + (s.score ?? 0), 0);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

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
              const isError = ["Runtime Error", "Compile Error"].includes(sub.status);
              const isExpanded = expandedId === sub.id;

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
                  <div
                    onClick={() => toggle(sub.id)}
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#222] transition-colors"
                  >
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

                      {sub.executionTimeMs !== undefined && sub.executionTimeMs > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                            Run Time
                          </span>
                          <span className="font-mono text-sm text-emerald-400">
                            {sub.executionTimeMs} ms
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportId(sub.id);
                        }}
                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-4 py-2 rounded-lg transition"
                      >
                        Report ➔
                      </button>

                      <svg
                        className={`w-6 h-6 text-gray-400 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                  </div>

                  {isExpanded && (
                    <div className="bg-[#141414] border-t border-gray-800 p-6">
                      {isError && sub.error && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">
                            Error Log
                          </h3>
                          <pre className="p-4 overflow-x-auto text-sm text-red-400 bg-red-950/20 rounded-xl border border-red-900/30 font-mono whitespace-pre-wrap">
                            {sub.error}
                          </pre>
                        </div>
                      )}

                      {sub.status === "Wrong Answer" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">
                              Your Output
                            </h3>
                            <pre className="p-3 overflow-x-auto text-sm bg-[#1e1e1e] rounded-xl border border-gray-800 font-mono text-gray-300">
                              {sub.output || "No output"}
                            </pre>
                          </div>
                          {sub.expectedOutput ? (
                            <div className="space-y-2">
                              <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">
                                Expected Output
                              </h3>
                              <pre className="p-3 overflow-x-auto text-sm bg-[#1e1e1e] rounded-xl border border-gray-800 font-mono text-gray-300">
                                {sub.expectedOutput}
                              </pre>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                Expected Output
                              </h3>
                              <p className="text-xs text-gray-600 italic p-3">
                                Hidden for this test case.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {isAccepted && (
                        <div className="text-sm text-green-400 bg-green-950/20 p-4 rounded-xl border border-green-900/30 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          All test cases passed successfully!
                        </div>
                      )}

                      {isPending && (
                        <div className="text-sm text-gray-400 text-center py-2 animate-pulse">
                          Judging in progress...
                        </div>
                      )}
                    </div>
                  )}
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
