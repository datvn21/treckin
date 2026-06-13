import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Label } from "../Label";

describe("Label", () => {
  describe("Rendering", () => {
    it("renders as a label element", () => {
      render(<Label>Label Text</Label>);
      expect(screen.getByText("Label Text")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <Label>
          <span>Child 1</span>
          <span>Child 2</span>
        </Label>,
      );
      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
    });
  });

  describe("Required indicator", () => {
    it("shows asterisk when required is true", () => {
      render(<Label required>Email</Label>);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("does not show asterisk when required is false", () => {
      render(<Label required={false}>Email</Label>);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("does not show asterisk by default when required is not provided", () => {
      render(<Label>Email</Label>);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("asterisk has aria-hidden attribute", () => {
      render(<Label required>Email</Label>);
      const asterisk = screen.getByText("*");
      expect(asterisk).toHaveAttribute("aria-hidden", "true");
    });

    it("asterisk has danger color class", () => {
      render(<Label required>Email</Label>);
      const asterisk = screen.getByText("*");
      expect(asterisk).toHaveClass("text-danger");
    });
  });

  describe("Styling", () => {
    it("has label class", () => {
      render(<Label>Styled</Label>);
      expect(screen.getByText("Styled")).toHaveClass("label");
    });

    it("applies custom className", () => {
      render(<Label className="custom-label">Custom</Label>);
      expect(screen.getByText("Custom")).toHaveClass("custom-label");
    });
  });

  describe("Accessibility", () => {
    it("forwards htmlFor attribute", () => {
      render(<Label htmlFor="email-input">Email</Label>);
      expect(screen.getByText("Email")).toHaveAttribute("for", "email-input");
    });

    it("forwards additional attributes", () => {
      render(
        <Label id="my-label" data-testid="label-test">
          Test Label
        </Label>,
      );
      expect(screen.getByTestId("label-test")).toBeInTheDocument();
    });
  });
});
