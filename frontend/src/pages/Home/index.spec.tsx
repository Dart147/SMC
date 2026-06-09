import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Home } from "./index";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid={`navigate-${to.replace(/\//g, "-")}`} />,
  useNavigate: () => mockNavigate,
}));

const mockUseAuth = vi.fn();
vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: (selector: (s: any) => any) => mockUseAuth(selector),
}));

describe("Home page", () => {
  it("redirects to /login when no token", () => {
    mockUseAuth.mockImplementation((sel: any) => sel({ token: null, user: null }));
    const { getByTestId } = render(<Home />);
    expect(getByTestId("navigate--login")).toBeInTheDocument();
  });

  it("redirects to /interviewer for admin user", () => {
    mockUseAuth.mockImplementation((sel: any) =>
      sel({ token: "tok", user: { role: "admin" } }),
    );
    const { getByTestId } = render(<Home />);
    expect(getByTestId("navigate--interviewer")).toBeInTheDocument();
  });

  it("redirects to /disclaimer for candidate user", () => {
    mockUseAuth.mockImplementation((sel: any) =>
      sel({ token: "tok", user: { role: "candidate" } }),
    );
    const { getByTestId } = render(<Home />);
    expect(getByTestId("navigate--disclaimer")).toBeInTheDocument();
  });
});
