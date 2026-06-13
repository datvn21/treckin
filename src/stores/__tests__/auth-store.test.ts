import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

const mockUser: User = {
  id: "user-1",
  email: "attendee@example.com",
  name: "Nguyen Van A",
  role: "user",
  avatarUrl: "",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const mockToken = "mock-jwt-token-abc123";

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("login() sets user, token, and isAuthenticated", () => {
    useAuthStore.getState().login(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it("logout() clears user, token, and isAuthenticated", () => {
    useAuthStore.getState().login(mockUser, mockToken);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("setUser() updates user without changing token", () => {
    useAuthStore.getState().login(mockUser, mockToken);

    const updatedUser: User = { ...mockUser, name: "Nguyen Van B", role: "admin" };
    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(updatedUser);
    expect(state.user?.name).toBe("Nguyen Van B");
    expect(state.user?.role).toBe("admin");
    expect(state.token).toBe(mockToken);
  });
});
