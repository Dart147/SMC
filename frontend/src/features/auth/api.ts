// auth/api.ts
import { apiClient } from '../../services/apiClient';

export const login = async (credentials: { username: string; password: string }) => {
  // 打向後端的 /api/auth/login
  const response = await apiClient.post('/auth/login', credentials);
  return response.data; // 預期會拿到 { token: "eyJhbG..." }
};

export const logout = async () => {
  localStorage.removeItem("auth_token");
  return Promise.resolve({ success: true });
};