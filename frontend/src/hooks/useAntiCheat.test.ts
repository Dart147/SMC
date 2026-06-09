import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAntiCheat } from "./useAntiCheat";

describe("useAntiCheat hook", () => {
  let onCheatDetectedMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    onCheatDetectedMock = vi.fn();

    // 模擬預設環境為全螢幕且未切換分頁
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    Object.defineProperty(document, "fullscreenElement", { value: {}, writable: true });

    // 模擬 window 大小與螢幕大小一致 (全螢幕狀態)
    Object.defineProperty(window, "innerHeight", { value: 1080, writable: true });
    Object.defineProperty(window.screen, "height", { value: 1080, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const fireEventOnDocument = (eventName: string) => {
    document.dispatchEvent(new Event(eventName));
  };

  const fireEventOnWindow = (eventName: string) => {
    window.dispatchEvent(new Event(eventName));
  };

  it("triggers onCheatDetected when visibility changes to hidden", () => {
    renderHook(() => useAntiCheat(onCheatDetectedMock));

    // 模擬使用者切換分頁
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    fireEventOnDocument("visibilitychange");

    expect(onCheatDetectedMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onCheatDetected when exiting fullscreen via events", () => {
    renderHook(() => useAntiCheat(onCheatDetectedMock));

    // 模擬按下 ESC 退出全螢幕
    Object.defineProperty(document, "fullscreenElement", { value: null, writable: true });
    fireEventOnDocument("fullscreenchange");

    expect(onCheatDetectedMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onCheatDetected when window resizes out of fullscreen ratio", () => {
    renderHook(() => useAntiCheat(onCheatDetectedMock));

    // 模擬視窗被縮小 (高度差超過 5px) 且不是全螢幕狀態
    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
    Object.defineProperty(document, "fullscreenElement", { value: null, writable: true });

    fireEventOnWindow("resize");

    expect(onCheatDetectedMock).toHaveBeenCalledTimes(1);
  });

  it("prevents default actions for contextmenu, copy, and paste", () => {
    renderHook(() => useAntiCheat(onCheatDetectedMock));

    const eventsToTest = ["contextmenu", "copy", "paste"];

    eventsToTest.forEach((eventName) => {
      const event = new Event(eventName, { cancelable: true });
      document.dispatchEvent(event);
      // 驗證事件的預設行為是否被阻擋
      expect(event.defaultPrevented).toBe(true);
    });

    // 這些行為只會被阻擋，不會觸發 warning
    expect(onCheatDetectedMock).not.toHaveBeenCalled();
  });

  it("enforces a 1-second cooldown between cheat detections", () => {
    renderHook(() => useAntiCheat(onCheatDetectedMock));

    // 第一次作弊觸發
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    fireEventOnDocument("visibilitychange");
    expect(onCheatDetectedMock).toHaveBeenCalledTimes(1);

    // 立即觸發第二次作弊 (不應該增加次數，因為在 cooldown 內)
    Object.defineProperty(document, "fullscreenElement", { value: null, writable: true });
    fireEventOnDocument("fullscreenchange");
    expect(onCheatDetectedMock).toHaveBeenCalledTimes(1);

    // 時間快轉 1 秒
    vi.advanceTimersByTime(1000);

    // 第三次觸發 (過了 cooldown，應該要成功觸發)
    fireEventOnDocument("visibilitychange");
    expect(onCheatDetectedMock).toHaveBeenCalledTimes(2);
  });
});
