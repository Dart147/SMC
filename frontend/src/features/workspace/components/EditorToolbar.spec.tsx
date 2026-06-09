import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditorToolbar from "./EditorToolbar";
import type { Language, Theme } from "../constants";

describe("EditorToolbar", () => {
  const defaultProps = {
    language: "javascript" as Language,
    theme: "vs-dark" as Theme,
    onLanguageChange: vi.fn(),
  };

  it("renders the language select with current language", () => {
    render(<EditorToolbar {...defaultProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe("javascript");
  });

  it("renders all language options", () => {
    render(<EditorToolbar {...defaultProps} />);
    const options = screen.getAllByRole("option");
    const values = options.map((o) => (o as HTMLOptionElement).value);
    expect(values).toContain("javascript");
    expect(values).toContain("python");
    expect(values).toContain("go");
    expect(values).toContain("c");
    expect(values).toContain("cpp");
  });

  it("calls onLanguageChange when user selects a different language", () => {
    const onLanguageChange = vi.fn();
    render(<EditorToolbar {...defaultProps} onLanguageChange={onLanguageChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "python" } });
    expect(onLanguageChange).toHaveBeenCalledWith("python");
  });

  it("renders in light theme without crashing", () => {
    render(<EditorToolbar {...defaultProps} theme="vs-light" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
