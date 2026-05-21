// auth/hooks/useAuth.ts
import { useState } from "react";
import { login as apiLogin, logout as apiLogout } from "../api";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ username, password });
      
      // 登入成功，儲存真實的 JWT Token
      localStorage.setItem("auth_token", res.token);
      console.log("Logged in successfully");
      return true; // 回傳 true 讓表單知道成功了
    } catch (e) {
      console.error("Login failed", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiLogout();
    navigate("/login");
  };

  return { login, logout, isLoading };
};