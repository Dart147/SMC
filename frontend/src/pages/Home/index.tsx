import { LoginForm } from "../../features/auth/components/LoginForm";

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* 順便幫標題加上支援深淺色的 class */}
      <h1 className="text-4xl text-blue-600 dark:text-blue-500 font-bold mb-8">
        Welcome to Online Judge
      </h1>

      <LoginForm />
    </div>
  );
}
