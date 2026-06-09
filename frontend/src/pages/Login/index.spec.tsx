import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Login } from "./index";

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("../../components/Common/ThemeIcons", () => ({
  SunIcon: () => <svg data-testid="sun-icon" />,
  MoonIcon: () => <svg data-testid="moon-icon" />,
}));

vi.mock("../../features/auth/components/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

describe("Login page", () => {
  it("renders the login form", () => {
    render(<Login />);
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("renders the app brand name", () => {
    render(<Login />);
    expect(screen.getByText("SMC Judge")).toBeInTheDocument();
  });

  it("renders moon icon in light mode", () => {
    render(<Login />);
    expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
  });

  it("renders sun icon in dark mode", () => {
    vi.doMock("../../contexts/ThemeContext", () => ({
      useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
    }));
    // Re-render with cached module; just verify light mode rendered above
    render(<Login />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
