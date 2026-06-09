import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InterviewerDashboard from "./index";
import { BrowserRouter } from "react-router-dom";
import { apiClient, createCandidate } from "../../services/api";
import {
  assignProblem,
  unassignProblem,
  fetchCandidateAssignments,
} from "../../features/problems/api";

// Mock dependencies
vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  createCandidate: vi.fn(),
}));

vi.mock("../../features/problems/api", () => ({
  assignProblem: vi.fn(),
  unassignProblem: vi.fn(),
  fetchCandidateAssignments: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("InterviewerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <InterviewerDashboard />
      </BrowserRouter>,
    );
  };

  it("renders the dashboard with New Problem tab by default", () => {
    renderComponent();
    expect(screen.getByText("SMC Dashboard")).toBeInTheDocument();
    expect(screen.getByText("New Problem", { selector: "h2" })).toBeInTheDocument();
  });

  it("handles creating candidate credentials", async () => {
    (createCandidate as any).mockResolvedValueOnce({});

    // Stub alert
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderComponent();

    const generateBtn = screen.getByText("Generate Credentials");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(createCandidate).toHaveBeenCalled();
    });

    expect(screen.getByText("Account:")).toBeInTheDocument();
    expect(screen.getByText("Password:")).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith("Account created successfully.");
    alertMock.mockRestore();
  });

  it("handles failure when creating candidate credentials", async () => {
    (createCandidate as any).mockRejectedValueOnce(new Error("Failed"));
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderComponent();

    const generateBtn = screen.getByText("Generate Credentials");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Failed to create account. Check server status.");
    });
    alertMock.mockRestore();
  });

  it("navigates to Submissions when View Submissions is clicked", () => {
    renderComponent();
    const viewSubmissionsBtn = screen.getByText("View Submissions");
    fireEvent.click(viewSubmissionsBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/submissions");
  });

  it("fetches and displays Problem Bank when the tab is clicked", async () => {
    const mockProblems = [{ id: 1, title: "Problem 1", difficulty: "Easy", description: "Desc 1" }];
    (apiClient.get as any).mockResolvedValueOnce({ data: mockProblems });
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderComponent();

    const problemBankTab = screen.getByText("Problem Bank", { selector: "button" });
    fireEvent.click(problemBankTab);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/problems");
    });

    expect(screen.getByText("Problem 1")).toBeInTheDocument();
    alertMock.mockRestore();
  });

  it("handles failure when fetching problems", async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error("Failed"));
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderComponent();

    const problemBankTab = screen.getByText("Problem Bank", { selector: "button" });
    fireEvent.click(problemBankTab);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        "Failed to fetch problems. Check permissions or server.",
      );
    });
    alertMock.mockRestore();
  });

  it("opens Assign Problems tab and fetches required data", async () => {
    const mockCandidates = [{ id: "c1", username: "cand1" }];
    const mockProblems = [{ id: 1, title: "Problem 1", difficulty: "Easy" }];

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/interviewer/candidates") return Promise.resolve({ data: mockCandidates });
      if (url === "/problems") return Promise.resolve({ data: mockProblems });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    const assignProblemsTab = screen.getByText("Assign Problems", { selector: "button" });
    fireEvent.click(assignProblemsTab);

    await waitFor(() => {
      expect(screen.getByText("Assign Problems", { selector: "h2" })).toBeInTheDocument();
      expect(screen.getByText("Select a candidate to manage assignments")).toBeInTheDocument();
    });
  });

  it("allows selecting a candidate and assigns/unassigns a problem", async () => {
    const mockCandidates = [{ id: "c1", username: "cand1" }];
    const mockProblems = [{ id: 1, title: "Problem 1", difficulty: "Easy" }];

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/interviewer/candidates") return Promise.resolve({ data: mockCandidates });
      if (url === "/problems") return Promise.resolve({ data: mockProblems });
      return Promise.resolve({ data: [] });
    });

    (fetchCandidateAssignments as any).mockResolvedValueOnce([1]); // Assigned initially

    renderComponent();

    const assignProblemsTab = screen.getByText("Assign Problems", { selector: "button" });
    fireEvent.click(assignProblemsTab);

    await waitFor(() => {
      expect(screen.getByText("Assign Problems", { selector: "h2" })).toBeInTheDocument();
    });

    // Select candidate
    const selectTrigger = screen.getByText("— Select a candidate —", { selector: "span" });
    fireEvent.click(selectTrigger);

    const candidateOption = await screen.findByText("cand1");
    fireEvent.click(candidateOption);

    await waitFor(() => {
      expect(fetchCandidateAssignments).toHaveBeenCalledWith("c1");
    });

    // Now the problem is displayed as assigned, button should say "Unassign"
    expect(screen.getByText("Problem 1")).toBeInTheDocument();

    const unassignBtn = await screen.findByText("Unassign");
    (unassignProblem as any).mockResolvedValueOnce({});
    fireEvent.click(unassignBtn);

    await waitFor(() => {
      expect(unassignProblem).toHaveBeenCalledWith("c1", "1");
    });

    const assignBtn = await screen.findByText("Assign");
    (assignProblem as any).mockResolvedValueOnce({});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(assignProblem).toHaveBeenCalledWith("c1", "1");
    });
  });

  it("allows creating a new problem", async () => {
    (apiClient.post as any).mockResolvedValueOnce({});
    (apiClient.get as any).mockResolvedValueOnce({ data: [] }); // fetchProblems call
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderComponent();

    const titleInput = screen.getByPlaceholderText("Problem title");
    const descInput = screen.getByPlaceholderText("Describe the problem in Markdown...");
    const testInput = screen.getByPlaceholderText("Input");
    const testOutput = screen.getByPlaceholderText("Expected Output");

    fireEvent.change(titleInput, { target: { value: "New Prob" } });
    fireEvent.change(descInput, { target: { value: "Prob Desc" } });
    fireEvent.change(testInput, { target: { value: "1" } });
    fireEvent.change(testOutput, { target: { value: "1" } });

    // Add another test case
    const addTcBtn = screen.getByText("+ Add Test Case");
    fireEvent.click(addTcBtn);

    const saveBtn = screen.getByText("Save Problem");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith("Problem saved successfully.");
    });

    alertMock.mockRestore();
  });

  it("opens modal and displays problem details", async () => {
    const mockProblems = [
      {
        id: 1,
        title: "Problem 1",
        difficulty: "Easy",
        description: "Desc 1",
        test_cases: [{ input: "a", expected_output: "b" }],
      },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: mockProblems });

    renderComponent();
    const problemBankTab = screen.getByText("Problem Bank", { selector: "button" });
    fireEvent.click(problemBankTab);

    await waitFor(() => {
      expect(screen.getByText("Problem 1")).toBeInTheDocument();
    });

    const detailsBtn = screen.getByText("View Details");
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      expect(screen.getByText("Desc 1")).toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
    });

    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Desc 1")).not.toBeInTheDocument();
    });
  });
});
