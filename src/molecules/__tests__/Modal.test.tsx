import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Modal } from "../Modal";
import userEvent from "@testing-library/user-event";

describe("Modal", () => {
  describe("Rendering", () => {
    it("does not render when open is false", () => {
      render(
        <Modal open={false} onOpenChange={vi.fn()}>
          Content
        </Modal>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders when open is true", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()}>
          Content
        </Modal>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()}>
          <p>Modal body content</p>
        </Modal>,
      );
      expect(screen.getByText("Modal body content")).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    it("renders title when provided", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} title="Modal Title">
          Content
        </Modal>,
      );
      expect(screen.getByText("Modal Title")).toBeInTheDocument();
    });

    it("renders description when provided", () => {
      render(
        <Modal
          open={true}
          onOpenChange={vi.fn()}
          description="Modal description text"
        >
          Content
        </Modal>,
      );
      expect(screen.getByText("Modal description text")).toBeInTheDocument();
    });

    it("renders both title and description", () => {
      render(
        <Modal
          open={true}
          onOpenChange={vi.fn()}
          title="My Modal"
          description="My description"
        >
          Content
        </Modal>,
      );
      expect(screen.getByText("My Modal")).toBeInTheDocument();
      expect(screen.getByText("My description")).toBeInTheDocument();
    });
  });

  describe("Close button", () => {
    it("renders close button with aria-label", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} title="Title">
          Content
        </Modal>,
      );
      expect(screen.getByRole("button", { name: /đóng/i })).toBeInTheDocument();
    });

    it("calls onOpenChange(false) when close button is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Modal open={true} onOpenChange={onOpenChange} title="Title">
          Content
        </Modal>,
      );

      await user.click(screen.getByRole("button", { name: /đóng/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Footer", () => {
    it("renders footer when provided", () => {
      render(
        <Modal
          open={true}
          onOpenChange={vi.fn()}
          footer={<button>Confirm</button>}
        >
          Content
        </Modal>,
      );
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("does not render footer when not provided", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()}>
          Content
        </Modal>,
      );
      // Should only have the content, no footer
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });
  });

  describe("Sizes", () => {
    it('applies "sm" size class', () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} size="sm">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-sm");
    });

    it('applies "md" size class (default)', () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} size="md">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-md");
    });

    it('applies "lg" size class', () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} size="lg">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-2xl");
    });

    it('applies "xl" size class', () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} size="xl">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-4xl");
    });

    it('applies "full" size class', () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} size="full">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-\\[min\\(96vw\\,72rem\\)\\]");
    });
  });

  describe("Accessibility", () => {
    it("has dialog role for accessibility", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()}>
          Content
        </Modal>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders Dialog.Title for semantic heading", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} title="Accessible Title">
          Content
        </Modal>,
      );
      const title = screen.getByRole("heading");
      expect(title).toHaveTextContent("Accessible Title");
    });
  });

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(
        <Modal open={true} onOpenChange={vi.fn()} className="custom-modal-class">
          Content
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("custom-modal-class");
    });
  });
});
