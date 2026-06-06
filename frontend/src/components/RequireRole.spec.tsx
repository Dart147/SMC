import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequireRole } from "./RequireRole";
import { useAuth } from "../features/auth/hooks/useAuth";

vi.mock("react-router-dom", () => ({
  Navigate: vi.fn(({ to }) => <div data-testid="navigate">{to}</div>),
  Outlet: vi.fn(() => <div data-testid="outlet">Protected Content</div>),
}));

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("RequireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("當使用者未登入 (user 為 null) 時，應導向 /", () => {
    vi.mocked(useAuth).mockReturnValue(null);
    render(<RequireRole role="admin" />);
    expect(screen.getByTestId("navigate")).toHaveTextContent("/");
  });

  it("當使用者已登入但角色不符時，應導向 /", () => {
    vi.mocked(useAuth).mockReturnValue({ id: "1", role: "candidate" });
    render(<RequireRole role="admin" />);
    expect(screen.getByTestId("navigate")).toHaveTextContent("/");
  });

  it("當使用者登入且角色相符時，應渲染 Outlet", () => {
    vi.mocked(useAuth).mockReturnValue({ id: "2", role: "admin" });
    render(<RequireRole role="admin" />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
});