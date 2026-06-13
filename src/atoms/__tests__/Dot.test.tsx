import { describe, it, expect } from "vitest";
import { render } from "@/test/test-utils";
import { Dot } from "../Dot";

describe("Dot", () => {
  describe("Rendering", () => {
    it("renders as a span element", () => {
      render(<Dot />);
      const dot = document.querySelector(".dot");
      expect(dot).toBeInTheDocument();
    });

    it("has aria-hidden attribute", () => {
      render(<Dot />);
      const dot = document.querySelector(".dot");
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Colors", () => {
    it('applies "green" color class', () => {
      render(<Dot color="green" />);
      expect(document.querySelector(".dot")).toHaveClass("dot-green");
    });

    it('applies "yellow" color class', () => {
      render(<Dot color="yellow" />);
      expect(document.querySelector(".dot")).toHaveClass("dot-yellow");
    });

    it('applies "red" color class', () => {
      render(<Dot color="red" />);
      expect(document.querySelector(".dot")).toHaveClass("dot-red");
    });

    it('applies "gray" color class by default', () => {
      render(<Dot />);
      expect(document.querySelector(".dot")).toHaveClass("dot-gray");
    });

    it('applies "blue" color class', () => {
      render(<Dot color="blue" />);
      expect(document.querySelector(".dot")).toHaveClass("dot-blue");
    });
  });

  describe("Sizes", () => {
    it('applies "sm" size (w-1.5 h-1.5)', () => {
      render(<Dot size="sm" />);
      expect(document.querySelector(".dot")).toHaveClass("w-1.5", "h-1.5");
    });

    it('applies "md" size by default (w-2 h-2)', () => {
      render(<Dot />);
      expect(document.querySelector(".dot")).toHaveClass("w-2", "h-2");
    });
  });

  describe("Animation", () => {
    it("applies animate-pulse-dot when animated is true", () => {
      render(<Dot animated />);
      expect(document.querySelector(".dot")).toHaveClass("animate-pulse-dot");
    });

    it("does not apply animation when animated is false", () => {
      render(<Dot animated={false} />);
      expect(document.querySelector(".dot")).not.toHaveClass("animate-pulse-dot");
    });

    it("defaults to non-animated", () => {
      render(<Dot />);
      expect(document.querySelector(".dot")).not.toHaveClass("animate-pulse-dot");
    });
  });

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(<Dot className="custom-dot" />);
      expect(document.querySelector(".dot")).toHaveClass("custom-dot");
    });
  });

  describe("Accessibility", () => {
    it("forwards additional props", () => {
      render(<Dot id="my-dot" data-testid="test-dot" />);
      expect(document.getElementById("my-dot")).toBeInTheDocument();
    });
  });
});
