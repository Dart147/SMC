import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchProblems, fetchProblemById } from "./api";
import { apiClient } from "../../services/api";
// 💡 注意：請確認 Problem 的型別路徑是否正確
import { Problem } from "../../types/problem";

// ---------------------------------------------------------
// 1. Mock 外部依賴 (攔截 apiClient)
// ---------------------------------------------------------
vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(), // 這次我們用的是 GET 請求
  },
}));

describe("Problems API", () => {
  // 每個測試前清空呼叫紀錄
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchProblems()", () => {
    it("應該打向 /problems API 並回傳題目陣列", async () => {
      // 準備假資料 (Mock Data)
      const mockProblems: Problem[] = [
        { id: "1", title: "Two Sum", difficulty: "Easy", description: "desc 1" },
        { id: "2", title: "LRU Cache", difficulty: "Medium", description: "desc 2" },
      ];

      // 設定當呼叫 apiClient.get 時，模擬 axios 的 { data: ... } 回傳結構
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProblems });

      // 執行要測試的函式
      const result = await fetchProblems();

      // 驗證 1: apiClient 有沒有打對網址？
      expect(apiClient.get).toHaveBeenCalledWith("/problems");
      expect(apiClient.get).toHaveBeenCalledTimes(1);

      // 驗證 2: 函式有沒有正確解析出 data 並回傳？
      expect(result).toEqual(mockProblems);
    });

    it("當 API 請求失敗時，應該將錯誤拋出", async () => {
      const mockError = new Error("伺服器錯誤 500");
      vi.mocked(apiClient.get).mockRejectedValueOnce(mockError);

      // 驗證錯誤是否被正確拋出
      await expect(fetchProblems()).rejects.toThrow("伺服器錯誤 500");
    });
  });

  describe("fetchProblemById()", () => {
    it("應該帶入 id 打向 /problems/:id API 並回傳單一題目", async () => {
      const targetId = "p-123";
      const mockProblem: Problem = {
        id: targetId,
        title: "Reverse Linked List",
        difficulty: "Easy",
        description: "Reverse it!",
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProblem });

      const result = await fetchProblemById(targetId);

      // 驗證網址有沒有正確拼接
      expect(apiClient.get).toHaveBeenCalledWith(`/problems/${targetId}`);

      // 驗證回傳的單一物件是否正確
      expect(result).toEqual(mockProblem);
    });

    it("當找不到該題目 (404) 時，應該將錯誤拋出", async () => {
      const mockError = new Error("Not Found 404");
      vi.mocked(apiClient.get).mockRejectedValueOnce(mockError);

      await expect(fetchProblemById("not-exist-id")).rejects.toThrow("Not Found 404");
    });
  });
});
