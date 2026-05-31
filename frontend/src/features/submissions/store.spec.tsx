import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSubmissionsStore } from "./store";
import { fetchSubmission } from "./api"; // 根據你的實際檔名調整

// 1. Mock 負責打 API 的函式
vi.mock("./api", () => ({
  fetchSubmission: vi.fn(),
}));

describe("useSubmissionsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 確保每次測試前 Store 都是乾淨的
    useSubmissionsStore.setState({ currentSubmission: null, isLoading: false });

    // 🌟 啟動 Vitest 的「時間暫停魔法 (Fake Timers)」
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 測試結束後，把時間恢復正常，以免影響其他測試
    vi.useRealTimers();
  });

  it("clearCurrent 應該能清空當前的 submission", () => {
    useSubmissionsStore.setState({ currentSubmission: { id: "123" } as any });
    const { result } = renderHook(() => useSubmissionsStore());

    act(() => {
      result.current.clearCurrent();
    });

    expect(result.current.currentSubmission).toBeNull();
  });

  it("pollSubmission 拿到 Accepted 狀態時，應該停止輪詢並結束 loading", async () => {
    // 模擬後端直接回傳評測完成 (Accepted)
    vi.mocked(fetchSubmission).mockResolvedValueOnce({ id: "1", status: "Accepted" } as any);

    const { result } = renderHook(() => useSubmissionsStore());

    // 啟動輪詢
    await act(async () => {
      await result.current.pollSubmission("1");
    });

    // 驗證 API 只被打了一次，且狀態更新正確
    expect(fetchSubmission).toHaveBeenCalledTimes(1);
    expect(result.current.currentSubmission).toEqual({ id: "1", status: "Accepted" });
    expect(result.current.isLoading).toBe(false);
  });

  it("pollSubmission 拿到 Pending 狀態時，應該等待 1.5 秒後再次輪詢", async () => {
    // 模擬後端的回傳：第一次回傳 Pending，第二次回傳 Accepted
    vi.mocked(fetchSubmission)
      .mockResolvedValueOnce({ id: "2", status: "Pending" } as any)
      .mockResolvedValueOnce({ id: "2", status: "Accepted" } as any);

    const { result } = renderHook(() => useSubmissionsStore());

    // 1. 啟動輪詢 (此時會觸發第一次 API 呼叫)
    await act(async () => {
      // 這裡不能 await 到底，因為內部有 setTimeout
      result.current.pollSubmission("2");
    });

    // 驗證第一次呼叫後的狀態
    expect(fetchSubmission).toHaveBeenCalledTimes(1);
    expect(result.current.currentSubmission?.status).toBe("Pending");
    expect(result.current.isLoading).toBe(true); // 還在轉圈圈

    // 🌟 2. 快轉時間 1500 毫秒！
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // 驗證第二次呼叫後的狀態
    expect(fetchSubmission).toHaveBeenCalledTimes(2);
    expect(result.current.currentSubmission?.status).toBe("Accepted");
    expect(result.current.isLoading).toBe(false); // 結束轉圈圈
  });
});
