import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export const MainLayout: React.FC = () => {
  const { user, examExpiresAt, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!user || !examExpiresAt || user.role === "admin") return;

    const targetTimeMs = examExpiresAt * 1000;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = targetTimeMs - now;

      if (difference <= 0) {
        clearInterval(timerId);
        alert("考試時間已到！系統已自動提交並結束您的操作。");
        logout();
        navigate("/");
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const formatNum = (num: number) => num.toString().padStart(2, "0");
      setTimeLeft(`${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`);
    };

    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [user, examExpiresAt, logout, navigate]);

  const handleLogout = () => {
    if (user?.role === "admin") {
      logout();
      navigate("/");
      return;
    }
    if (window.confirm("確定要登出嗎？登出後計時仍會繼續執行！")) {
      logout();
      navigate("/");
    }
  };

  const navLinks =
    user?.role === "admin"
      ? [
          { to: "/problems", label: "Problems" },
          { to: "/submissions", label: "Submissions" },
          { to: "/results", label: "Results" },
        ]
      : [
          { to: "/problems", label: "Problems" },
          { to: "/results", label: "Results" },
        ];

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <nav className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 h-14 flex items-center gap-1 flex-shrink-0 overflow-x-auto transition-colors duration-200">
        {/* Logo */}
        <Link to={user ? "/problems" : "/"} className="flex items-center gap-2 mr-4 group">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="font-bold text-gray-900 dark:text-slate-50 text-sm tracking-tight">
            SMC Judge
          </span>
        </Link>

        {/* Nav links */}
        {user &&
          navLinks.map((link) => {
            const isActive =
              location.pathname === link.to || location.pathname.startsWith(link.to + "/");
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-50"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Countdown timer */}
          {user && user.role !== "admin" && timeLeft && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg">
              <svg
                className="w-3.5 h-3.5 text-red-500 dark:text-red-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-600 dark:text-red-400 font-mono text-sm font-semibold">
                {timeLeft}
              </span>
            </div>
          )}

          {/* Control panel link */}
          {user?.role === "admin" && (
            <Link
              to="/interviewer"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                location.pathname === "/interviewer"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400"
                  : "border-amber-300/60 dark:border-amber-700/30 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <span className="hidden sm:inline">Control Panel</span>
              <span className="sm:hidden">Panel</span>
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500 font-mono hidden sm:block">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                登出
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
