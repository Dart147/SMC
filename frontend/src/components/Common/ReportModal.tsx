import React, { useEffect, useState } from "react";

// 🌟 定義從後端傳回來的資料結構
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

// 🌟 定義組件接收的 Props 類型
interface ReportModalProps {
  submissionId: string | null;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ submissionId, onClose }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) return;

    // 每次開啟時先重設資料與錯誤狀態
    setData(null);
    setError(null);

    fetch(`http://localhost:8080/api/submissions/${submissionId}/report`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("smc_token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("無法取得報告資料");
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [submissionId]);

  if (!submissionId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 w-full max-w-5xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">面試詳細報告</h2>
            {data && (
              <p className="text-xs text-gray-400 mt-1 font-mono">Submission ID: {submissionId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-950/50">
          {error ? (
            <div className="text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-500/50">
              ❌ 錯誤: {error}
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-20 text-blue-400 animate-pulse">
              載入報告數據中...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左邊：程式碼區塊 */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-black rounded-xl border border-gray-800 overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <span className="text-xs font-mono text-gray-300">
                      {data.language.toUpperCase()}
                    </span>
                    <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30">
                      FINAL SUBMISSION
                    </span>
                  </div>
                  <pre className="p-6 font-mono text-green-400 text-sm leading-relaxed overflow-x-auto max-h-[500px]">
                    {data.code || "// 無程式碼內容"}
                  </pre>
                </div>
              </div>

              {/* 右邊：數據分析區塊 */}
              <div className="space-y-4">
                {/* 誠實度卡片 */}
                <div
                  className={`p-5 rounded-xl border transition-all ${data.warningCount > 0 ? "bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-green-900/20 border-green-500/50"}`}
                >
                  <p className="text-xs uppercase font-black text-gray-500 tracking-widest">
                    誠實度檢查
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p
                      className={`text-4xl font-black ${data.warningCount > 0 ? "text-red-500" : "text-green-500"}`}
                    >
                      {data.warningCount}
                    </p>
                    <p className="text-gray-400 text-sm font-bold">次切換警告</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-gray-400">
                    {data.warningCount > 0
                      ? "⚠️ 系統偵測到考生在測驗期間頻繁離開視窗，建議人工覆核代碼邏輯。"
                      : "✅ 考生測驗過程穩定，無異常視窗切換行為。"}
                  </p>
                </div>

                {/* 評分卡片 */}
                <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 shadow-inner">
                  <p className="text-xs uppercase font-black text-gray-500 tracking-widest">
                    測驗評分
                  </p>
                  <p className="text-4xl font-black text-blue-400 mt-2">
                    {data.score} <span className="text-lg text-gray-600">/ 100</span>
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">判定狀態</span>
                      <span
                        className={`font-bold ${data.status === "Accepted" ? "text-green-400" : "text-orange-400"}`}
                      >
                        {data.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🌟 修改此處：面試者資訊區塊 */}
                <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                    面試者資訊
                  </p>
                  <p className="text-sm text-gray-200 mt-1 font-mono font-bold flex items-center gap-2">
                    <span className="text-gray-500">帳號:</span>
                    {/* 若後端仍然傳遞亂碼，請確保後端 API 的 username 欄位是撈取真實的帳號名稱 (如 USER-1234) */}
                    {data.username || "未命名面試者"}
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
