import React from "react";
import { Outlet, Link } from "react-router-dom";
// 引入你的 Auth Hook (請確認路徑與實作)
import { useAuth } from "../features/auth/hooks/useAuth";

export const MainLayout: React.FC = () => {
  // 從系統狀態中取得目前登入的使用者資訊
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <nav className="bg-gray-900 text-white p-4 flex gap-6 shadow items-center">
        <Link to="/" className="font-bold text-lg">
          OJ Platform
        </Link>
        <Link to="/" className="hover:text-gray-300 transition-colors">
          Home
        </Link>
        <Link to="/problems" className="hover:text-gray-300 transition-colors">
          Problems
        </Link>
        <Link to="/submissions" className="hover:text-gray-300 transition-colors">
          Submissions
        </Link>

        {/*條件渲染：只有當 role 是 admin 時，才顯示 Interviewer 連結 */}
        {user?.role === "admin" && (
          <Link
            to="/interviewer"
            className="ml-auto text-yellow-400 hover:text-yellow-300 font-bold transition-colors border border-yellow-400 px-3 py-1 rounded"
          >
            Control panel
          </Link>
        )}
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
