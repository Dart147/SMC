import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExamLayout } from "./ExamLayout";
import { useAuth } from "../features/auth/hooks/useAuth";
import { BrowserRouter } from "react-router-dom";

// ==========================================
// 1. Mocks
// ==========================================
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// 攔截防弊 hook 的 callback，讓我們可以在測試中手動觸發「作弊」事件
let triggerCheat: () => void;
vi.mock("../hooks/useAntiCheat", () => ({
  useAntiCheat: (cb: () => void) => {
    triggerCheat = cb;
  },
}));

describe("ExamLayout", () => {
  const mockLogout = vi.fn();
  let fetchMock: any;
  let confirmMock: any;
  let alertMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock APIs and Globals
    fetchMock = vi.fn();
    confirmMock = vi.fn().mockReturnValue(true);
    alertMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", confirmMock);
    vi.stubGlobal("alert", alertMock);

    // Mock Fullscreen API
    Object.defineProperty(document, "fullscreenElement", { value: null, writable: true });
    Object.defineProperty(document, "exitFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
    });

    (useAuth as any).mockImplementation((selector: any) => {
      const state = { user: { role: "candidate" }, token: "test-token", logout: mockLogout };
      return selector ? selector(state) : state;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <ExamLayout />
      </BrowserRouter>,
    );

  it("renders pure Outlet for admin users", () => {
    (useAuth as any).mockImplementation((selector: any) => {
      return selector({ user: { role: "admin" } });
    });

    renderComponent();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.queryByText("提早交卷")).not.toBeInTheDocument();
  });

  it("renders anti-cheat layout for candidate users", () => {
    renderComponent();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByText("提早交卷")).toBeInTheDocument();
  });

  it("handles early submission (End Exam) successfully", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    renderComponent();

    fireEvent.click(screen.getByText("提早交卷"));

    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/exams/end", expect.any(Object));
      expect(alertMock).toHaveBeenCalledWith("✅ 交卷成功！感謝您的參與。");
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  it("triggers anti-cheat warning modal when cheat detected", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ warning_count: 1 }) });
    renderComponent();

    // 手動觸發作弊
    await act(async () => {
      triggerCheat();
    });

    expect(screen.getByText("⚠️ 違規警告")).toBeInTheDocument();
    expect(screen.getByText("目前違規次數：1 / 3")).toBeInTheDocument();

    // 點擊回到全螢幕按鈕
    fireEvent.click(screen.getByText("點我重新回到全螢幕並繼續作答"));

    // 驗證核心邏輯：是否有呼叫全螢幕 API
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  it("forces logout when cheat count reaches 3", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ warning_count: 3 }) });
    renderComponent();

    await act(async () => {
      triggerCheat();
    });

    expect(screen.getByText("目前違規次數：3 / 3")).toBeInTheDocument();

    // 推進 setTimeout 100ms
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(alertMock).toHaveBeenCalledWith(
      "🚨 系統偵測您已嚴重違規達 3 次！系統已自動交卷並將您強制登出。",
    );
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });

    vi.useRealTimers();
  });
});
