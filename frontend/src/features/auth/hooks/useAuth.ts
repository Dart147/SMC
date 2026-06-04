import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { login as apiLogin } from "../api";

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
  exam_expires_at: number; // 🌟 新增：後端塞入的考試截止時間戳記 (秒)
}

interface AuthState {
  token: string | null;
  user: { id: string; role: string; username: string } | null;
  examExpiresAt: number | null; // 🌟 新增：全域考試截止時間
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => {
  const storedToken = localStorage.getItem("smc_token");
  let initialUser = null;
  let initialExpiresAt = null;

  if (storedToken) {
    try {
      const decoded = jwtDecode<JwtPayload>(storedToken);
      if (decoded.exp * 1000 > Date.now()) {
        const storedUsername = localStorage.getItem("smc_username") ?? decoded.sub;
        initialUser = { id: decoded.sub, role: decoded.role, username: storedUsername };
        initialExpiresAt = decoded.exam_expires_at; // 🌟 初始化時回復時間
      } else {
        localStorage.removeItem("smc_token");
        localStorage.removeItem("smc_username");
      }
    } catch (error) {
      localStorage.removeItem("smc_token");
      localStorage.removeItem("smc_username");
    }
  }

  return {
    token: storedToken && initialUser ? storedToken : null,
    user: initialUser,
    examExpiresAt: initialExpiresAt, // 🌟 賦予初始值

    login: async (credentials) => {
      const response = await apiLogin(credentials);
      const newToken = response.token;

      const decoded = jwtDecode<JwtPayload>(newToken);

      localStorage.setItem("smc_token", newToken);
      localStorage.setItem("smc_username", credentials.username);

      set({
        token: newToken,
        user: { id: decoded.sub, role: decoded.role, username: credentials.username },
        examExpiresAt: decoded.exam_expires_at, // 🌟 登入成功時寫入狀態
      });
    },

    logout: () => {
      localStorage.removeItem("smc_token");
      localStorage.removeItem("smc_username");
      set({ token: null, user: null, examExpiresAt: null }); // 🌟 清空
    },
  };
});
