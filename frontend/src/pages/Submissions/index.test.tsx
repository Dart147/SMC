import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmissionsPage } from "./index";
import { useSubmissionsStore } from "../../features/submissions/store";

// ==========================================
// 1. Mocks
// ==========================================

// Mock react-router-dom 的 useLocation
const mockUseLocation = vi.fn();
vi.mock("react-router-dom", () => ({
  useLocation: () => mockUseLocation(),
}));

// Mock Zustand Store
const mockFetchHistory = vi.fn();
const mockPollUntilTerminal = vi.fn();
vi.mock("../../features/submissions/store", () => ({
  useSubmissionsStore: vi.fn(),
}));

// Mock ReportModal，避免真的去呼叫後端 API
vi.mock("../../components/Common/ReportModal", () => ({
  default: ({ submissionId, onClose }: { submissionId: string; onClose: () => void }) => (
    <div data-testid="mock-report-modal">
      <p>Report ID: {submissionId}</p>
      <button onClick={onClose} data-testid="close-modal-btn">
        Close Modal
      </button>
    </div>
  ),
}));

// ==========================================
// 2. Test Suite
// ==========================================

describe("SubmissionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 預設 Location 狀態
    mockUseLocation.mockReturnValue({ state: null });

    // 預設 Store 狀態
    (useSubmissionsStore as any).mockReturnValue({
      history: [],
      isLoading: false,
      fetchHistory: mockFetchHistory,
      pollUntilTerminal: mockPollUntilTerminal,
    });
  });

  it("renders loading state correctly", () => {
    (useSubmissionsStore as any).mockReturnValue({
      history: [],
      isLoading: true, // 觸發 Loading
      fetchHistory: mockFetchHistory,
      pollUntilTerminal: mockPollUntilTerminal,
    });

    render(<SubmissionsPage />);
    expect(screen.getByText("Loading results...")).toBeInTheDocument();
  });

  it("renders empty state correctly", () => {
    render(<SubmissionsPage />);
    expect(screen.getByText("No submissions yet. Write some code and submit!")).toBeInTheDocument();
    expect(screen.getByText("0 submissions")).toBeInTheDocument(); // 總數計算
    expect(screen.getByText("0 pts")).toBeInTheDocument(); // 總分計算
  });

  it("renders submission history and calculates total score", () => {
    const mockHistory = [
      {
        id: "sub-1",
        problemId: 1,
        problemTitle: "Two Sum",
        language: "python",
        status: "Accepted",
        passedTestCases: 2,
        totalTestCases: 2,
        score: 100,
        executionTimeMs: 15,
      },
      {
        id: "sub-2",
        problemId: 2,
        problemTitle: "Valid Palindrome",
        language: "cpp",
        status: "Runtime Error",
        passedTestCases: 0,
        totalTestCases: 3,
        score: 0,
        executionTimeMs: 0, // 測試 executionTimeMs 為 0 時顯示 "—"
      },
    ];

    (useSubmissionsStore as any).mockReturnValue({
      history: mockHistory,
      isLoading: false,
      fetchHistory: mockFetchHistory,
      pollUntilTerminal: mockPollUntilTerminal,
    });

    render(<SubmissionsPage />);

    // 檢查總計
    expect(screen.getByText("2 submissions")).toBeInTheDocument();
    expect(screen.getByText("100 pts")).toBeInTheDocument(); // 100 + 0

    // 檢查第一筆資料 (Accepted)
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByText("15 ms")).toBeInTheDocument();

    // 檢查第二筆資料 (Runtime Error & 邊界情況)
    expect(screen.getByText("Valid Palindrome")).toBeInTheDocument();
    expect(screen.getByText("cpp")).toBeInTheDocument();
    expect(screen.getByText("Runtime Error")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument(); // 時間為 0 時的處理
  });

  it("triggers fetchHistory on mount", () => {
    render(<SubmissionsPage />);
    expect(mockFetchHistory).toHaveBeenCalledTimes(1);
    expect(mockPollUntilTerminal).not.toHaveBeenCalled();
  });

  it("triggers pollUntilTerminal if redirected with stillPending=true", () => {
    mockUseLocation.mockReturnValue({
      state: { submissionId: "sub-123", stillPending: true },
    });

    render(<SubmissionsPage />);

    expect(mockFetchHistory).toHaveBeenCalledTimes(1);
    // 確認 pollUntilTerminal 有被正確帶入 ID 與 fetchHistory callback 呼叫
    expect(mockPollUntilTerminal).toHaveBeenCalledWith("sub-123", mockFetchHistory);
  });

  it("highlights the latest submission row", () => {
    mockUseLocation.mockReturnValue({
      state: { submissionId: "sub-highlight" },
    });

    const mockHistory = [
      { id: "sub-normal", problemTitle: "Normal", status: "Accepted" },
      { id: "sub-highlight", problemTitle: "Highlight", status: "Pending" },
    ];

    (useSubmissionsStore as any).mockReturnValue({
      history: mockHistory,
      isLoading: false,
      fetchHistory: mockFetchHistory,
      pollUntilTerminal: mockPollUntilTerminal,
    });

    const { container } = render(<SubmissionsPage />);

    // 我們可以透過尋找特定 class 來確認高亮邏輯是否生效
    // "bg-slate-900 border-indigo-700/40 shadow-lg" 是高亮的 CSS
    const highlightRow = container.querySelector('[class*="border-indigo"]');
    expect(highlightRow).toBeInTheDocument();
    expect(highlightRow).toHaveTextContent("Highlight");
  });

  it("opens and closes the ReportModal when action button is clicked", () => {
    const mockHistory = [{ id: "sub-modal-test", problemTitle: "Test Prob", status: "Accepted" }];

    (useSubmissionsStore as any).mockReturnValue({
      history: mockHistory,
      isLoading: false,
      fetchHistory: mockFetchHistory,
      pollUntilTerminal: mockPollUntilTerminal,
    });

    render(<SubmissionsPage />);

    // 一開始 Modal 不該存在
    expect(screen.queryByTestId("mock-report-modal")).not.toBeInTheDocument();

    // 點擊 Report 按鈕
    const reportBtn = screen.getByText("Report");
    fireEvent.click(reportBtn);

    // Modal 應該被開啟，並且顯示正確的 ID
    expect(screen.getByTestId("mock-report-modal")).toBeInTheDocument();
    expect(screen.getByText("Report ID: sub-modal-test")).toBeInTheDocument();

    // 點擊關閉按鈕
    const closeBtn = screen.getByTestId("close-modal-btn");
    fireEvent.click(closeBtn);

    // Modal 應該被移除
    expect(screen.queryByTestId("mock-report-modal")).not.toBeInTheDocument();
  });
});
