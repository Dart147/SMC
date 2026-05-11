import React from "react";
import { LoginForm } from "../../features/auth/components/LoginForm";

export const Home: React.FC = () => {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-900">Welcome to Online Judge</h1>
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <LoginForm />
      </div>
    </div>
  );
};
