import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportModal from "./ReportModal";
import { apiClient } from "../../services/api";

// Mock API Client
vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("ReportModal", () => {
  const mockSubmissionId = "sub-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("如果 submissionId 是 null，不應渲染任何東西", () => {
    const { container } = render(<ReportModal submissionId={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("成功取得報告資料時，應渲染報告內容", async () => {
    const mockData = {
      id: mockSubmissionId,
      username: "test_user",
      code: "print('hello')",
      language: "Python",
      score: 100,
      warningCount: 0,
      isSuspicious: false,
      status: "Accepted",
      createdAt: "2024-01-01",
    };

    // 模擬 API 成功回傳
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    render(<ReportModal submissionId={mockSubmissionId} onClose={vi.fn()} />);

    // 一開始應該有 Loading 狀態
    expect(screen.getByText(/Loading report/i)).toBeInTheDocument();

    // 等待資料載入並渲染
    await waitFor(() => {
      expect(screen.getByText("test_user")).toBeInTheDocument();
    });

    expect(screen.getByText("print('hello')")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // 分數
    expect(screen.getByText("Accepted")).toBeInTheDocument(); // 狀態
    expect(screen.getByText("No abnormal behavior detected during the exam.")).toBeInTheDocument();
  });

  it("當發生錯誤時，應顯示錯誤訊息", async () => {
    // 模擬 API 失敗
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network Error"));

    render(<ReportModal submissionId={mockSubmissionId} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("無法取得報告資料")).toBeInTheDocument();
    });
  });

  it("點擊關閉按鈕時，應呼叫 onClose", () => {
    const handleClose = vi.fn();
    // 保持 Loading 狀態即可測按鈕
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));

    render(<ReportModal submissionId={mockSubmissionId} onClose={handleClose} />);

    // 找叉叉按鈕 (透過 svg 的外層 button)
    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
