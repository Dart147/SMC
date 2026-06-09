import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunSample } from "./useRunSample";
import { useWorkspaceStore } from "../store";

vi.mock("../../../services/api", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from "../../../services/api";

describe("useRunSample", () => {
  beforeEach(() => {
    act(() => {
      useWorkspaceStore.setState({
        code: "print(1)",
        language: "python",
        result: null,
      });
    });
    vi.clearAllMocks();
  });

  it("starts with isRunSample=false", () => {
    const { result } = renderHook(() => useRunSample("1"));
    expect(result.current.isRunSample).toBe(false);
  });

  it("sets result on successful run", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: "Accepted",
        output: "1\n",
        expectedOutput: "1\n",
        error: "",
      },
    });

    const { result } = renderHook(() => useRunSample("1"));
    await act(async () => {
      await result.current.runSample();
    });

    const storeResult = useWorkspaceStore.getState().result;
    expect(storeResult?.status).toBe("Accepted");
  });

  it("sets error result on failed API call", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error("500"), {
        response: { data: { error: "server error" } },
      }),
    );

    const { result } = renderHook(() => useRunSample("1"));
    await act(async () => {
      await result.current.runSample();
    });

    const storeResult = useWorkspaceStore.getState().result;
    expect(storeResult?.status).toBe("Runtime Error");
    expect(storeResult?.error).toBe("server error");
  });

  it("sets error result when no response available", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network failure"),
    );

    const { result } = renderHook(() => useRunSample("1"));
    await act(async () => {
      await result.current.runSample();
    });

    const storeResult = useWorkspaceStore.getState().result;
    expect(storeResult?.error).toBe("network failure");
  });
});
