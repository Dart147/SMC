import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function DisclaimerPage() {
  const navigate = useNavigate();
  const token = useAuth((state) => state.token);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartExam = async () => {
    setError("");
    setIsLoading(true);

    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else {
        throw new Error("您的瀏覽器不支援全螢幕功能，請使用 Chrome 或 Edge 瀏覽器。");
      }

      const response = await fetch("/api/exams/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("無法啟動考試連線，請稍後再試或聯絡助教。");
      }

      navigate("/problems", { replace: true });
    } catch (err: any) {
      setError(err.message || "啟動考試時發生錯誤。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl shadow-gray-200/60 dark:shadow-black/40 max-w-2xl w-full p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50">
              測驗規範與防弊宣告
            </h2>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">
              請仔細閱讀以下規範後再開始考試
            </p>
          </div>
        </div>

        {/* Rules box */}
        <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl p-6 space-y-3 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium leading-relaxed">
            點擊開始測驗後，系統將強制進入全螢幕模式並開始倒數計時。請嚴格遵守以下規範：
          </p>
          <div className="space-y-2 mt-3">
            {[
              { title: "禁止切換視窗", desc: "任何切換分頁、縮小視窗的行為皆會被系統記錄。" },
              { title: "禁止解除全螢幕", desc: "請勿按下 Esc 鍵退出全螢幕。" },
              {
                title: "停用右鍵與剪貼簿",
                desc: "滑鼠右鍵、複製 (Ctrl+C) 與貼上 (Ctrl+V) 功能皆已關閉。",
              },
            ].map((rule, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/50 rounded text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                  <span className="text-gray-800 dark:text-slate-100 font-semibold">
                    {rule.title}：
                  </span>
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800/30">
            <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
              警告：若系統偵測到違規行為累計達 3
              次，將判定為作弊，系統將立刻強制交卷並將您的帳號列為可疑名單。
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleStartExam}
          disabled={isLoading}
          className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-all duration-200 ${
            isLoading
              ? "bg-gray-200 dark:bg-slate-700 cursor-not-allowed text-gray-400 dark:text-slate-400"
              : "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
          }`}
        >
          {isLoading ? "系統啟動中..." : "我已瞭解規範，進入全螢幕開考"}
        </button>
      </div>
    </div>
  );
}
