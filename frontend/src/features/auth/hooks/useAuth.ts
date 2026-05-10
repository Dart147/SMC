import { useState } from "react";
import { login as apiLogin, logout as apiLogout } from "../api";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ username, password });
      console.log("Logged in:", res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      console.log("Logged out");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, logout, isLoading };
};
