import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRunCode } from "./useRunCode";
import * as api from "../api";
import { useWorkspaceStore } from "../store";

const mockNavigate = vi.fn();

// Mock React Router
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock API
vi.mock("../api", () => ({
  submitCode: vi.fn(),
  getSubmission: vi.fn(),
}));

describe("useRunCode Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 啟用 Vitest 假計時器 (時光機)
    vi.useFakeTimers();
    useWorkspaceStore.setState({ code: "print(1)", language: "python", result: null });
  });

  afterEach(() => {
    // 測試結束後關閉假計時器，避免影響其他測試
    vi.useRealTimers();
  });

  it("提交失敗時，應直接設定 Runtime Error 狀態並結束", async () => {
    vi.mocked(api.submitCode).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useRunCode("p1"));

    await act(async () => {
      await result.current.runCode();
    });

    const storeState = useWorkspaceStore.getState();
    expect(storeState.result?.status).toBe("Runtime Error");
    expect(result.current.isRunning).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("成功提交並輪詢直到獲得最終狀態 (Accepted)", async () => {
    vi.mocked(api.submitCode).mockResolvedValueOnce({ id: "sub-123" } as any);
    
    // 第一次輪詢回傳 Pending，第二次回傳 Accepted
    vi.mocked(api.getSubmission)
      .mockResolvedValueOnce({ id: "sub-123", status: "Pending" } as any)
      .mockResolvedValueOnce({ id: "sub-123", status: "Accepted" } as any);

    const { result } = renderHook(() => useRunCode("p1"));

    // 啟動執行
    await act(async () => {
      await result.current.runCode();
    });

    expect(result.current.isRunning).toBe(true);

    // 快轉 1.5 秒 (觸發第一次輪詢)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(useWorkspaceStore.getState().result?.status).toBe("Pending");

    // 再快轉 1.5 秒 (觸發第二次輪詢)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    
    // 驗證獲得最終結果，跳轉頁面，並停止執行
    expect(useWorkspaceStore.getState().result?.status).toBe("Accepted");
    expect(result.current.isRunning).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith("/results", { state: { submissionId: "sub-123" } });
  });
});