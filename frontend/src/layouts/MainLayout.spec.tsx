import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MainLayout } from "./MainLayout";

vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/problems" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("../components/Common/ThemeIcons", () => ({
  SunIcon: () => <svg data-testid="sun-icon" />,
  MoonIcon: () => <svg data-testid="moon-icon" />,
}));

vi.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("MainLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
