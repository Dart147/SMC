import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "./useAuth";
import { login as apiLogin } from "../api";
import { jwtDecode } from "jwt-decode";

// ---------------------------------------------------------
// 1. Mock 外部依賴
// ---------------------------------------------------------

// Mock API 呼叫
vi.mock("../api", () => ({
  login: vi.fn(),
}));

// Mock JWT 解碼套件
vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(),
}));

describe("useAuth Hook", () => {
  // 在每個測試開始前，清空所有 Mock 紀錄與 localStorage
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(localStorage.getItem).mockClear();
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.removeItem).mockClear();
    useAuth.setState({ token: null, user: null, examExpiresAt: null });
  });

  it("初始狀態下，如果沒有 Token，狀態應該為 null", () => {
    // 渲染 Hook
    const { result } = renderHook(() => useAuth());

    // 驗證 Zustand store 的初始值
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.examExpiresAt).toBeNull();
  });

  it("呼叫 login 成功時，應更新狀態並將 Token 存入 localStorage", async () => {
    // 準備假資料
    const mockCredentials = { username: "testuser", password: "password123" };
    const mockToken = "fake-jwt-token-123";
    const mockDecodedPayload = {
      sub: "usr_123",
      role: "candidate",
      exp: Date.now() / 1000 + 3600, // 設定一小時後過期
      exam_expires_at: 1710000000,
    };

    // 設定 Mock 回傳值
    vi.mocked(apiLogin).mockResolvedValueOnce({ token: mockToken });
    vi.mocked(jwtDecode).mockReturnValueOnce(mockDecodedPayload);

    const { result } = renderHook(() => useAuth());

    // 🌟 執行非同步的 login 動作 (必須包在 act 裡面)
    await act(async () => {
      await result.current.login(mockCredentials);
    });

    // 驗證 1: API 有沒有被正確呼叫
    expect(apiLogin).toHaveBeenCalledWith(mockCredentials);

    // 驗證 2: JWT 解碼有沒有被正確呼叫
    expect(jwtDecode).toHaveBeenCalledWith(mockToken);

    // 驗證 3: Token 有沒有被存進瀏覽器的 localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith("smc_token", mockToken);

    // 驗證 4: Zustand 的狀態有沒有被正確更新
    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual({ id: "usr_123", role: "candidate", username: "testuser" });
    expect(result.current.examExpiresAt).toBe(1710000000);
  });

  it("呼叫 login 失敗時，應拋出錯誤且不更新狀態", async () => {
    const mockCredentials = { username: "testuser", password: "wrongpassword" };
    const mockError = new Error("Unauthorized");

    // 設定 API 呼叫失敗 (Reject)
    vi.mocked(apiLogin).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth());

    // 執行 login 並預期它會拋出錯誤
    await expect(
      act(async () => {
        await result.current.login(mockCredentials);
      }),
    ).rejects.toThrow("Unauthorized");

    // 驗證狀態不變
    expect(result.current.token).toBeNull();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  //   it('呼叫 logout 時，應清除 localStorage 並重置狀態', () => {
  //     // 先塞一點假狀態進去
  //     useAuth.setState({
  //       token: 'some-token',
  //       user: { id: '1', role: 'candidate' },
  //       examExpiresAt: 123456
  //     });

  //     const { result } = renderHook(() => useAuth());

  //     // 執行登出
  //     act(() => {
  //       result.current.logout();
  //     });

  //     // 驗證 localStorage 被清除
  //     expect(localStorage.removeItem).toHaveBeenCalledWith('smc_token');

  //     // 驗證狀態歸零
  //     expect(result.current.token).toBeNull();
  //     expect(result.current.user).toBeNull();
  //     expect(result.current.examExpiresAt).toBeNull();
  //   });
});
