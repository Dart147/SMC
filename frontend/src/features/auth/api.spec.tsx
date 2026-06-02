import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, logout } from "./api";
import { apiClient } from "../../services/api";

// ---------------------------------------------------------
// 1. Mock 外部依賴 (攔截 axios / apiClient)
// ---------------------------------------------------------
vi.mock("../../services/api", () => ({
  apiClient: {
    post: vi.fn(), // 我們只需要用到 post
  },
}));

describe("Auth API (api.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localStorage.removeItem).mockClear();
  });

  describe("login()", () => {
    it("應該使用正確的參數打向 /auth/login 並回傳 token", async () => {
      // 準備假資料
      const mockCredentials = { username: "testuser", password: "password123" };
      const mockAxiosResponse = { data: { token: "fake-jwt-token" } };

      // 設定 apiClient.post 會成功，並回傳 mockAxiosResponse
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockAxiosResponse);

      // 執行要測試的函式
      const result = await login(mockCredentials);

      // 驗證 1: apiClient 有沒有被打對網址和塞對 Payload？
      expect(apiClient.post).toHaveBeenCalledWith("/auth/login", mockCredentials);

      // 驗證 2: 函式有沒有正確把 response.data 抽出來回傳？
      expect(result).toEqual({ token: "fake-jwt-token" });
    });

    it("當 API 發生錯誤時，應該將錯誤向上拋出 (throw)", async () => {
      const mockCredentials = { username: "wrong", password: "wrong" };
      const mockError = new Error("Network Error");

      // 設定 apiClient.post 這次會失敗 (Reject)
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      // 驗證 login 函式執行時，會不會把錯誤乖乖拋出來給外層 (useAuth) 處理
      await expect(login(mockCredentials)).rejects.toThrow("Network Error");
    });
  });

  describe("logout()", () => {
    it("應該從 localStorage 移除 token 並回傳 success", async () => {
      const result = await logout();

      // 驗證 localStorage.removeItem 有被呼叫
      expect(localStorage.removeItem).toHaveBeenCalledWith("smc_token");

      // 驗證回傳值
      expect(result).toEqual({ success: true });
    });
  });
});
