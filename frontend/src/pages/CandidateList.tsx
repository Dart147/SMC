import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";
import ReportModal from "../components/Common/ReportModal";

// --- 定義資料結構 ---
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

  // 🌟 將 API 抓取邏輯抽離出來，方便在 Polling 時重複呼叫
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
    // 1. 初次載入
    const init = async () => {
      await fetchCandidates();
      setIsLoading(false);
    };
    init();

    // 2. 🌟 輪詢機制：每 3 秒自動更新一次資料
    const interval = setInterval(fetchCandidates, 3000);

    // 3. 清理機制：組件卸載時移除計時器
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 p-8 font-sans w-full">
      <div className="max-w-[85rem] mx-auto">
        <h2 className="text-3xl font-extrabold text-white mb-2">👨‍💻 應試考生名冊</h2>
        <p className="text-gray-500 text-sm mb-8">
          系統已開啟即時監控：考生若觸發違規，此頁面將自動更新。
        </p>

        {isLoading ? (
          <div className="text-indigo-400 animate-pulse text-center py-10">載入應試者資料中...</div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden shadow-xl transition-all">
                
                <div 
                  onClick={() => toggleExpand(candidate.id)}
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-center gap-6 w-1/3">
                    <div className="font-mono text-xl font-bold text-indigo-400">{candidate.username}</div>
                  </div>

                  <div className="flex items-center justify-between w-2/3 pr-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">整體表現</span>
                      <span className="font-bold text-blue-400 text-lg">{candidate.overallScore} 分</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">誠實度</span>
                      {/* 🌟 數字會自動更新，且顏色有警示效果 */}
                      <span className={`px-3 py-1 rounded-md text-xs font-black transition-colors ${
                        candidate.warningCount > 0 
                          ? "bg-red-950/50 text-red-400 border border-red-900 animate-pulse" 
                          : "bg-green-950/50 text-green-400 border border-green-900"
                      }`}>
                        {candidate.warningCount} 次違規
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">作答題數</span>
                      <span className="font-bold text-gray-300">{candidate.submissions.length} 題</span>
                    </div>

                    <svg 
                      className={`w-6 h-6 text-gray-400 transform transition-transform ${expandedId === candidate.id ? 'rotate-180' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedId === candidate.id && (
                  <div className="bg-[#141414] border-t border-gray-800 p-6">
                    <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">作答紀錄明細</h4>
                    <div className="space-y-3">
                      {candidate.submissions.map((sub) => (
                        <div key={sub.id} className="grid grid-cols-6 gap-4 items-center bg-[#1e1e1e] p-4 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors">
                          <div className="col-span-2 flex flex-col">
                            <span className="text-gray-200 font-bold">{sub.problemTitle}</span>
                            <span className={`text-xs mt-1 font-bold ${sub.status === 'Accepted' ? 'text-green-400' : 'text-red-400'}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 uppercase">Test Cases</span>
                            <span className="font-mono text-sm mt-1 text-indigo-300">{sub.testCases || "0/0"}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 uppercase">Run Time</span>
                            <span className="font-mono text-sm mt-1 text-emerald-400">{sub.runTimeMs} ms</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 uppercase">Code Style</span>
                            <span className={`font-mono text-sm mt-1 font-bold ${sub.codeStyleScore >= 90 ? 'text-green-400' : 'text-red-400'}`}>
                              {sub.codeStyleScore}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedSubmissionId(sub.id); }}
                              className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-4 py-2 rounded-lg transition"
                            >
                              檢視程式碼 ➔
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