import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { toast, Toaster, useToast } from "../Toast";

// Helper to wait for React to update
const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Toast", () => {
  // ── Reset singleton state between tests ──
  beforeEach(() => {
    // Clear the singleton state by dismissing all toasts
    const listeners = toast as unknown as { dismiss: (id: string) => void };
    // Reset the singleton items directly
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("toast API", () => {
    it("toast.success() adds a success toast", async () => {
      toast.success("Operation successful!");
      await waitForUpdate();
      // Toast should be added to the singleton
      const items = document.querySelectorAll('[role="alert"]');
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveTextContent("Operation successful!");
    });

    it("toast.error() adds an error toast", async () => {
      toast.error("Something went wrong!");
      await waitForUpdate();
      const items = document.querySelectorAll('[role="alert"]');
      expect(items.length).toBeGreaterThan(0);
    });

    it("toast.info() adds an info toast", async () => {
      toast.info("Here is some information.");
      await waitForUpdate();
      const items = document.querySelectorAll('[role="alert"]');
      expect(items.length).toBeGreaterThan(0);
    });

    it("toast.loading() adds a loading toast", async () => {
      toast.loading("Loading data...");
      await waitForUpdate();
      const items = document.querySelectorAll('[role="alert"]');
      expect(items.length).toBeGreaterThan(0);
    });

    it("toast.dismiss() removes a toast by id", async () => {
      const id = toast.success("Temporary message");
      await waitForUpdate();
      toast.dismiss(id);
      await waitForUpdate();
      // Toast should be removed
      expect(screen.queryByText("Temporary message")).not.toBeInTheDocument();
    });
  });

  describe("Toaster component", () => {
    it("renders nothing when there are no toasts", () => {
      render(<Toaster />);
      expect(document.querySelector('[aria-label="Thông báo"]')).not.toBeInTheDocument();
    });

    it("renders toasts when they are added", async () => {
      render(<Toaster />);
      toast.success("Success message");
      await waitForUpdate();
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });

    it("renders multiple toasts", async () => {
      render(<Toaster />);
      toast.success("First");
      toast.error("Second");
      toast.info("Third");
      await waitForUpdate();
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.getByText("Third")).toBeInTheDocument();
    });

    it("limits toasts to MAX_TOASTS (5)", async () => {
      render(<Toaster />);
      // Add 7 toasts
      for (let i = 1; i <= 7; i++) {
        toast.info(`Toast ${i}`);
      }
      await waitForUpdate();
      // Should only show 5 newest toasts
      const items = document.querySelectorAll('[role="alert"]');
      expect(items.length).toBe(5);
    });

    it("renders close button on non-loading toasts", async () => {
      render(<Toaster />);
      toast.success("Dismissible toast");
      await waitForUpdate();
      const closeBtn = screen.getByRole("button", { name: /đóng thông báo/i });
      expect(closeBtn).toBeInTheDocument();
    });

    it("does not render close button on loading toasts", async () => {
      render(<Toaster />);
      toast.loading("Loading...");
      await waitForUpdate();
      // Loading toasts should not have a close button
      const loadingToast = document.querySelector('[role="alert"]');
      expect(loadingToast?.querySelector('[aria-label="Đóng thông báo"]')).not.toBeInTheDocument();
    });
  });

  describe("Auto-dismiss behavior", () => {
    it("success toast has 4000ms auto-dismiss", () => {
      vi.useRealTimers();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      render(<Toaster />);
      toast.success("Auto-dismiss");

      // Check that setTimeout was called
      expect(setTimeoutSpy).toHaveBeenCalled();

      // The first setTimeout call should be for auto-dismiss
      const timeoutCall = setTimeoutSpy.mock.calls[0];
      expect(timeoutCall[1]).toBe(4000);

      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it("error toast has 6000ms auto-dismiss", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      render(<Toaster />);
      toast.error("Error toast");

      const timeoutCall = setTimeoutSpy.mock.calls[0];
      expect(timeoutCall[1]).toBe(6000);

      setTimeoutSpy.mockRestore();
    });

    it("info toast has 4000ms auto-dismiss", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      render(<Toaster />);
      toast.info("Info toast");

      const timeoutCall = setTimeoutSpy.mock.calls[0];
      expect(timeoutCall[1]).toBe(4000);

      setTimeoutSpy.mockRestore();
    });

    it("loading toast does not auto-dismiss", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      render(<Toaster />);
      toast.loading("Loading forever");

      // No setTimeout for loading toasts
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });

  describe("useToast hook", () => {
    it("useToast() returns the toast API", () => {
      const result = useToast();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("info");
      expect(result).toHaveProperty("loading");
      expect(result).toHaveProperty("dismiss");
    });
  });
});
