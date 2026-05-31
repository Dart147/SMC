import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginForm } from "./LoginForm";

// ---------------------------------------------------------
// 1. Mock 外部依賴 (Router 與 自訂 Hook)
// ---------------------------------------------------------

// 準備一個假的 navigate 函式來監聽跳轉
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// 準備一個假的 login 函式來模擬 API 成功或失敗
const mockLogin = vi.fn();
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// ---------------------------------------------------------
// 2. 測試案例撰寫
// ---------------------------------------------------------
describe("LoginForm", () => {
  // 每個測試開始前，清空所有 mock 的紀錄，確保測試之間互不影響
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("應該能正常渲染輸入框與按鈕", () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText("請輸入面試通知上的帳號")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("請輸入密碼")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "進入工作區" })).toBeInTheDocument();
  });

  it("當未輸入帳號或密碼時，應該顯示錯誤提示且不呼叫 login", async () => {
    render(<LoginForm />);

    // 直接點擊進入工作區按鈕
    fireEvent.click(screen.getByRole("button", { name: "進入工作區" }));

    // 驗證是否有出現對應的錯誤訊息
    expect(screen.getByText("請輸入帳號與密碼")).toBeInTheDocument();
    // 驗證 mockLogin 絕對沒有被呼叫
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("當登入成功時，應該呼叫 login API 並跳轉到首頁 (/)", async () => {
    // 設定 mockLogin 這次呼叫會「成功」(Resolve)
    mockLogin.mockResolvedValueOnce({});
    render(<LoginForm />);

    // 模擬使用者輸入
    fireEvent.change(screen.getByPlaceholderText("請輸入面試通知上的帳號"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("請輸入密碼"), {
      target: { value: "password123" },
    });

    // 點擊進入工作區
    fireEvent.click(screen.getByRole("button", { name: "進入工作區" }));

    // 驗證 login 有被正確的參數呼叫
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ username: "testuser", password: "password123" });
    });

    // 驗證成功後有跳轉到首頁
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("當登入失敗 (401) 時，應該顯示「帳號或密碼錯誤」", async () => {
    // 設定 mockLogin 這次呼叫會「失敗」(Reject) 並帶有 401 status
    mockLogin.mockRejectedValueOnce({ response: { status: 401 } });
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText("請輸入面試通知上的帳號"), {
      target: { value: "wronguser" },
    });
    fireEvent.change(screen.getByPlaceholderText("請輸入密碼"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "進入工作區" }));

    // 驗證錯誤訊息是否出現
    await waitFor(() => {
      expect(screen.getByText("帳號或密碼錯誤，請重新輸入。")).toBeInTheDocument();
    });
  });

  it("當登入失敗 (403) 時，應該顯示「考試時間已結束」", async () => {
    // 設定 mockLogin 這次呼叫會「失敗」(Reject) 並帶有 403 status
    mockLogin.mockRejectedValueOnce({ response: { status: 403 } });
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText("請輸入面試通知上的帳號"), {
      target: { value: "expireduser" },
    });
    fireEvent.change(screen.getByPlaceholderText("請輸入密碼"), { target: { value: "anypass" } });
    fireEvent.click(screen.getByRole("button", { name: "進入工作區" }));

    // 驗證錯誤訊息是否出現
    await waitFor(() => {
      expect(screen.getByText("您的考試時間已結束，該帳號已失效。")).toBeInTheDocument();
    });
  });
});
