import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MainLayout } from "./MainLayout";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/problems" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("../components/Common/ThemeIcons", () => ({
  SunIcon: () => <svg data-testid="sun-icon" />,
  MoonIcon: () => <svg data-testid="moon-icon" />,
}));

const mockSetTheme = vi.fn();
vi.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("MainLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    mockUseAuth.mockReturnValue({
      user: { username: "alice", role: "candidate" },
      examExpiresAt: null,
      logout: mockLogout,
    });
  });

  it("renders outlet", () => {
    render(<MainLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("renders nav links for candidate", () => {
    render(<MainLayout />);
    expect(screen.getByText("Problems")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("renders admin nav links for admin user", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", role: "admin" },
      examExpiresAt: null,
      logout: mockLogout,
    });
    render(<MainLayout />);
    expect(screen.getByText("Submissions")).toBeInTheDocument();
    expect(screen.getAllByText(/Control Panel|Panel/i).length).toBeGreaterThan(0);
  });

  it("renders username in header", () => {
    render(<MainLayout />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("calls logout when logout button is clicked by admin", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", role: "admin" },
      examExpiresAt: null,
      logout: mockLogout,
    });
    render(<MainLayout />);
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("renders logo link", () => {
    render(<MainLayout />);
    expect(screen.getByText("SMC Judge")).toBeInTheDocument();
  });

  it("renders without user (not logged in)", () => {
    mockUseAuth.mockReturnValue({ user: null, examExpiresAt: null, logout: mockLogout });
    render(<MainLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("starts countdown timer when candidate has examExpiresAt", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "alice", role: "candidate" },
      examExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      logout: mockLogout,
    });
    render(<MainLayout />);
    await waitFor(() => {
      expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  it("calls logout and navigate when candidate confirms logout", () => {
    render(<MainLayout />);
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("does not logout when candidate cancels confirm dialog", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<MainLayout />);
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("calls setTheme when theme toggle is clicked", () => {
    render(<MainLayout />);
    fireEvent.click(screen.getByTitle("Switch to dark mode"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
