import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DisclaimerPage } from "./index";
import { useAuth } from "../../features/auth/hooks/useAuth";
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
  };
});

// Mock useAuth，直接回傳一個假的 token
vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// ==========================================
// 2. Test Suite
// ==========================================
describe("DisclaimerPage", () => {
  let fetchMock: any;
  let requestFullscreenMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 模擬 useAuth(state => state.token) 回傳 "fake-token-123"
    (useAuth as any).mockImplementation((selector: any) => {
      if (typeof selector === "function") {
        return selector({ token: "fake-token-123" });
      }
      return { token: "fake-token-123" };
    });

    // 模擬全域 fetch
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // 模擬 document.documentElement.requestFullscreen
    requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: requestFullscreenMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <DisclaimerPage />
      </BrowserRouter>,
    );

  it("renders the disclaimer rules and start button correctly", () => {
    renderComponent();
    expect(screen.getByText("測驗規範與防弊宣告")).toBeInTheDocument();
    expect(screen.getByText(/禁止切換視窗/i)).toBeInTheDocument();
    expect(screen.getByText("我已瞭解規範，進入全螢幕開考")).toBeInTheDocument();
  });

  it("successfully requests fullscreen, starts exam, and navigates", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    renderComponent();

    const startBtn = screen.getByText("我已瞭解規範，進入全螢幕開考");
    fireEvent.click(startBtn);

    // 點擊後，按鈕會進入 Loading 狀態並被禁用
    expect(startBtn).toBeDisabled();

    await waitFor(() => {
      // 驗證是否有呼叫全螢幕 API
      expect(requestFullscreenMock).toHaveBeenCalled();

      // 驗證是否有正確攜帶 Token 呼叫後端 API
      expect(fetchMock).toHaveBeenCalledWith("/api/exams/start", {
        method: "POST",
        headers: {
          Authorization: "Bearer fake-token-123",
          "Content-Type": "application/json",
        },
      });

      // 驗證是否導向 Problem List
      expect(mockNavigate).toHaveBeenCalledWith("/problems", { replace: true });
    });
  });

  it("shows an error if the browser does not support fullscreen", async () => {
    // 將 requestFullscreen 設為 undefined 模擬不支援的環境
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderComponent();

    const startBtn = screen.getByText("我已瞭解規範，進入全螢幕開考");
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(
        screen.getByText("您的瀏覽器不支援全螢幕功能，請使用 Chrome 或 Edge 瀏覽器。"),
      ).toBeInTheDocument();
      // 驗證錯誤發生時，不會呼叫 API 與跳轉
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("shows an error if the API request fails (response.ok is false)", async () => {
    // 模擬後端回傳 500 錯誤等非 ok 狀態
    fetchMock.mockResolvedValueOnce({ ok: false });
    renderComponent();

    const startBtn = screen.getByText("我已瞭解規範，進入全螢幕開考");
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled();
      expect(screen.getByText("無法啟動考試連線，請稍後再試或聯絡助教。")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("shows an error if the API request throws an exception", async () => {
    // 模擬網路斷線等嚴重錯誤
    fetchMock.mockRejectedValueOnce(new Error("Network Error"));
    renderComponent();

    const startBtn = screen.getByText("我已瞭解規範，進入全螢幕開考");
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled();
      expect(screen.getByText("Network Error")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
