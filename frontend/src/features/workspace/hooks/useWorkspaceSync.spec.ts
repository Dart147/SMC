import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkspaceSync } from "./useWorkspaceSync";
import { apiClient } from "../../../services/api";

// 攔截 apiClient
vi.mock("../../../services/api", () => ({
  apiClient: { get: vi.fn() },
}));

// 把 useDebounce 變成「即時回傳」，這樣修改程式碼就會立刻觸發存檔
vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: any) => value,
}));

const mockSkeletons = {
  javascript: "js template",
  python: "py template",
};

// 🌟 準備一個記憶體變數來充當假的 LocalStorage
let mockStorage: Record<string, string> = {};

describe("useWorkspaceSync Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {}; // 每次測試前清空假資料庫

    // 🌟 關鍵修復：賦予 localStorage 真正的讀寫能力，而不是只回傳 undefined
    if (vi.isMockFunction(localStorage.getItem)) {
      vi.mocked(localStorage.getItem).mockImplementation((key) => mockStorage[key] ?? null);
      vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
        mockStorage[key] = value.toString();
      });
      vi.mocked(localStorage.removeItem).mockImplementation((key) => {
        delete mockStorage[key];
      });
      vi.mocked(localStorage.clear).mockImplementation(() => {
        mockStorage = {};
      });
    } else {
      // 如果環境中沒有被全域 Mock，我們就在這層手動攔截
      vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => mockStorage[key] ?? null);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
        mockStorage[key] = value.toString();
      });
    }
  });

  // 👇 下面的 it 測試案例維持原樣，完全不用動！
  it("情境一：LocalStorage 有草稿時，應優先載入 LocalStorage 的內容", async () => {
    localStorage.setItem("smc_lang_p1", "python");
    localStorage.setItem("smc_draft_p1_python", "print('local storage cache')");

    const { result } = renderHook(() =>
      useWorkspaceSync({ problemId: "p1", defaultLang: "javascript", skeletons: mockSkeletons })
    );

    // 等待初始化結束
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(result.current.language).toBe("python");
    expect(result.current.code).toBe("print('local storage cache')");
    // 不應該打 API
    expect(apiClient.get).not.toHaveBeenCalled(); 
  });

  it("情境二：LocalStorage 沒草稿但 DB 有紀錄時，應打 API 並存入 LocalStorage", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { language: "javascript", code: "console.log('from db')" },
    });

    const { result } = renderHook(() =>
      useWorkspaceSync({ problemId: "p2", defaultLang: "javascript", skeletons: mockSkeletons })
    );

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(apiClient.get).toHaveBeenCalledWith("/submissions/latest", { params: { problemId: "p2" } });
    expect(result.current.code).toBe("console.log('from db')");
    expect(localStorage.getItem("smc_draft_p2_javascript")).toBe("console.log('from db')");
  });

  it("切換語言時，應自動載入該語言對應的骨架 (Skeleton) 或舊草稿", async () => {
    const { result } = renderHook(() =>
      useWorkspaceSync({ problemId: "p3", defaultLang: "javascript", skeletons: mockSkeletons })
    );

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    // 切換成 Python
    act(() => {
      result.current.handleLanguageChange("python");
    });

    expect(result.current.language).toBe("python");
    expect(result.current.code).toBe("py template"); // 因為沒有舊草稿，所以拿到預設模板
    expect(localStorage.getItem("smc_lang_p3")).toBe("python");
  });

  it("修改程式碼時，應自動寫入 LocalStorage", async () => {
    const { result } = renderHook(() =>
      useWorkspaceSync({ problemId: "p4", defaultLang: "javascript", skeletons: mockSkeletons })
    );

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setCode("let a = 1;");
    });

    // 驗證已經即時寫入 LocalStorage (因為我們 Mock 了 useDebounce)
    expect(localStorage.getItem("smc_draft_p4_javascript")).toBe("let a = 1;");
  });
});