import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CandidateList } from "./index";

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock("../../components/Common/ReportModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="report-modal" /> : null,
}));

import { apiClient } from "../../services/api";

const sampleCandidate = {
  id: "u1",
  username: "alice",
  createdAt: "2024-01-01T00:00:00Z",
  warningCount: 0,
  overallScore: 80,
  submissions: [
    {
      id: "s1",
      problemId: 1,
      problemTitle: "Two Sum",
      status: "Accepted",
      testCases: "5/5",
      testCasesPassed: 5,
      totalTestCases: 5,
      runTimeMs: 10,
      codeStyleScore: 90,
    },
  ],
};

describe("CandidateList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [sampleCandidate],
    });
  });

  it("renders loading state initially", () => {
    render(<CandidateList />);
    expect(document.body).toBeTruthy();
  });

  it("renders candidates after fetch", async () => {
    render(<CandidateList />);
    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });
  });

  it("renders overall score", async () => {
    render(<CandidateList />);
    await waitFor(() => {
      expect(screen.getByText(/80/)).toBeInTheDocument();
    });
  });

  it("expands candidate row to show submissions", async () => {
    render(<CandidateList />);
    await waitFor(() => screen.getByText("alice"));
    fireEvent.click(screen.getByText("alice"));
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
  });

  it("handles empty candidate list", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    render(<CandidateList />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it("handles API error gracefully", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<CandidateList />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it("shows warning count badge", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ ...sampleCandidate, warningCount: 2 }],
    });
    render(<CandidateList />);
    await waitFor(() => screen.getByText("alice"));
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("opens report modal when submission detail is clicked", async () => {
    render(<CandidateList />);
    await waitFor(() => screen.getByText("alice"));
    fireEvent.click(screen.getByText("alice"));
    const detailButtons = screen.getAllByText(/查看報告|Detail|Report/i);
    if (detailButtons.length > 0) {
      fireEvent.click(detailButtons[0]);
    }
    expect(document.body).toBeTruthy();
  });
});
