import { describe, it, expect, beforeEach } from "vitest";
import { useGlobalStore } from "./globalStore";
import { act } from "@testing-library/react";

describe("globalStore", () => {
  beforeEach(() => {
    act(() => {
      useGlobalStore.setState({ theme: "light", user: null });
    });
  });

  it("has correct initial state", () => {
    const { theme, user } = useGlobalStore.getState();
    expect(theme).toBe("light");
    expect(user).toBeNull();
  });

  it("setTheme updates theme", () => {
    act(() => {
      useGlobalStore.getState().setTheme("dark");
    });
    expect(useGlobalStore.getState().theme).toBe("dark");
  });

  it("setUser updates user", () => {
    const fakeUser = { id: "1", username: "alice", role: "candidate" };
    act(() => {
      useGlobalStore.getState().setUser(fakeUser);
    });
    expect(useGlobalStore.getState().user).toEqual(fakeUser);
  });

  it("setUser can clear user to null", () => {
    act(() => {
      useGlobalStore.getState().setUser({ id: "1" });
      useGlobalStore.getState().setUser(null);
    });
    expect(useGlobalStore.getState().user).toBeNull();
  });
});
