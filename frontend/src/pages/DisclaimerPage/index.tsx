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
      // 1. 強制要求瀏覽器進入全螢幕模式
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else {
        throw new Error("您的瀏覽器不支援全螢幕功能，請使用 Chrome 或 Edge 瀏覽器。");
      }

      // 2. 呼叫後端開考 API，正式啟動計時 (使用相對路徑，交給 Nginx 代理)
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

      // 🌟 3. 一切就緒，導向測驗列表！
      // 使用 { replace: true } 可以替換掉瀏覽器的歷史紀錄
      // 這樣考生按瀏覽器的「上一頁」就不會退回這張宣告頁了
      navigate("/problems", { replace: true });
    } catch (err: any) {
      // 捕捉錯誤 (例如考生拒絕全螢幕權限)
      setError(err.message || "啟動考試時發生錯誤。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          ⚠️ 測驗規範與防弊宣告
        </h2>

        <div className="space-y-4 text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-100 dark:border-red-800/50">
          <p className="font-semibold text-red-600 dark:text-red-400">
            在您點擊開始測驗後，系統將強制進入「全螢幕模式」並開始倒數計時。為確保考試公平性，請嚴格遵守以下規範：
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong className="text-gray-900 dark:text-white">禁止切換視窗：</strong>
              測驗過程中，任何切換分頁、縮小視窗的行為皆會被系統記錄。
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">禁止解除全螢幕：</strong>請勿按下
              Esc 鍵退出全螢幕。
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">停用右鍵與剪貼簿：</strong>
              滑鼠右鍵、複製 (Ctrl+C) 與貼上 (Ctrl+V) 功能皆已關閉。
            </li>
          </ul>
          <p className="font-bold text-red-600 dark:text-red-400 mt-4 pt-4 border-t border-red-200 dark:border-red-800/50">
            🚨 警告：若系統偵測到違規行為累計達 3
            次，將判定為作弊，系統將立刻強制交卷並將您的帳號列為可疑名單。
          </p>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStartExam}
            disabled={isLoading}
            className={`px-8 py-3 rounded-lg text-white font-bold text-lg transition-all shadow-md ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {isLoading ? "系統啟動中..." : "我已瞭解規範，進入全螢幕開考"}
          </button>
        </div>
      </div>
    </div>
  );
}
