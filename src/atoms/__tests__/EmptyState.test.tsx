import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  describe("Rendering", () => {
    it("renders title", () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByText("No items found")).toBeInTheDocument();
    });

    it("renders with default icon when none provided", () => {
      render(<EmptyState title="Empty" />);
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders custom icon when provided", () => {
      render(<EmptyState title="Custom Icon" icon={<span data-testid="custom-icon">🎉</span>} />);
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });
  });

  describe("Description", () => {
    it("renders description when provided", () => {
      render(
        <EmptyState title="No Data" description="There is no data to display at the moment." />,
      );
      expect(screen.getByText("There is no data to display at the moment.")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      render(<EmptyState title="No Description" />);
      // Should only have the title
      expect(screen.getByRole("heading")).toHaveTextContent("No Description");
    });
  });

  describe("Action", () => {
    it("renders action button when provided", () => {
      render(<EmptyState title="No Items" action={<button>Add Item</button>} />);
      expect(screen.getByRole("button", { name: "Add Item" })).toBeInTheDocument();
    });

    it("does not render action area when not provided", () => {
      render(<EmptyState title="No Action" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders multiple action elements", () => {
      render(
        <EmptyState
          title="Multiple Actions"
          action={
            <div>
              <button>Primary</button>
              <button>Secondary</button>
            </div>
          }
        />,
      );
      expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
    });
  });

  describe("Structure", () => {
    it("renders h3 for title", () => {
      render(<EmptyState title="Heading Title" />);
      const heading = screen.getByRole("heading");
      expect(heading.tagName).toBe("H3");
      expect(heading).toHaveTextContent("Heading Title");
    });

    it("renders description as paragraph", () => {
      render(<EmptyState title="Title" description="This is a description." />);
      const paragraph = document.querySelector("p");
      expect(paragraph).toHaveTextContent("This is a description.");
    });
  });

  describe("Custom className", () => {
    it("applies custom className", () => {
      render(<EmptyState title="Custom" className="my-custom-class" />);
      const container = document.querySelector(".empty");
      expect(container).toHaveClass("my-custom-class");
    });
  });

  describe("Accessibility", () => {
    it("forwards additional props", () => {
      render(<EmptyState title="Accessible" id="empty-1" data-testid="empty-state" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });
});
