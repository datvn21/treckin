import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Button } from "../Button";

describe("Button", () => {
  describe("Rendering", () => {
    it("renders as a button element", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders children text", () => {
      render(<Button>Submit</Button>);
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Label</span>
        </Button>,
      );
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Label")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it('applies "default" variant classes', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-default");
    });

    it('applies "primary" variant classes', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-primary");
    });

    it('applies "ghost" variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-ghost");
    });

    it('applies "danger" variant classes', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-danger");
    });

    it('applies "icon" variant classes', () => {
      render(<Button variant="icon">Icon</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-icon");
    });

    it("defaults to 'default' variant when not specified", () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-default");
    });
  });

  describe("Sizes", () => {
    it('applies "sm" size classes', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-sm");
    });

    it('applies "lg" size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-lg");
    });

    it("defaults to 'md' size when not specified", () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole("button");
      // md is the default, no additional class expected
      expect(button).toBeInTheDocument();
    });
  });

  describe("States", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when isLoading prop is true", () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows loading spinner when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);
      const svg = document.querySelector("svg.animate-spin");
      expect(svg).toBeInTheDocument();
    });

    it("does not show loading spinner when isLoading is false", () => {
      render(<Button isLoading={false}>Not Loading</Button>);
      const spinners = document.querySelectorAll("svg.animate-spin");
      expect(spinners).toHaveLength(0);
    });
  });

  describe("Accessibility", () => {
    it("forwards ref to the button element", () => {
      let refValue: HTMLButtonElement | null = null;
      render(
        <Button
          ref={(el) => {
            refValue = el;
          }}
        >
          Ref Button
        </Button>,
      );
      expect(refValue).toBeInstanceOf(HTMLButtonElement);
    });

    it("forwards aria attributes", () => {
      render(
        <Button aria-label="Close dialog" aria-expanded={true}>
          X
        </Button>,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Close dialog");
      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Custom className", () => {
    it("merges custom className with variant classes", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("btn-default"); // variant class
    });
  });
});
