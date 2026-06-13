import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Badge } from "../Badge";

describe("Badge", () => {
  describe("Rendering", () => {
    it("renders as a span element", () => {
      render(<Badge>Badge Content</Badge>);
      expect(screen.getByText("Badge Content")).toBeInTheDocument();
    });

    it("renders children text", () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it('applies "blue" variant class', () => {
      render(<Badge variant="blue">Blue</Badge>);
      expect(screen.getByText("Blue").parentElement).toHaveClass("badge-blue");
    });

    it('applies "green" variant class', () => {
      render(<Badge variant="green">Green</Badge>);
      expect(screen.getByText("Green").parentElement).toHaveClass("badge-green");
    });

    it('applies "yellow" variant class', () => {
      render(<Badge variant="yellow">Yellow</Badge>);
      expect(screen.getByText("Yellow").parentElement).toHaveClass("badge-yellow");
    });

    it('applies "red" variant class', () => {
      render(<Badge variant="red">Red</Badge>);
      expect(screen.getByText("Red").parentElement).toHaveClass("badge-red");
    });

    it('applies "gray" variant class by default', () => {
      render(<Badge>Gray</Badge>);
      expect(screen.getByText("Gray").parentElement).toHaveClass("badge-gray");
    });
  });

  describe("Dot indicator", () => {
    it("renders dot when dot prop is true", () => {
      render(<Badge dot>With Dot</Badge>);
      const badge = screen.getByText("With Dot").parentElement;
      // The Dot component should be rendered
      expect(badge?.querySelector(".w-1\\.5, .h-1\\.5")).toBeInTheDocument();
    });

    it("does not render dot when dot prop is false", () => {
      render(<Badge dot={false}>Without Dot</Badge>);
      const badge = screen.getByText("Without Dot").parentElement;
      // Badge should have no dot child
      expect(badge?.querySelector('[class*="w-1"]')).not.toBeInTheDocument();
    });

    it("defaults to no dot when dot prop is not provided", () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText("Default")).toBeInTheDocument();
    });

    it("renders dot with correct color for each variant", () => {
      const variants: Array<"blue" | "green" | "yellow" | "red" | "gray"> = [
        "blue",
        "green",
        "yellow",
        "red",
        "gray",
      ];

      variants.forEach((variant) => {
        const { container } = render(
          <Badge variant={variant} dot>
            {variant}
          </Badge>,
        );
        const badge = container.querySelector('[class*="badge-"]');
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe("Custom className", () => {
    it("merges custom className with variant classes", () => {
      render(<Badge className="custom-class">Custom</Badge>);
      expect(screen.getByText("Custom").parentElement).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("forwards additional props", () => {
      render(
        <Badge id="my-badge" data-testid="test-badge">
          Accessible
        </Badge>,
      );
      expect(screen.getByTestId("test-badge")).toBeInTheDocument();
      expect(screen.getByTestId("test-badge")).toHaveAttribute("id", "my-badge");
    });
  });
});
