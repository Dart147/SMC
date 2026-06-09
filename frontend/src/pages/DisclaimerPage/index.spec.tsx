import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisclaimerPage } from "./index";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: (sel: any) => sel({ token: "tok123" }),
}));

describe("DisclaimerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
  });

  it("renders disclaimer content", () => {
    render(<DisclaimerPage />);
    expect(screen.getByText("測驗規範與防弊宣告")).toBeInTheDocument();
  });

  it("renders rules list", () => {
    render(<DisclaimerPage />);
    expect(screen.getByText(/禁止切換視窗/)).toBeInTheDocument();
    expect(screen.getByText(/禁止解除全螢幕/)).toBeInTheDocument();
  });

  it("renders start exam button", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("我已瞭解規範，進入全螢幕開考")).toBeInTheDocument();
  });

  it("navigates to /problems on successful exam start", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    render(<DisclaimerPage />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/problems", { replace: true });
    });
  });

  it("shows loading text while starting exam", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    render(<DisclaimerPage />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("系統啟動中...")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    render(<DisclaimerPage />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(/無法啟動考試連線/)).toBeInTheDocument();
    });
  });

  it("shows fullscreen error when requestFullscreen throws", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: vi.fn().mockRejectedValue(new Error("Not allowed")),
      writable: true,
      configurable: true,
    });
    render(<DisclaimerPage />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(/Not allowed/)).toBeInTheDocument();
    });
  });
});
