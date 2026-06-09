import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Workspace } from "./index";
import { apiClient } from "../../services/api";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ problemId: "1" }),
  Navigate: ({ to }: { to: string }) => <div data-testid={`navigate-${to.replace(/\//g, "-")}`} />,
}));

vi.mock("../../features/workspace/components/CodeEditor", () => ({
  default: () => <div data-testid="code-editor" />,
}));

vi.mock("../../features/workspace/components/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar" />,
}));

vi.mock("../../features/workspace/components/ConsolePanel", () => ({
  ConsolePanel: () => <div data-testid="console-panel" />,
}));

vi.mock("../../features/problems/components/ProblemDescription", () => ({
  ProblemDescription: ({ problem }: any) => (
    <div data-testid="problem-description">{problem?.title}</div>
  ),
}));

vi.mock("../../components/Common/ResizeHandle", () => ({
  ResizeHandle: () => <div data-testid="resize-handle" />,
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children }: any) => <div>{children}</div>,
  Group: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("../../features/workspace/hooks/useRunCode", () => ({
  useRunCode: () => ({ runCode: vi.fn(), isRunning: false }),
}));

vi.mock("../../features/workspace/hooks/useRunSample", () => ({
  useRunSample: () => ({ runSample: vi.fn(), isRunSample: false }),
}));

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("../../hooks/useDebounce", () => ({
  useDebounce: (v: any) => v,
}));

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn().mockRejectedValue(new Error("no latest")),
    post: vi.fn(),
  },
}));

const mockFetchProblemById = vi.fn();
vi.mock("../../features/problems/api", () => ({
  fetchProblemById: (...args: any[]) => mockFetchProblemById(...args),
}));

const baseProblem = {
  id: "1",
  title: "Two Sum",
  difficulty: "Easy",
  description: "Given an array...",
  testCases: [{ input: "2 7\n9\n", expectedOutput: "0 1\n", isHidden: false }],
};

describe("Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchProblemById.mockResolvedValue(baseProblem);
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it("renders loading state initially", () => {
    mockFetchProblemById.mockImplementation(() => new Promise(() => {}));
    render(<Workspace />);
    expect(document.body).toBeTruthy();
  });

  it("renders problem description after loading", async () => {
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("problem-description")).toBeInTheDocument();
    });
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
  });

  it("renders code editor", async () => {
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
  });

  it("renders console panel", async () => {
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("console-panel")).toBeInTheDocument();
    });
  });

  it("renders editor toolbar", async () => {
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();
    });
  });

  it("navigates to /problems on not found", async () => {
    mockFetchProblemById.mockRejectedValue(new Error("not found"));
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("navigate--problems")).toBeInTheDocument();
    });
  });

  it("loads code from localStorage when available", async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === "smc_lang_1") return "python";
      if (key === "smc_draft_1_python") return "print('hello')";
      return null;
    });
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
  });

  it("loads code from latest submission api when no localStorage draft", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { code: "func main() {}", language: "go" },
    });
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenCalledWith("/submissions/latest", expect.any(Object));
  });

  it("uses skeleton when latest submission has no code", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });
    render(<Workspace />);
    await waitFor(() => {
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
  });
});
