import { LoginForm } from "../../features/auth/components/LoginForm";
import { useTheme } from "../../contexts/ThemeContext";
import { SunIcon, MoonIcon } from "../../components/Common/ThemeIcons";

export function Login() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200 font-sans">
      {/* Theme toggle — top-right corner */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
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
          <span className="text-gray-900 dark:text-slate-50 font-bold text-xl tracking-tight">
            SMC Judge
          </span>
        </div>
        <p className="text-gray-500 dark:text-slate-500 text-sm">登入以進入專屬考場</p>
      </div>

      <LoginForm />
    </div>
  );
}
