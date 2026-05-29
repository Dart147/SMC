import { LoginForm } from "../../features/auth/components/LoginForm";

export function Login() {
  return (
    // 使用 min-h-screen 確保背景能完全覆蓋整個螢幕
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
      <div className="mb-8 text-center">
        <h1 className="text-4xl text-blue-600 dark:text-blue-500 font-bold mb-2">
          SMC 線上測驗系統
        </h1>
        <p className="text-gray-500 dark:text-gray-400">登入以進入專屬考場</p>
      </div>

      {/* 載入你寫好的 LoginForm 元件 */}
      <LoginForm />
    </div>
  );
}
