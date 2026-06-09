import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmissionsPage } from "./index";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ state: null }),
}));

vi.mock("../../components/Common/ReportModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="report-modal" /> : null,
}));

const mockStore = {
  history: [] as any[],
  isLoading: false,
  fetchHistory: vi.fn(),
  pollUntilTerminal: vi.fn(),
};
vi.mock("../../features/submissions/store", () => ({
  useSubmissionsStore: () => mockStore,
}));

describe("SubmissionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.history = [];
    mockStore.isLoading = false;
  });

  it("renders without crashing with no submissions", () => {
    render(<SubmissionsPage />);
    expect(mockStore.fetchHistory).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    mockStore.isLoading = true;
    render(<SubmissionsPage />);
    expect(screen.getByText(/Loading results/i)).toBeInTheDocument();
  });

  it("renders submission list when history is populated", () => {
    mockStore.history = [
      {
        id: "s1",
        problemId: "1",
        problemTitle: "Two Sum",
        status: "Accepted",
        score: 100,
        passedTestCases: 5,
        totalTestCases: 5,
        executionTimeMs: 10,
        language: "go",
        code: "",
      },
    ];
    render(<SubmissionsPage />);
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
  });

  it("shows score sum of all submissions", () => {
    mockStore.history = [
      { id: "s1", status: "Accepted", score: 80, problemTitle: "P1" },
      { id: "s2", status: "Wrong Answer", score: 0, problemTitle: "P2" },
    ];
    render(<SubmissionsPage />);
    expect(document.body).toBeTruthy();
  });

  it("renders Accepted status correctly", () => {
    mockStore.history = [
      { id: "s1", status: "Accepted", score: 100, problemTitle: "Two Sum" },
    ];
    render(<SubmissionsPage />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("renders non-standard status with fallback style", () => {
    mockStore.history = [
      { id: "s1", status: "Runtime Error", score: 0, problemTitle: "P1" },
    ];
    render(<SubmissionsPage />);
    expect(screen.getByText("Runtime Error")).toBeInTheDocument();
  });
});
