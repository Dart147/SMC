import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MainLayout } from "./MainLayout";
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
    useLocation: () => ({ pathname: "/problems" }),
  };
});

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// ==========================================
// 2. Test Suite
// ==========================================
describe("MainLayout", () => {
  const mockLogout = vi.fn();

  // 確保這兩個變數宣告在 describe 區塊的最外層
  let alertMock: any;
  let confirmMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 每次測試前重新初始化它們
    alertMock = vi.fn();
    confirmMock = vi.fn().mockReturnValue(true);

    // 綁定到全域變數 window.alert 與 window.confirm
    vi.stubGlobal("alert", alertMock);
    vi.stubGlobal("confirm", confirmMock);

    (useAuth as any).mockReturnValue({
      user: null,
      examExpiresAt: null,
      logout: mockLogout,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>,
    );

  it("renders public layout without user", () => {
    renderComponent();
    expect(screen.getByText("SMC Judge")).toBeInTheDocument();
    expect(screen.queryByText(/登出|Logout/i)).not.toBeInTheDocument();
  });

  it("renders admin layout correctly", () => {
    (useAuth as any).mockReturnValue({
      user: { username: "Admin", role: "admin" },
      examExpiresAt: null,
      logout: mockLogout,
    });

    renderComponent();
    expect(screen.getByText("Control Panel")).toBeInTheDocument();
    expect(screen.getByText("Submissions")).toBeInTheDocument(); // Admin 獨有

    // Admin 登出不需確認
    fireEvent.click(screen.getByText(/登出|Logout/i));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("renders candidate layout and requires confirm for logout", () => {
    (useAuth as any).mockReturnValue({
      user: { username: "USER-123", role: "candidate" },
      examExpiresAt: null,
      logout: mockLogout,
    });

    renderComponent();
    expect(screen.queryByText("Control Panel")).not.toBeInTheDocument();

    // 考生登出需要確認
    fireEvent.click(screen.getByText(/登出|Logout/i));
    expect(confirmMock).toHaveBeenCalledWith("確定要登出嗎？登出後計時仍會繼續執行！");
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("cancels logout if candidate declines confirm", () => {
    confirmMock.mockReturnValue(false); // 模擬點擊「取消」
    (useAuth as any).mockReturnValue({
      user: { username: "USER-123", role: "candidate" },
      examExpiresAt: null,
      logout: mockLogout,
    });

    renderComponent();
    fireEvent.click(screen.getByText(/登出|Logout/i));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles countdown timer and forces logout when time is up", () => {
    vi.useFakeTimers();
    // 設定考試在 2 秒後結束
    const futureTime = Math.floor(Date.now() / 1000) + 2;

    (useAuth as any).mockReturnValue({
      user: { username: "USER-123", role: "candidate" },
      examExpiresAt: futureTime,
      logout: mockLogout,
    });

    renderComponent();

    // 模糊匹配 00:00:01 或 00:00:02 避免毫秒誤差
    expect(screen.getByText(/00:00:0[12]/)).toBeInTheDocument();

    // 推進時間 3 秒
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // 這裡的 alertMock 絕對不會是 undefined 了！
    expect(alertMock).toHaveBeenCalledWith("考試時間已到！系統已自動提交並結束您的操作。");
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
