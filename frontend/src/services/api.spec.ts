import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, login, getProblems, submitCode } from "./api";

describe("API Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Axios 請求攔截器 (Request Interceptor)", () => {
    // 先把原本的 getItem 存起來，避免這個區塊的暴力覆蓋影響到其他測試
    const originalGetItem = localStorage.getItem;

    afterEach(() => {
      // 每個測試跑完後，把它還原
      localStorage.getItem = originalGetItem;
    });

    it("當 localStorage 有 smc_token 時，應將其加入 Authorization Header", () => {
      // 🌟 終極殺招：直接覆蓋 localStorage.getItem 本人！
      localStorage.getItem = vi.fn().mockReturnValue("super-secret-jwt");

      const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const mockConfig = { headers: {} };
      const resultConfig = requestInterceptor(mockConfig);

      expect(resultConfig.headers.Authorization).toBe("Bearer super-secret-jwt");
    });

    it("當 localStorage 沒有 token 時，不應加入 Authorization Header", () => {
      // 🌟 直接回傳 null，模擬沒有登入的情況
      localStorage.getItem = vi.fn().mockReturnValue(null);

      const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const mockConfig = { headers: {} };
      const resultConfig = requestInterceptor(mockConfig);

      expect(resultConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe("API 業務函式封裝", () => {
    it("login 應發送 POST 請求到 /auth/login", async () => {
      const mockResponse = { data: { token: "123" } };
      // 攔截 apiClient.post
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockResponse);

      const result = await login({ username: "usr", password: "pwd" });

      expect(postSpy).toHaveBeenCalledWith("/auth/login", { username: "usr", password: "pwd" });
      expect(result).toEqual({ token: "123" });
    });

    it("getProblems 應發送 GET 請求到 /problems", async () => {
      const mockResponse = { data: [{ id: "p1", title: "Problem 1" }] };
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockResponse);

      const result = await getProblems();

      expect(getSpy).toHaveBeenCalledWith("/problems");
      expect(result).toEqual(mockResponse.data);
    });

    it("submitCode 應發送 POST 請求到 /submissions", async () => {
      const payload = { problemId: "1", language: "go", code: "fmt.Println()" };
      const mockResponse = { data: { id: "sub-1", status: "Pending" } };
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockResponse);

      const result = await submitCode(payload);

      expect(postSpy).toHaveBeenCalledWith("/submissions", payload);
      expect(result).toEqual(mockResponse.data);
    });
  });
});
