import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSubmissionsStore } from "./store";

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "../../services/api";

describe("useSubmissionsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSubmissionsStore.setState({ history: [], isLoading: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetchHistory populates history and clears loading on success", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: "1", status: "Accepted" }, { id: "2", status: "Wrong Answer" }],
    });

    const { result } = renderHook(() => useSubmissionsStore());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetchHistory sets empty array on error", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useSubmissionsStore());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("pollUntilTerminal calls onDone when submission reaches terminal status", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "3", status: "Accepted" } });

    const onDone = vi.fn();
    const { result } = renderHook(() => useSubmissionsStore());

    act(() => {
      result.current.pollUntilTerminal("3", onDone);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
