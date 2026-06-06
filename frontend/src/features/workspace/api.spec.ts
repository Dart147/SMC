import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitCode, getSubmission } from "./api";
import { apiClient } from "../../services/api";

// 攔截 apiClient
vi.mock("../../services/api", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Workspace API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submitCode 應正確發送 POST 請求與資料", async () => {
    const mockPayload = { problemId: "p1", code: "print(1)", language: "python" };
    const mockResponse = { data: { id: "sub-123", status: "Pending" } };
    
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await submitCode(mockPayload);

    expect(apiClient.post).toHaveBeenCalledWith("/submissions", mockPayload);
    expect(result).toEqual(mockResponse.data);
  });

  it("getSubmission 應正確發送 GET 請求取得特定 id 的結果", async () => {
    const mockResponse = { data: { id: "sub-123", status: "Accepted" } };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const result = await getSubmission("sub-123");

    expect(apiClient.get).toHaveBeenCalledWith("/submissions/sub-123");
    expect(result).toEqual(mockResponse.data);
  });
});