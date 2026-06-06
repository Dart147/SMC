import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequireAuth } from "./RequireAuth";
import { useAuth } from "../features/auth/hooks/useAuth";

// 1. Mock 外部套件與 Hook
vi.mock("react-router-dom", () => ({
  Navigate: vi.fn(({ to }) => <div data-testid="navigate">{to}</div>),
  Outlet: vi.fn(() => <div data-testid="outlet">Outlet Content</div>),
}));

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("當 Zustand 中沒有 token 時，應導向 /login", () => {
    // 模擬沒登入
    vi.mocked(useAuth).mockReturnValue(null);

    render(<RequireAuth />);

    expect(screen.getByTestId("navigate")).toHaveTextContent("/login");
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });

  it("當 Zustand 中有 token 時，應渲染 Outlet (放行)", () => {
    // 模擬已登入
    vi.mocked(useAuth).mockReturnValue("fake-jwt-token");

    render(<RequireAuth />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});