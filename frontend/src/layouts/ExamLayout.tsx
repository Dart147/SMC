import { useState, useCallback, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAntiCheat } from "../hooks/useAntiCheat";
import { useAuth } from "../features/auth/hooks/useAuth";

// ==========================================
// 1. 內部元件：專門給「考生」的防弊外殼 (原本的 ExamLayout)
// ==========================================
function CandidateExamLayout() {
  const navigate = useNavigate();
  const token = useAuth((state) => state.token);
  const logout = useAuth((state) => state.logout);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  const isExitingRef = useRef(false);

  // 防弊觸發邏輯
  const handleCheatDetected = useCallback(async () => {
    if (isExitingRef.current) return;

    setIsWarningModalOpen(true);
    try {
      const res = await fetch("/api/exams/warn", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWarningCount(data.warning_count);

        if (data.warning_count >= 3) {
          isExitingRef.current = true;

          setTimeout(async () => {
            alert("🚨 系統偵測您已嚴重違規達 3 次！系統已自動交卷並將您強制登出。");

            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => {});
            }

            logout();
            navigate("/login", { replace: true });
          }, 100);
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

    isExitingRef.current = true;

    try {
      const res = await fetch("/api/exams/end", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("✅ 交卷成功！感謝您的參與。");

        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }

        logout();
        navigate("/login", { replace: true });
      } else {
        isExitingRef.current = false;
        alert("交卷失敗，請稍後再試。");
      }
    } catch (err) {
      console.error("交卷失敗", err);
      isExitingRef.current = false;
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

// ==========================================
// 2. 對外輸出的 Layout：負責判斷身分並分流 (Traffic Cop)
// ==========================================
export function ExamLayout() {
  const user = useAuth((state) => state.user);

  // 這樣 `useAntiCheat` 根本不會被掛載到 DOM 上，徹底免疫防弊偵測，也不會看到交卷按鈕。
  if (user?.role === "admin") {
    return <Outlet />;
  }

  // 要啟動防作弊把下面一行註解掉
  // return <Outlet />;
  return <CandidateExamLayout />;
}
