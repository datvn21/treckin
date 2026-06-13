import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Avatar } from "../Avatar";

describe("Avatar", () => {
  describe("Rendering", () => {
    it("renders with Radix Avatar", () => {
      render(<Avatar name="John Doe" />);
      // Radix Avatar renders as a span
      const avatar = document.querySelector(".avatar");
      expect(avatar).toBeInTheDocument();
    });

    it("renders with a name", () => {
      render(<Avatar name="John Doe" />);
      // Avatar should have alt text from name
      const images = document.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);
    });

    it("falls back to ui-avatars.com when no src provided", () => {
      render(<Avatar name="Jane Doe" />);
      const images = document.querySelectorAll("img");
      // At least one should have a src with ui-avatars.com
      const avatarImages = Array.from(images).filter(
        (img) => img.src.includes("ui-avatars.com") || img.src.includes("user_default"),
      );
      expect(avatarImages.length).toBeGreaterThan(0);
    });
  });

  describe("Image source", () => {
    it("uses provided src when available", () => {
      render(<Avatar name="User" src="https://example.com/avatar.jpg" />);
      const images = document.querySelectorAll("img");
      const customImage = Array.from(images).find(
        (img) => img.src === "https://example.com/avatar.jpg",
      );
      expect(customImage).toBeInTheDocument();
    });

    it("falls back to default avatar when src is empty string", () => {
      render(<Avatar name="Empty Src" src="" />);
      // Should use default avatar or ui-avatars
      const images = document.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe("Sizes", () => {
    it('applies "xs" size classes', () => {
      render(<Avatar name="XS" size="xs" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("w-6", "h-6", "text-[9px]");
    });

    it('applies "sm" size classes', () => {
      render(<Avatar name="SM" size="sm" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("w-8", "h-8", "text-xs");
    });

    it('applies "md" size classes by default', () => {
      render(<Avatar name="MD" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("w-10", "h-10", "text-sm");
    });

    it('applies "lg" size classes', () => {
      render(<Avatar name="LG" size="lg" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("w-12", "h-12", "text-base");
    });

    it('applies "xl" size classes', () => {
      render(<Avatar name="XL" size="xl" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("w-16", "h-16", "text-xl");
    });
  });

  describe("Styling", () => {
    it("has base avatar classes", () => {
      render(<Avatar name="Styled" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("rounded-full");
    });

    it("applies custom className", () => {
      render(<Avatar name="Custom" className="custom-class" />);
      const avatar = document.querySelector(".avatar");
      expect(avatar).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("renders images with alt text from name", () => {
      render(<Avatar name="John Doe" />);
      const images = document.querySelectorAll("img");
      const withAlt = Array.from(images).find((img) => img.alt === "John Doe");
      expect(withAlt).toBeInTheDocument();
    });
  });
});
