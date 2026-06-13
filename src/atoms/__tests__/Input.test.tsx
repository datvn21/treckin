import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Input } from "../Input";

describe("Input", () => {
  describe("Rendering", () => {
    it("renders an input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders with placeholder text", () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    });

    it("renders with a label via aria-label", () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    });
  });

  describe("Value binding", () => {
    it("accepts value prop", () => {
      render(<Input value="test value" readOnly />);
      expect(screen.getByRole("textbox")).toHaveValue("test value");
    });

    it("accepts defaultValue prop", () => {
      render(<Input defaultValue="default text" />);
      expect(screen.getByRole("textbox")).toHaveValue("default text");
    });
  });

  describe("Error state", () => {
    it("shows error message when error prop is provided", () => {
      render(<Input id="email" error="Email is required" />);
      expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
    });

    it("does not show error message when error prop is not provided", () => {
      render(<Input />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sets aria-invalid when error is present", () => {
      render(<Input id="name" error="Name is required" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("does not set aria-invalid when no error", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });

    it("links error message to input via aria-describedby", () => {
      render(<Input id="username" error="Username is taken" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "username-error");
    });

    it("has error styling class when error is present", () => {
      render(<Input error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-danger");
    });
  });

  describe("Disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("is not disabled by default", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).not.toBeDisabled();
    });
  });

  describe("Types", () => {
    it("renders as text input by default", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("renders as email input when type=email", () => {
      render(<Input type="email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("renders as password input when type=password", () => {
      render(<Input type="password" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "password");
    });

    it("renders as number input when type=number", () => {
      render(<Input type="number" />);
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("forwards ref to the input element", () => {
      let refValue: HTMLInputElement | null = null;
      render(<Input ref={(el) => { refValue = el; }} />);
      expect(refValue).toBeInTheDocument();
    });

    it("accepts custom id and links with error", () => {
      render(<Input id="custom-id" error="Custom error" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom-id");
      expect(screen.getByRole("alert")).toHaveAttribute("id", "custom-id-error");
    });
  });
});
