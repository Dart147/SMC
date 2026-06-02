// auth/api.ts
import { apiClient } from "../../services/api";

export const login = async (credentials: { username: string; password: string }) => {
  // 打向後端的 /api/auth/login
  const response = await apiClient.post("/auth/login", credentials);
  return response.data; // 預期會拿到 { token: "eyJhbG..." }
};

export const logout = async () => {
<<<<<<< HEAD
  localStorage.removeItem("auth_token");
=======
  localStorage.removeItem("smc_token");
>>>>>>> feat/SonarQube-code-check
  return Promise.resolve({ success: true });
};
