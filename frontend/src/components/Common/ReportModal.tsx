import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api";

interface ReportData {
  id: string;
  username: string;
  code: string;
  language: string;
  score: number;
  warningCount: number;
  isSuspicious: boolean;
  status: string;
  createdAt: string;
}

interface ReportModalProps {
  submissionId: string | null;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ submissionId, onClose }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) return;

    setData(null);
    setError(null);

    apiClient
      .get<ReportData>(`/submissions/${submissionId}/report`)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("無法取得報告資料");
      });
  }, [submissionId]);

  if (!submissionId) return null;

  const isAccepted = data?.status === "Accepted";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl shadow-gray-300/40 dark:shadow-black/60 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-50">Submission Report</h2>
            {data && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono mt-0.5">ID: {submissionId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error ? (
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/40">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500 text-sm gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading report...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Code block */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-gray-100 dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 uppercase font-bold">
                        {data.language}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 font-bold uppercase">
                      Final Submission
                    </span>
                  </div>
                  <pre className="p-5 font-mono text-emerald-700 dark:text-emerald-400 text-sm leading-relaxed overflow-x-auto max-h-[480px]">
                    {data.code || "// No code content"}
                  </pre>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                {/* Integrity */}
                <div
                  className={`p-4 rounded-xl border ${data.warningCount > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"}`}
                >
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-widest">
                    Integrity Check
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className={`text-4xl font-black ${data.warningCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {data.warningCount}
                    </p>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">violations</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    {data.warningCount > 0
                      ? "System detected frequent window switches. Manual code review recommended."
                      : "No abnormal behavior detected during the exam."}
                  </p>
                </div>

                {/* Score */}
                <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-200 dark:border-slate-700/50">
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-widest">
                    Score
                  </p>
                  <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                    {data.score} <span className="text-base text-gray-300 dark:text-slate-600 font-normal">/ 100</span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400 dark:text-slate-500">Status</span>
                      <span className={`font-bold ${isAccepted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {data.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate info */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700/50 rounded-xl">
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 uppercase font-bold tracking-wider">
                    Candidate
                  </p>
                  <p className="text-sm text-gray-800 dark:text-slate-100 mt-1.5 font-mono font-semibold">
                    {data.username || "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
