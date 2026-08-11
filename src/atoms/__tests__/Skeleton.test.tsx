import { describe, it, expect } from "vitest";
import { render } from "@/test/test-utils";
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList } from "../Skeleton";

describe("Skeleton", () => {
  describe("Skeleton", () => {
    it("renders as a div element", () => {
      render(<Skeleton />);
      expect(document.querySelector(".skeleton")).toBeInTheDocument();
    });

    it("has aria-hidden attribute for accessibility", () => {
      render(<Skeleton />);
      expect(document.querySelector(".skeleton")).toHaveAttribute("aria-hidden", "true");
    });

    it('applies "text" variant styling', () => {
      render(<Skeleton variant="text" />);
      expect(document.querySelector(".skeleton")).toHaveClass("rounded", "h-4");
    });

    it('applies "circle" variant styling', () => {
      render(<Skeleton variant="circle" />);
      expect(document.querySelector(".skeleton")).toHaveClass("rounded-full");
    });

    it('applies "rect" variant styling', () => {
      render(<Skeleton variant="rect" />);
      expect(document.querySelector(".skeleton")).toHaveClass("rounded-md");
    });

    it("applies custom className", () => {
      render(<Skeleton className="custom-skeleton" />);
      expect(document.querySelector(".skeleton")).toHaveClass("custom-skeleton");
    });
  });

  describe("SkeletonText", () => {
    it("renders specified number of lines", () => {
      render(<SkeletonText lines={5} />);
      const skeletons = document.querySelectorAll(".skeleton");
      expect(skeletons.length).toBe(5);
    });

    it("defaults to 3 lines", () => {
      render(<SkeletonText />);
      const skeletons = document.querySelectorAll(".skeleton");
      expect(skeletons.length).toBe(3);
    });

    it("applies different width to last line", () => {
      render(<SkeletonText lines={3} />);
      const skeletons = document.querySelectorAll(".skeleton");
      const lastSkeleton = skeletons[2];
      expect(lastSkeleton).toHaveClass("w-3/4");
    });

    it("does not apply w-3/4 to single line", () => {
      render(<SkeletonText lines={1} />);
      const skeletons = document.querySelectorAll(".skeleton");
      expect(skeletons[0]).not.toHaveClass("w-3/4");
    });

    it("applies custom className", () => {
      render(<SkeletonText className="custom-text" />);
      const container = document.querySelector(".custom-text");
      expect(container).toBeInTheDocument();
    });
  });

  describe("SkeletonCard", () => {
    it("renders avatar skeleton", () => {
      render(<SkeletonCard />);
      const circleSkeleton = document.querySelector(".rounded-full");
      expect(circleSkeleton).toBeInTheDocument();
    });

    it("renders multiple text skeletons", () => {
      render(<SkeletonCard />);
      const skeletons = document.querySelectorAll(".skeleton");
      // Avatar + 3 text lines = 4 skeletons
      expect(skeletons.length).toBe(4);
    });

    it("applies custom className", () => {
      render(<SkeletonCard className="custom-card" />);
      expect(document.querySelector(".custom-card")).toBeInTheDocument();
    });
  });

  describe("SkeletonList", () => {
    it("renders specified number of cards", () => {
      render(<SkeletonList count={5} />);
      const cards = document.querySelectorAll(".divide-y > div");
      expect(cards.length).toBe(5);
    });

    it("defaults to 3 cards", () => {
      render(<SkeletonList />);
      const cards = document.querySelectorAll(".divide-y > div");
      expect(cards.length).toBe(3);
    });

    it("has loading accessibility attributes", () => {
      render(<SkeletonList />);
      const list = document.querySelector('[aria-busy="true"]');
      expect(list).toBeInTheDocument();
      expect(list).toHaveAttribute("aria-label", "Đang tải…");
    });

    it("applies custom className", () => {
      render(<SkeletonList className="custom-list" />);
      expect(document.querySelector(".custom-list")).toBeInTheDocument();
    });
  });
});
