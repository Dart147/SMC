import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSubmission } from "./api";
import { apiClient } from "../../services/api";

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("fetchSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /submissions/:id and returns the submission", async () => {
    const mockSub = { id: "abc123", status: "Accepted" };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSub });

    const result = await fetchSubmission("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/submissions/abc123");
    expect(result).toEqual(mockSub);
  });

  it("propagates errors from the API client", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("network error"));

    await expect(fetchSubmission("bad-id")).rejects.toThrow("network error");
  });
});
