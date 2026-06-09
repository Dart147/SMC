// 1. 在最上方確保有引入 act
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("在延遲時間內，回傳的值不應改變", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: "hello" },
    });

    expect(result.current).toBe("hello");
    rerender({ value: "hello world" });

    // 2. 使用 act() 包裝快轉時間的動作
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("hello"); // 還沒到 500ms，維持原值

    // 3. 使用 act() 包裝第二次快轉
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 現在 React 已經成功把狀態更新上去了！
    expect(result.current).toBe("hello world");
  });
});
