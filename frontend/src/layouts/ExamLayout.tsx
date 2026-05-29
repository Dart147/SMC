import { useState, useCallback, useRef } from "react"; // 🌟 記得引入 useRef
import { Outlet, useNavigate } from "react-router-dom";
import { useAntiCheat } from "../hooks/useAntiCheat";
import { useAuth } from "../features/auth/hooks/useAuth";

export function ExamLayout() {
  const navigate = useNavigate();
  const token = useAuth((state) => state.token);
  const logout = useAuth((state) => state.logout);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  // 🌟 核心防護盾：記錄當前是否處於「正當退出/交卷流程」
  const isExitingRef = useRef(false);

  // 防弊觸發邏輯
  const handleCheatDetected = useCallback(async () => {
    // 🌟 如果防護盾開啟中（正在交卷），直接放行，不當作作弊，也不彈遮罩！
    if (isExitingRef.current) return;

    setIsWarningModalOpen(true);
    try {
      const res = await fetch("/api/exams/warn", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWarningCount(data.warning_count); // 這裡設定為 3

        if (data.warning_count >= 3) {
          isExitingRef.current = true;

          // 🌟 加上 setTimeout，給 React 100 毫秒的時間更新畫面
          setTimeout(async () => {
            // 這時候畫面已經變成 3/3 了，再跳出 alert
            alert("🚨 系統偵測您已嚴重違規達 3 次！系統已自動交卷並將您強制登出。");

            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => {});
            }

            logout();
            navigate("/login", { replace: true });
          }, 100); // 延遲 0.1 秒
        }
      }
    } catch (err) {
      console.error("回報違規失敗", err);
    }
  }, [token, navigate, logout]);

  useAntiCheat(handleCheatDetected);

  // 手動提早交卷邏輯
  const handleEndExam = async () => {
    const confirmEnd = window.confirm("確定要提早交卷嗎？交卷後將無法再次進入考場！");
    if (!confirmEnd) return;

    // 🌟 1. 點擊確定後，第一時間開啟防護盾，免死金牌生效！
    isExitingRef.current = true;

    try {
      const res = await fetch("/api/exams/end", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("✅ 交卷成功！感謝您的參與。");

        // 2. 這裡解除全螢幕觸發的事件，將會被上面 if (isExitingRef.current) 完美擋下！
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }

        logout();
        navigate("/login", { replace: true });
      } else {
        // 如果後端交卷失敗（例如網路斷線），要把防護盾關掉，繼續監控防弊
        isExitingRef.current = false;
        alert("交卷失敗，請稍後再試。");
      }
    } catch (err) {
      console.error("交卷失敗", err);
      isExitingRef.current = false; // 發生錯誤，復原防護盾
      alert("交卷時發生錯誤，請聯絡助教。");
    }
  };

  const handleResume = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        setIsWarningModalOpen(false);
      }
    } catch (err) {
      alert("必須同意進入全螢幕才能繼續考試！");
    }
  };

  return (
    <>
      {/* 違規警告遮罩 */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <h2 className="text-3xl font-bold text-red-600">⚠️ 違規警告</h2>
            <p className="text-gray-700 dark:text-gray-300">系統偵測到您已離開全螢幕模式。</p>
            {warningCount > 0 && (
              <p className="font-bold text-red-500 bg-red-100 dark:bg-red-900/30 py-2 rounded-lg">
                目前違規次數：{warningCount} / 3
              </p>
            )}
            <button
              onClick={handleResume}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              點我重新回到全螢幕並繼續作答
            </button>
          </div>
        </div>
      )}

      {/* 右下角的懸浮「提早交卷」按鈕 */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleEndExam}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg font-bold transition-all hover:scale-105"
        >
          提早交卷
        </button>
      </div>

      <Outlet />
    </>
  );
}
