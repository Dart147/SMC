import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAntiCheat } from "./useAntiCheat";

describe("useAntiCheat", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("registers event listeners on mount", () => {
    const onCheat = vi.fn();
    renderHook(() => useAntiCheat(onCheat));
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
  });

  it("removes event listeners on unmount", () => {
    const onCheat = vi.fn();
    const { unmount } = renderHook(() => useAntiCheat(onCheat));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("calls onCheatDetected when tab is hidden", () => {
    const onCheat = vi.fn();
    renderHook(() => useAntiCheat(onCheat));

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onCheat).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("respects cooldown: does not call onCheat twice within 1 second", () => {
    const onCheat = vi.fn();
    renderHook(() => useAntiCheat(onCheat));

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onCheat).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("allows second call after cooldown expires", () => {
    const onCheat = vi.fn();
    renderHook(() => useAntiCheat(onCheat));

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onCheat).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});
