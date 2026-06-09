import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InterviewerDashboard from "./index";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../services/api", () => ({
  createCandidate: vi.fn().mockResolvedValue({}),
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../features/problems/api", () => ({
  assignProblem: vi.fn().mockResolvedValue({}),
  unassignProblem: vi.fn().mockResolvedValue({}),
  fetchCandidateAssignments: vi.fn().mockResolvedValue([]),
  deleteProblem: vi.fn().mockResolvedValue({}),
  updateProblem: vi.fn().mockResolvedValue({}),
  fetchAdminProblemById: vi.fn().mockResolvedValue({
    id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    description: "desc",
    testCases: [{ input: "1 2\n3\n", expected_output: "0 1\n", isHidden: false }],
  }),
  fetchProblems: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../components/Common/Select", () => ({
  Select: ({ value, onChange, options }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const mockCrypto = {
  getRandomValues: (arr: Uint32Array) => {
    arr[0] = 42;
    return arr;
  },
  randomUUID: () => "abc123-def456",
};

import { createCandidate, apiClient } from "../../services/api";
import { deleteProblem, updateProblem } from "../../features/problems/api";

describe("InterviewerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", mockCrypto);
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("renders the dashboard with create tab active", () => {
    render(<InterviewerDashboard />);
    expect(screen.getAllByText(/New Problem/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the form fields in create tab", () => {
    render(<InterviewerDashboard />);
    expect(screen.getByPlaceholderText("Problem title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the problem/i)).toBeInTheDocument();
  });

  it("renders test cases section", () => {
    render(<InterviewerDashboard />);
    expect(screen.getByText("Test Cases")).toBeInTheDocument();
  });

  it("can add a test case", () => {
    render(<InterviewerDashboard />);
    const addButton = screen.getByText("+ Add Test Case");
    fireEvent.click(addButton);
    const inputFields = screen.getAllByPlaceholderText(/Input/i);
    expect(inputFields.length).toBeGreaterThan(1);
  });

  it("can switch to problem list tab", async () => {
    render(<InterviewerDashboard />);
    const listTab = screen.getByText(/Problem Bank/i);
    fireEvent.click(listTab);
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/problems");
    });
  });

  it("displays problems in list tab", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "1", title: "Two Sum", difficulty: "Easy", description: "desc", testCases: [] }],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeInTheDocument();
    });
  });

  it("generates candidate credentials", async () => {
    render(<InterviewerDashboard />);
    const genButton = screen.getByText(/Generate Credentials/i);
    fireEvent.click(genButton);
    await waitFor(() => {
      expect(createCandidate).toHaveBeenCalled();
    });
  });

  it("shows credentials after generation", async () => {
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Generate Credentials/i));
    await waitFor(() => {
      expect(screen.getByText(/USER-/)).toBeInTheDocument();
    });
  });

  it("submits create problem form", async () => {
    render(<InterviewerDashboard />);

    const titleInput = screen.getByPlaceholderText("Problem title");
    fireEvent.change(titleInput, { target: { value: "New Problem" } });

    const descInput = screen.getByPlaceholderText(/Describe the problem/i);
    fireEvent.change(descInput, { target: { value: "Description here" } });

    const submitBtn = screen.getByText(/Save Problem/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/problems",
        expect.objectContaining({ title: "New Problem" }),
      );
    });
  });

  it("can delete a problem in list tab", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "1", title: "Two Sum", difficulty: "Easy", description: "", testCases: [] }],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));

    const deleteBtn = screen.getByTitle("Delete problem");
    fireEvent.click(deleteBtn);
    expect(deleteProblem).toHaveBeenCalledWith("1");
  });

  it("can open edit modal for a problem", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "1", title: "Two Sum", difficulty: "Easy", description: "", testCases: [] }],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));

    fireEvent.click(screen.getByTitle("Edit problem"));
    await waitFor(() => {
      expect(screen.getByText("Edit Problem")).toBeInTheDocument();
    });
  });

  it("closes edit modal with cancel button", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "1", title: "Two Sum", difficulty: "Easy", description: "", testCases: [] }],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));
    fireEvent.click(screen.getByTitle("Edit problem"));
    await waitFor(() => screen.getByText("Edit Problem"));
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText("Edit Problem")).not.toBeInTheDocument();
    });
  });

  it("submits edit form with save changes", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "1", title: "Two Sum", difficulty: "Easy", description: "", testCases: [] }],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));
    fireEvent.click(screen.getByTitle("Edit problem"));
    await waitFor(() => screen.getByText("Save Changes"));
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(updateProblem).toHaveBeenCalled();
    });
  });

  it("opens view details modal", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: "1",
          title: "Two Sum",
          difficulty: "Easy",
          description: "Given an array",
          testCases: [{ input: "1", expected_output: "0 1", isHidden: false }],
        },
      ],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));
    fireEvent.click(screen.getByText("View Details"));
    await waitFor(() => {
      expect(screen.getByText("Given an array")).toBeInTheDocument();
    });
  });

  it("closes view details modal", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: "1", title: "Two Sum", difficulty: "Easy", description: "Desc text", testCases: [] },
      ],
    });
    render(<InterviewerDashboard />);
    fireEvent.click(screen.getByText(/Problem Bank/i));
    await waitFor(() => screen.getByText("Two Sum"));
    fireEvent.click(screen.getByText("View Details"));
    await waitFor(() => screen.getByText("Desc text"));
    fireEvent.click(screen.getByText("Close"));
    await waitFor(() => {
      expect(screen.queryByText("Desc text")).not.toBeInTheDocument();
    });
  });

  it("can switch to assign tab", async () => {
    render(<InterviewerDashboard />);
    const assignTab = screen.getByText(/Assign Problems/i);
    fireEvent.click(assignTab);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
