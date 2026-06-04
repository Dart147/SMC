import { LoginForm } from "../../features/auth/components/LoginForm";

export function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
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
          <span className="text-slate-50 font-bold text-xl tracking-tight">SMC Judge</span>
        </div>
        <p className="text-slate-500 text-sm">登入以進入專屬考場</p>
      </div>

      <LoginForm />
    </div>
  );
}
