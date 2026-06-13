import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { CountdownRing } from "../ui/CountdownRing";

describe("CountdownRing", () => {
  const defaultProps = { duration: 30, remaining: 20 };

  it("renders SVG element", () => {
    render(<CountdownRing {...defaultProps} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.tagName).toBe("svg");
  });

  it("shows remaining time as text", () => {
    render(<CountdownRing duration={30} remaining={25} />);

    // The component renders remaining seconds as text content
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("25");
  });

  it("displays different time values correctly", () => {
    const { rerender } = render(<CountdownRing duration={30} remaining={30} />);
    expect(screen.getByRole("timer")).toHaveTextContent("30");

    rerender(<CountdownRing duration={30} remaining={1} />);
    expect(screen.getByRole("timer")).toHaveTextContent("1");
  });

  it("uses primary color when remaining > 10s", () => {
    render(<CountdownRing duration={30} remaining={15} />);

    const timer = screen.getByRole("timer");
    const span = timer.querySelector("span");
    expect(span?.className).toContain("text-primary");
  });

  it("uses warning color when remaining is 6-10s", () => {
    render(<CountdownRing duration={30} remaining={7} />);

    const timer = screen.getByRole("timer");
    const span = timer.querySelector("span");
    expect(span?.className).toContain("text-warning");
  });

  it("uses danger color when remaining <= 5s", () => {
    render(<CountdownRing duration={30} remaining={3} />);

    const timer = screen.getByRole("timer");
    const span = timer.querySelector("span");
    expect(span?.className).toContain("text-danger");
  });

  it("uses warning color at boundary (exactly 10s)", () => {
    render(<CountdownRing duration={30} remaining={10} />);

    const timer = screen.getByRole("timer");
    const span = timer.querySelector("span");
    // remaining > 5 and <= 10 → warning
    expect(span?.className).toContain("text-warning");
  });

  it("uses danger color at boundary (exactly 5s)", () => {
    render(<CountdownRing duration={30} remaining={5} />);

    const timer = screen.getByRole("timer");
    const span = timer.querySelector("span");
    // remaining <= 5 → danger
    expect(span?.className).toContain("text-danger");
  });

  it("renders two circle elements (track + progress)", () => {
    render(<CountdownRing {...defaultProps} />);

    const svg = document.querySelector("svg");
    const circles = svg?.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });
});
