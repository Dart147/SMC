import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/api";
import ReportModal from "../../components/Common/ReportModal";

interface SubmissionDetail {
  id: string;
  problemId: number;
  problemTitle: string;
  status: string;
  testCases: string;
  testCasesPassed: number;
  totalTestCases: number;
  runTimeMs: number;
  codeStyleScore: number;
}

interface Candidate {
  id: string;
  username: string;
  createdAt: string;
  warningCount: number;
  overallScore: number;
  submissions: SubmissionDetail[];
}

export const CandidateList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await apiClient.get("/interviewer/candidates");
      if (res.data && res.data.length > 0) {
        setCandidates(res.data);
      }
    } catch (err) {
      console.error("無法更新考生列表", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchCandidates();
      setIsLoading(false);
    };
    init();

    const interval = setInterval(fetchCandidates, 3000);
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 w-full">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50 tracking-tight">Candidate Roster</h2>
          <p className="text-slate-500 text-sm mt-1">
            Live monitoring — violations trigger an automatic update.
          </p>
        </div>

        {isLoading ? (
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
            載入應試者資料中...
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
              >
                {/* Candidate row - 使用原生 button，並強制透明背景與靠左對齊 */}
                <button
                  type="button"
                  onClick={() => toggleExpand(candidate.id)}
                  className="w-full bg-transparent text-left flex items-center p-4 px-5 cursor-pointer hover:bg-slate-800/60 transition-colors focus:outline-none"
                >
                  {/* Username */}
                  <div className="flex items-center gap-3 w-1/3 min-w-0">
                    <div className="w-8 h-8 bg-indigo-950/60 border border-indigo-800/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-indigo-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <span className="font-mono font-semibold text-slate-100 truncate">
                      {candidate.username}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between w-2/3 pr-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-600 uppercase font-bold mb-1">
                        Score
                      </span>
                      <span className="font-bold text-indigo-400">
                        {candidate.overallScore} pts
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-600 uppercase font-bold mb-1">
                        Violations
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          candidate.warningCount > 0
                            ? "bg-red-950/40 text-red-400 border-red-800/40"
                            : "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                        }`}
                      >
                        {candidate.warningCount}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-600 uppercase font-bold mb-1">
                        Submissions
                      </span>
                      <span className="font-semibold text-slate-300">
                        {candidate.submissions.length}
                      </span>
                    </div>

                    <svg
                      className={`w-4 h-4 text-slate-500 transform transition-transform duration-200 ${expandedId === candidate.id ? "rotate-180" : ""}`}
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

                {/* Expanded submissions */}
                {expandedId === candidate.id && (
                  <div className="bg-slate-950/60 border-t border-slate-800 p-5">
                    <h4 className="text-[10px] font-bold text-slate-600 mb-3 uppercase tracking-widest">
                      Submission Details
                    </h4>
                    <div className="space-y-2">
                      {candidate.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="grid grid-cols-[1fr_80px_90px_80px_80px_auto] gap-3 items-center bg-slate-900 p-3 px-4 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div>
                            <span className="text-slate-100 font-semibold text-sm">
                              {sub.problemTitle}
                            </span>
                            <span
                              className={`text-[11px] font-bold mt-0.5 block ${
                                sub.status === "Accepted" ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-600 uppercase block">
                              Tests
                            </span>
                            <span className="font-mono text-sm text-slate-300 mt-0.5">
                              {sub.testCases || "0/0"}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-600 uppercase block">
                              Run Time
                            </span>
                            <span className="font-mono text-sm text-emerald-400 mt-0.5">
                              {sub.runTimeMs} ms
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-600 uppercase block">
                              Style
                            </span>
                            <span
                              className={`font-mono text-sm font-bold mt-0.5 ${sub.codeStyleScore >= 90 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {sub.codeStyleScore}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-600 uppercase block">
                              Score
                            </span>
                            <span className="font-bold text-indigo-400 mt-0.5">
                              {sub.codeStyleScore}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubmissionId(sub.id);
                              }}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-700/50 transition-all duration-150 cursor-pointer whitespace-nowrap"
                            >
                              View Code
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSubmissionId && (
        <ReportModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
        />
      )}
    </div>
  );
};
