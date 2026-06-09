import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CandidateList } from "./CandidateList";
import { apiClient } from "../services/api";

// Mock API
vi.mock("../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock ReportModal
vi.mock("../components/Common/ReportModal", () => ({
  default: ({ submissionId, onClose }: any) => (
    <div data-testid="report-modal">
      <span>Modal for {submissionId}</span>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

describe("CandidateList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidates = [
    {
      id: "c1",
      username: "student1",
      createdAt: "2023-01-01",
      warningCount: 0,
      overallScore: 100,
      submissions: [
        {
          id: "sub1",
          problemId: 1,
          problemTitle: "Two Sum",
          status: "Accepted",
          testCases: "5/5",
          testCasesPassed: 5,
          totalTestCases: 5,
          runTimeMs: 12,
          codeStyleScore: 95,
        },
      ],
    },
    {
      id: "c2",
      username: "student2",
      createdAt: "2023-01-02",
      warningCount: 2,
      overallScore: 60,
      submissions: [
        {
          id: "sub2",
          problemId: 2,
          problemTitle: "Reverse String",
          status: "Wrong Answer",
          testCases: "1/5",
          testCasesPassed: 1,
          totalTestCases: 5,
          runTimeMs: 25,
          codeStyleScore: 50,
        },
      ],
    },
  ];

  it("renders loading state initially and then displays candidates", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockCandidates });

    render(<CandidateList />);

    expect(screen.getByText("載入應試者資料中...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("載入應試者資料中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("student1")).toBeInTheDocument();
    expect(screen.getByText("student2")).toBeInTheDocument();

    // Check points
    expect(screen.getByText("100 pts")).toBeInTheDocument();
    expect(screen.getByText("60 pts")).toBeInTheDocument();

    // Check warning counts
    expect(screen.getByText("0", { selector: "span.text-emerald-400" })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "span.text-red-400" })).toBeInTheDocument();
  });

  it("handles api error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (apiClient.get as any).mockRejectedValue(new Error("API Error"));

    render(<CandidateList />);

    await waitFor(() => {
      expect(screen.queryByText("載入應試者資料中...")).not.toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith("無法更新考生列表", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("expands candidate row to show submissions", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockCandidates });

    render(<CandidateList />);

    await waitFor(() => {
      expect(screen.getByText("student1")).toBeInTheDocument();
    });

    const student1Row = screen.getByText("student1").closest("div.cursor-pointer");
    fireEvent.click(student1Row!);

    await waitFor(() => {
      expect(screen.getByText("Submission Details")).toBeInTheDocument();
    });

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(student1Row!);
    await waitFor(() => {
      expect(screen.queryByText("Submission Details")).not.toBeInTheDocument();
    });
  });

  it("opens ReportModal when View Code is clicked", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockCandidates });

    render(<CandidateList />);

    await waitFor(() => {
      expect(screen.getByText("student1")).toBeInTheDocument();
    });

    const student1Row = screen.getByText("student1").closest("div.cursor-pointer");
    fireEvent.click(student1Row!);

    const viewCodeBtn = await screen.findByText("View Code");
    fireEvent.click(viewCodeBtn);

    expect(screen.getByTestId("report-modal")).toBeInTheDocument();
    expect(screen.getByText("Modal for sub1")).toBeInTheDocument();

    const closeModalBtn = screen.getByText("Close Modal");
    fireEvent.click(closeModalBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("report-modal")).not.toBeInTheDocument();
    });
  });

  it("fetches candidates periodically", async () => {
    vi.useFakeTimers();
    (apiClient.get as any)
      .mockResolvedValueOnce({ data: [] }) // initial fetch
      .mockResolvedValueOnce({ data: mockCandidates }); // interval fetch

    // Render and wrap in act to handle initial fetch
    await act(async () => {
      render(<CandidateList />);
      // wait for microtasks
      await Promise.resolve();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Advance timers inside act
    await act(async () => {
      vi.advanceTimersByTime(3000);
      // wait for microtasks (the fetch)
      await Promise.resolve();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
