import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Spinner } from "../Spinner";

describe("Spinner", () => {
  describe("Rendering", () => {
    it("renders as an SVG element", () => {
      render(<Spinner />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-hidden attribute", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("renders with animate-spin class", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("animate-spin");
    });
  });

  describe("Sizes", () => {
    it('applies "sm" size (w-4 h-4)', () => {
      render(<Spinner size="sm" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("w-4", "h-4");
    });

    it('applies "md" size by default (w-6 h-6)', () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("w-6", "h-6");
    });

    it('applies "lg" size (w-8 h-8)', () => {
      render(<Spinner size="lg" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("w-8", "h-8");
    });
  });

  describe("Colors", () => {
    it('applies "primary" color class', () => {
      render(<Spinner color="primary" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("text-primary");
    });

    it('applies "white" color class', () => {
      render(<Spinner color="white" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("text-white");
    });

    it('applies "muted" color class', () => {
      render(<Spinner color="muted" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("text-ink-4");
    });

    it("defaults to primary color", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("text-primary");
    });
  });

  describe("Structure", () => {
    it("renders circle element for the track", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      const circles = svg.querySelectorAll("circle");
      expect(circles.length).toBe(1);
    });

    it("renders path element for the arc", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      const paths = svg.querySelectorAll("path");
      expect(paths.length).toBe(1);
    });

    it("uses currentColor for stroke and fill", () => {
      render(<Spinner />);
      const svg = screen.getByRole("status");
      const circle = svg.querySelector("circle");
      const path = svg.querySelector("path");
      expect(circle).toHaveAttribute("stroke", "currentColor");
      expect(path).toHaveAttribute("fill", "currentColor");
    });
  });

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(<Spinner className="custom-spinner" />);
      const svg = screen.getByRole("status");
      expect(svg).toHaveClass("custom-spinner");
    });
  });
});
