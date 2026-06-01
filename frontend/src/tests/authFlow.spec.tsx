import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";

// 引入你的真實元件與 Store
import { LoginForm } from "../features/auth/components/LoginForm";
import { ProblemList } from "../pages/ProblemList";
import { useAuth } from "../features/auth/hooks/useAuth";
import { apiClient } from "../services/api";

describe("Integration Test: Login to Problem List Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.setState({ token: null, user: null, examExpiresAt: null });
  });

  it("使用者成功登入後，應該跳轉並看到從後端抓來的題目列表", async () => {
    // ---------------------------------------------------------
    // Step A: 準備所有會用到的 API 假資料 (✅ 改用 vi.spyOn)
    // ---------------------------------------------------------

    // 1. 攔截 post 請求 (登入)
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoidXNlcjEifQ.fake-signature",
      },
    });

    // 2. 攔截 get 請求 (抓取題目)
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: [
        { id: "1", title: "Two Sum", difficulty: "Easy" },
        { id: "2", title: "LRU Cache", difficulty: "Medium" },
      ],
    });

    // ---------------------------------------------------------
    // Step B: 建立一個包含路由的微型測試環境
    // ---------------------------------------------------------
    render(
      // MemoryRouter 是測試專用的 Router，不會去改網址列， initialEntries 代表初始停在 /login
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          {/* 假設登入成功後 navigate('/') 是導向 ProblemList */}
          <Route path="/" element={<ProblemList />} />
        </Routes>
      </MemoryRouter>,
    );

    // ---------------------------------------------------------
    // Step C: 模擬使用者真實操作 (從登入頁開始)
    // ---------------------------------------------------------

    // 驗證一開始確實在登入頁
    expect(screen.getByRole("button", { name: "進入工作區" })).toBeInTheDocument();

    // 填寫表單
    fireEvent.change(screen.getByPlaceholderText("請輸入面試通知上的帳號"), {
      target: { value: "user1" },
    });
    fireEvent.change(screen.getByPlaceholderText("請輸入密碼"), { target: { value: "pass123" } });

    // 點擊登入按鈕
    fireEvent.click(screen.getByRole("button", { name: "進入工作區" }));

    // ---------------------------------------------------------
    // Step D: 驗證跨元件的最終結果
    // ---------------------------------------------------------

    // 1. 等待跳轉，並確認題目列表的 API 有被呼叫
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/problems");
    });

    // 2. 驗證畫面是否已經切換到 ProblemList，並成功渲染出題目！
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("LRU Cache")).toBeInTheDocument();

    // 3. 驗證 Zustand 全域狀態是否真的被寫入了
    expect(useAuth.getState().token).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoidXNlcjEifQ.fake-signature",
    );
  });
});
