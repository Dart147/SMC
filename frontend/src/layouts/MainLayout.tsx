import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export const MainLayout: React.FC = () => {
  const { user, examExpiresAt, logout } = useAuth();
  const navigate = useNavigate();
  
  // 儲存剩餘時間的顯示字串 (例如 "02:59:45")
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    // 如果沒登入，或者是一般的 admin，就不需要倒數計時
    if (!user || !examExpiresAt || user.role === "admin") return;

    const targetTimeMs = examExpiresAt * 1000; // 秒轉毫秒

    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = targetTimeMs - now;

      if (difference <= 0) {
        // 🚨 時間到了！執行強制終止
        clearInterval(timerId);
        alert("考試時間已到！系統已自動提交並結束您的操作。");
        logout();
        navigate("/");
        return;
      }

      // 轉換成 時:分:秒
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // 補零格式化 (e.g., "02:05:09")
      const formatNum = (num: number) => num.toString().padStart(2, "0");
      setTimeLeft(`${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`);
    };

    // 立即執行一次，避免畫面閃爍延遲
    calculateTimeLeft();

    // 每秒鐘滴答一次
    const timerId = setInterval(calculateTimeLeft, 1000);

    // 組件卸載時清除計時器
    return () => clearInterval(timerId);
  }, [user, examExpiresAt, logout, navigate]);

  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？登出後計時仍會繼續執行！")) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-gray-900 text-white p-4 flex gap-6 shadow items-center">
        <Link to={user ? "/problems" : "/"} className="font-bold text-lg">
          OJ Platform
        </Link>

        {user && (
          <>
            <Link to="/problems" className="hover:text-gray-300 transition-colors">
              Problems
            </Link>
            <Link to="/submissions" className="hover:text-gray-300 transition-colors">
              Submissions
            </Link>
          </>
        )}

        {/* 右側資訊區 */}
        <div className="ml-auto flex items-center gap-6">
          {/* 🌟 倒數計時器視覺呈現 */}
          {user && user.role !== "admin" && timeLeft && (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-500/30 px-3 py-1 rounded text-red-400 font-mono text-sm font-semibold animate-pulse">
              <span>剩餘時間:</span>
              <span className="text-base">{timeLeft}</span>
            </div>
          )}

          {user?.role === "admin" && (
            <Link to="/interviewer" className="text-yellow-400 border border-yellow-400 px-3 py-1 rounded">
              Control panel
            </Link>
          )}

          {user && (
            <button onClick={handleLogout} className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded">
              登出
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};