import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Select } from "../Select";

describe("Select", () => {
  describe("Rendering", () => {
    it("renders as a select element", () => {
      render(<Select />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders children options", () => {
      render(
        <Select>
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
    });
  });

  describe("Value binding", () => {
    it("accepts value prop", () => {
      render(
        <Select value="b">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveValue("b");
    });

    it("accepts defaultValue prop", () => {
      render(
        <Select defaultValue="a">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveValue("a");
    });
  });

  describe("Error state", () => {
    it("shows error message when error prop is provided", () => {
      render(<Select id="role" error="Role is required" />);
      expect(screen.getByRole("alert")).toHaveTextContent("Role is required");
    });

    it("does not show error message when error prop is not provided", () => {
      render(<Select />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sets aria-invalid when error is present", () => {
      render(<Select error="Error" />);
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    });

    it("has error styling class when error is present", () => {
      render(<Select error="Error" />);
      expect(screen.getByRole("combobox")).toHaveClass("border-danger");
    });

    it("links error message to select via aria-describedby", () => {
      render(<Select id="status" error="Status is required" />);
      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-describedby",
        "status-error",
      );
    });
  });

  describe("Disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Select disabled />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("is not disabled by default", () => {
      render(<Select />);
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("forwards ref to the select element", () => {
      let refValue: HTMLSelectElement | null = null;
      render(<Select ref={(el) => { refValue = el; }} />);
      expect(refValue).toBeInTheDocument();
    });

    it("accepts custom id", () => {
      render(<Select id="my-select" />);
      expect(screen.getByRole("combobox")).toHaveAttribute("id", "my-select");
    });
  });
});
