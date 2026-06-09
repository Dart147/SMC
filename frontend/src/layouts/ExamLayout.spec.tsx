import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => mockNavigate,
}));

const mockNavigate = vi.fn();

let capturedCheatCallback: (() => void) | null = null;
vi.mock("../hooks/useAntiCheat", () => ({
  useAntiCheat: (cb: () => void) => {
    capturedCheatCallback = cb;
  },
}));

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: (selector: (s: any) => any) => mockUseAuth(selector),
}));

describe("ExamLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCheatCallback = null;
    mockUseAuth.mockImplementation((sel: any) =>
      sel({ token: "tok123", logout: mockLogout, user: { role: "candidate" } }),
    );
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "exitFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  it("renders the outlet for candidate", async () => {
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("renders submit exam button for candidate", async () => {
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    expect(screen.getByText("提早交卷")).toBeInTheDocument();
  });

  it("renders outlet directly for admin user", async () => {
    mockUseAuth.mockImplementation((sel: any) =>
      sel({ token: "adminTok", logout: mockLogout, user: { role: "admin" } }),
    );
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.queryByText("提早交卷")).not.toBeInTheDocument();
  });

  it("submits exam successfully on 提早交卷 click", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    fireEvent.click(screen.getByText("提早交卷"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/exams/end", expect.any(Object));
    });
  });

  it("handles exam end failure gracefully", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    fireEvent.click(screen.getByText("提早交卷"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it("cancels exam end when confirm returns false", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    fireEvent.click(screen.getByText("提早交卷"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows warning modal when cheat is detected", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ warning_count: 1 }),
    });
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    await act(async () => {
      capturedCheatCallback?.();
    });
    await waitFor(() => {
      expect(screen.getByText("⚠️ 違規警告")).toBeInTheDocument();
    });
  });

  it("shows resume button in warning modal", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ warning_count: 2 }),
    });
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    await act(async () => {
      capturedCheatCallback?.();
    });
    await waitFor(() => {
      expect(screen.getByText(/點我重新回到全螢幕/)).toBeInTheDocument();
    });
  });

  it("handles resume after warning modal", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ warning_count: 1 }),
    });
    const { ExamLayout } = await import("./ExamLayout");
    render(<ExamLayout />);
    await act(async () => {
      capturedCheatCallback?.();
    });
    await waitFor(() => screen.getByText(/點我重新回到全螢幕/));
    fireEvent.click(screen.getByText(/點我重新回到全螢幕/));
    await waitFor(() => {
      expect(screen.queryByText("⚠️ 違規警告")).not.toBeInTheDocument();
    });
  });
});
