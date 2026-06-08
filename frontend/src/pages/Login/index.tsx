import { LoginForm } from "../../features/auth/components/LoginForm";
import { useTheme } from "../../contexts/ThemeContext";

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
