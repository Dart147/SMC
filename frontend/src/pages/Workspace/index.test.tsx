import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Workspace } from "./index";
import { BrowserRouter } from "react-router-dom";
import { fetchProblemById } from "../../features/problems/api";
import { apiClient } from "../../services/api";
import { useWorkspaceStore } from "../../features/workspace/store";
import { useRunCode } from "../../features/workspace/hooks/useRunCode";
import { useRunSample } from "../../features/workspace/hooks/useRunSample";

// ==========================================
// 1. Mocks
// ==========================================

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ problemId: "1" }),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-mock">{to}</div>,
  };
});

vi.mock("../../features/problems/api", () => ({
  fetchProblemById: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  Group: ({ children }: any) => <div data-testid="group">{children}</div>,
  Separator: () => <div data-testid="separator" />,
}));

vi.mock("../../features/workspace/hooks/useRunCode", () => ({
  useRunCode: vi.fn(),
}));

vi.mock("../../features/workspace/hooks/useRunSample", () => ({
  useRunSample: vi.fn(),
}));

// ==========================================
// 2. Global Environment Polyfills (Monaco/Panel)
// ==========================================

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Monaco Editor frequently requires matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 保存 Zustand 的初始狀態以供每次測試還原
const originalStore = useWorkspaceStore.getState();

// ==========================================
// 3. Test Suite
// ==========================================

describe("Workspace Page", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // 加上 true 代表 "replace"，會把 store 徹底還原成乾淨狀態
    useWorkspaceStore.setState(originalStore, true);

    // Setup localStorage mock
    mockStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = value.toString();
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    // Default mock returns for custom hooks
    (useRunCode as any).mockReturnValue({ runCode: vi.fn(), isRunning: false });
    (useRunSample as any).mockReturnValue({ runSample: vi.fn(), isRunSample: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers(); // 確保每個測試結束後恢復真實計時器
  });

  const mockProblem = {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers...",
    testCases: [{ input: "a", expected_output: "b" }],
  };

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );
  };

  it("renders loading state initially", async () => {
    (fetchProblemById as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockProblem), 100)),
    );

    renderComponent();
    expect(screen.getByText("Loading workspace...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });
  });

  it("navigates to /problems when problemId is invalid or fetch fails", async () => {
    (fetchProblemById as any).mockRejectedValueOnce(new Error("Not found"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("navigate-mock")).toHaveTextContent("/problems");
    });
  });

  it("loads problem and falls back to skeleton if no draft exists", async () => {
    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockRejectedValueOnce(new Error("No submission"));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    // Default language is python, should set skeleton for python
    expect(useWorkspaceStore.getState().language).toBe("python");
    expect(useWorkspaceStore.getState().code).toContain("def ");
  });

  it("loads draft from localStorage if available", async () => {
    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);

    mockStorage["smc_lang_1"] = "javascript";
    mockStorage["smc_draft_1_javascript"] = "console.log('from ls');";

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    expect(useWorkspaceStore.getState().language).toBe("javascript");
    expect(useWorkspaceStore.getState().code).toBe("console.log('from ls');");
  });

  it("loads draft from latest submission API if localStorage is empty", async () => {
    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockResolvedValueOnce({
      data: { language: "cpp", code: "cout << 'from api';" },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    expect(useWorkspaceStore.getState().language).toBe("cpp");
    expect(useWorkspaceStore.getState().code).toBe("cout << 'from api';");
    expect(mockStorage["smc_lang_1"]).toBe("cpp");
    expect(mockStorage["smc_draft_1_cpp"]).toBe("cout << 'from api';");
  });

  it("handles language switch and restores draft for new language", async () => {
    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockRejectedValueOnce(new Error("No api draft"));

    // 🌟 將原本的 java 改成真實存在的 go
    mockStorage["smc_draft_1_go"] = "fmt.Println('go draft');";

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    const selectEl = screen.getByRole("combobox");

    // 🌟 觸發切換為 go
    fireEvent.change(selectEl, { target: { value: "go" } });

    await waitFor(() => {
      // 🌟 驗證是否成功切換並讀取到 localStorage 裡的 go 程式碼
      expect(useWorkspaceStore.getState().language).toBe("go");
      expect(useWorkspaceStore.getState().code).toBe("fmt.Println('go draft');");
    });
  });

  it("triggers runCode and runSample", async () => {
    const mockRunCode = vi.fn();
    const mockRunSample = vi.fn();
    (useRunCode as any).mockReturnValue({ runCode: mockRunCode, isRunning: false });
    (useRunSample as any).mockReturnValue({ runSample: mockRunSample, isRunSample: false });

    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockRejectedValueOnce(new Error("No api draft"));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    const submitBtn = screen.getByText("Submit");
    fireEvent.click(submitBtn);
    expect(mockRunCode).toHaveBeenCalled();
  });

  it("disables buttons when running", async () => {
    (useRunCode as any).mockReturnValue({ runCode: vi.fn(), isRunning: true });
    (useRunSample as any).mockReturnValue({ runSample: vi.fn(), isRunSample: true });

    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockRejectedValueOnce(new Error("No api draft"));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    const runningBtns = screen.getAllByText("Running...");
    const submittingBtn = screen.getByText("Submitting...");

    runningBtns.forEach((btn) => expect(btn).toBeDisabled());
    expect(submittingBtn).toBeDisabled();
  });

  it("saves code to localStorage on debounce", async () => {
    // 🚨 關鍵修復：不要在這裡呼叫 vi.useFakeTimers()，會讓後面的 waitFor 死鎖
    (fetchProblemById as any).mockResolvedValueOnce(mockProblem);
    (apiClient.get as any).mockRejectedValueOnce(new Error("No api draft"));

    renderComponent();

    // 先用「真實時間」等待元件初次渲染與 API 解析完成
    await waitFor(() => {
      expect(screen.queryByText("Loading workspace...")).not.toBeInTheDocument();
    });

    // 等畫面穩定後，再切換成「虛擬時間」來測試 debounce
    vi.useFakeTimers();

    // 觸發 Zustand Store 更新程式碼
    act(() => {
      useWorkspaceStore.getState().setCode("print('new code')");
    });

    // 推進計時器 (觸發 lodash/debounce 或是 setTimeout)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // 驗證 localStorage 是否正確存入
    expect(mockStorage["smc_draft_1_python"]).toBe("print('new code')");
  });
});
