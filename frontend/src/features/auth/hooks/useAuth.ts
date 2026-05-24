import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { login as apiLogin } from "../../../services/api"; // 確認這裡指向你的 api.ts

// 對應 Go 後端發放的 JWT Claims 結構
interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

interface AuthState {
  token: string | null;
  user: { id: string; role: string } | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => {
  // 1. 初始化時：檢查 localStorage 是否已經有 Token
  const storedToken = localStorage.getItem("smc_token");
  let initialUser = null;

  if (storedToken) {
    try {
      const decoded = jwtDecode<JwtPayload>(storedToken);
      // 檢查 Token 是否過期 (exp 是秒，Date.now() 是毫秒)
      if (decoded.exp * 1000 > Date.now()) {
        initialUser = { id: decoded.sub, role: decoded.role };
      } else {
        localStorage.removeItem("smc_token"); // 過期就清掉
      }
    } catch (error) {
      localStorage.removeItem("smc_token");
    }
  }

  return {
    token: storedToken && initialUser ? storedToken : null,
    user: initialUser,

    // 2. 登入邏輯
    login: async (credentials) => {
      // 呼叫 api.ts 發送 POST 請求
      const response = await apiLogin(credentials);
      const newToken = response.token; // 預期後端回傳 { "token": "..." }

      // 解碼 Token 取得使用者資訊
      const decoded = jwtDecode<JwtPayload>(newToken);

      // 存入 localStorage 以便重整頁面不掉登入
      localStorage.setItem("smc_token", newToken);

      // 更新 Zustand 全域狀態
      set({
        token: newToken,
        user: { id: decoded.sub, role: decoded.role },
      });
    },

    // 3. 登出邏輯
    logout: () => {
      localStorage.removeItem("smc_token");
      set({ token: null, user: null });
    },
  };
});
