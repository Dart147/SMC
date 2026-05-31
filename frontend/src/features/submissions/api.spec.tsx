import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SubmissionsPage from "./api"; // 替換成你實際的檔名
import { useLocation } from "react-router-dom";
import { useSubmissionsStore } from "./store";

// 1. Mock React Router 的 useLocation
vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
}));

// 2. Mock Zustand Store
vi.mock("./store", () => ({
  useSubmissionsStore: vi.fn(),
}));

describe("SubmissionsPage", () => {
  const mockPollSubmission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // 設定 Store 的預設假狀態
    vi.mocked(useSubmissionsStore).mockReturnValue({
      currentSubmission: null,
      isLoading: false,
      pollSubmission: mockPollSubmission,
      clearCurrent: vi.fn(),
    } as any);
  });

  it("當 location.state 沒有 submissionId 時，應該顯示提示訊息，且不觸發輪詢", () => {
    // 模擬空狀態的 location
    vi.mocked(useLocation).mockReturnValue({ state: null } as any);

    render(<SubmissionsPage />);

    expect(screen.getByText("Submission Result")).toBeInTheDocument();
    expect(screen.getByText(/No recent submission found/)).toBeInTheDocument();

    // 驗證 pollSubmission 絕對沒有被呼叫
    expect(mockPollSubmission).not.toHaveBeenCalled();
  });

  it("當 location.state 有 submissionId 時，應該立刻觸發 pollSubmission 並渲染清單", () => {
    // 模擬從上一頁傳過來的 location.state
    vi.mocked(useLocation).mockReturnValue({ state: { submissionId: "sub-999" } } as any);

    // 模擬 Store 裡已經抓到了資料
    vi.mocked(useSubmissionsStore).mockReturnValue({
      currentSubmission: { id: "sub-999", status: "Pending" },
      isLoading: true,
      pollSubmission: mockPollSubmission,
      clearCurrent: vi.fn(),
    } as any);

    render(<SubmissionsPage />);

    // 驗證 pollSubmission 有被正確的 ID 呼叫
    expect(mockPollSubmission).toHaveBeenCalledWith("sub-999");

    // 驗證 SubmissionList 有被渲染出來 (這裡我們抓取 Pending 的特徵字)
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
