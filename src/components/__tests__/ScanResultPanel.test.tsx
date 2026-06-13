import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ScanResultPanel } from "../scanner/ScanResultPanel";
import type { ScanResult } from "@/types";

const baseResult: ScanResult = {
  status: "success",
  message: "Check-in thành công!",
  student: {
    id: "user-1",
    name: "Nguyễn Văn A",
    email: "nguyen@example.com",
    avatarUrl: "https://example.com/avatar.jpg",
  },
};

describe("ScanResultPanel", () => {
  it("renders nothing when result is null", () => {
    const { container } = render(<ScanResultPanel result={null} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when result is provided", () => {
    render(<ScanResultPanel result={baseResult} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("shows success state with student info", () => {
    render(<ScanResultPanel result={baseResult} onDismiss={vi.fn()} />);

    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    // Shows email below name
    expect(screen.getByText("nguyen@example.com")).toBeInTheDocument();
  });

  it("shows success icon for success status", () => {
    render(<ScanResultPanel result={baseResult} onDismiss={vi.fn()} />);

    // Success state renders a green accent bar and CheckCircle icon
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.querySelector(".bg-success")).toBeInTheDocument();
  });

  it("shows warning state for already-checked-in", () => {
    const result: ScanResult = {
      status: "already-checked-in",
      message: "Sinh viên đã check-in trước đó",
      originalCheckin: {
        boardName: "Cổng A",
        timestamp: "2026-06-08T08:15:30Z",
      },
    };

    render(<ScanResultPanel result={result} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".bg-warning")).toBeInTheDocument();
    expect(screen.getByText("Đã điểm danh")).toBeInTheDocument();
    expect(screen.getByText("Cổng A")).toBeInTheDocument();
  });

  it("shows danger state for invalid-qr", () => {
    const result: ScanResult = {
      status: "invalid-qr",
      message: "Mã QR không hợp lệ",
    };

    render(<ScanResultPanel result={result} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".bg-danger")).toBeInTheDocument();
    expect(screen.getAllByText("Mã QR không hợp lệ").length).toBeGreaterThanOrEqual(1);
  });

  it("shows danger state for expired-qr", () => {
    const result: ScanResult = {
      status: "expired-qr",
      message: "Mã QR đã hết hạn",
    };

    render(<ScanResultPanel result={result} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".bg-danger")).toBeInTheDocument();
    expect(screen.getAllByText("Mã QR đã hết hạn").length).toBeGreaterThanOrEqual(1);
  });

  it("shows danger state for outside-geofence", () => {
    const result: ScanResult = {
      status: "outside-geofence",
      message: "Ngoài phạm vi check-in",
    };

    render(<ScanResultPanel result={result} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".bg-danger")).toBeInTheDocument();
  });

  it("shows race-condition state with pulsing accent", () => {
    const result: ScanResult = {
      status: "race-condition",
      message: "Check-in trùng lặp",
      originalCheckin: {
        boardName: "Cổng B",
        timestamp: "2026-06-08T09:30:00Z",
      },
    };

    render(<ScanResultPanel result={result} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    // Race condition has animated pulsing danger bar
    const accentBar = dialog.querySelector(".bg-danger.animate-pulse");
    expect(accentBar).toBeInTheDocument();
    expect(screen.getByText("Cổng B")).toBeInTheDocument();
  });

  it("calls onDismiss when close button is clicked", async () => {
    const onDismiss = vi.fn();
    const { userEvent } = await import("@/test/test-utils");
    const user = userEvent.setup();

    render(<ScanResultPanel result={baseResult} onDismiss={onDismiss} />);

    const closeBtn = screen.getByLabelText("Đóng");
    await user.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when backdrop is clicked", async () => {
    const onDismiss = vi.fn();
    const { userEvent } = await import("@/test/test-utils");
    const user = userEvent.setup();

    render(<ScanResultPanel result={baseResult} onDismiss={onDismiss} />);

    const backdrop = screen.getByRole("dialog").querySelector("[aria-hidden='true']");
    if (backdrop) await user.click(backdrop);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("has dialog role for accessibility", () => {
    render(<ScanResultPanel result={baseResult} onDismiss={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
