/* ═══════════════════════════════════════════════════════════════
   BoardManagementPanel — full CRUD for event boards.
   Add / rename (inline) / toggle status / delete / open scanner.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Pencil, Trash2, Check, X, ScanQrCode,
  LayoutGrid, Play, Pause, Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/parseApiError";
import { useToast } from "@/molecules/Toast";
import { Modal } from "@/molecules/Modal";
import { Button } from "@/atoms/Button";
import { Input } from "@/atoms/Input";
import { Badge } from "@/atoms/Badge";
import { EmptyState } from "@/atoms/EmptyState";
import { SkeletonList } from "@/atoms/Skeleton";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type BoardStatus = "ACTIVE" | "PAUSED" | "CLOSED";

interface Board {
  id: string;
  name: string;
  status: BoardStatus;
  checkinCount: number;
}

interface BoardManagementPanelProps {
  eventId: string;
  /** Only show scanner buttons when event is ongoing */
  eventIsOngoing: boolean;
  /** Reload tick from parent (e.g., after event data reload) */
  refreshTick?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BoardManagementPanel({
  eventId,
  eventIsOngoing,
  refreshTick,
}: BoardManagementPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  // Add board modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Inline rename state: boardId → draft name
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scanner board-selector modal
  const [scannerModalOpen, setScannerModalOpen] = useState(false);

  // ── Data loading ───────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Board[] | { data: Board[] }>(`/events/${eventId}/boards`);
      const list = Array.isArray(data) ? data : data.data;
      setBoards(list);
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [eventId, t, toast]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, refreshTick]);

  // Auto-focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingId]);

  // ── Actions ────────────────────────────────────────────────────

  const handleAddBoard = async () => {
    const name = newBoardName.trim();
    if (!name) return;
    setIsAdding(true);
    try {
      await api.post(`/events/${eventId}/boards`, { name });
      toast.success(t("manage.boards.addSuccess"));
      setAddOpen(false);
      setNewBoardName("");
      void load();
    } catch (err) {
      toast.error(parseApiError(err, t("manage.boards.addFailed")));
    } finally {
      setIsAdding(false);
    }
  };

  const startRename = (board: Board) => {
    setRenamingId(board.id);
    setRenameDraft(board.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft("");
  };

  const commitRename = async (boardId: string) => {
    const name = renameDraft.trim();
    if (!name) { cancelRename(); return; }

    const original = boards.find((b) => b.id === boardId)?.name;
    if (name === original) { cancelRename(); return; }

    try {
      await api.patch(`/events/${eventId}/boards/${boardId}`, { name });
      setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, name } : b));
      toast.success(t("manage.boards.renameSuccess"));
    } catch (err) {
      toast.error(parseApiError(err, t("manage.boards.renameFailed")));
    } finally {
      cancelRename();
    }
  };

  const toggleStatus = async (board: Board) => {
    const newStatus: BoardStatus = board.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await api.patch(`/events/${eventId}/boards/${board.id}`, { status: newStatus });
      setBoards((prev) => prev.map((b) => b.id === board.id ? { ...b, status: newStatus } : b));
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/events/${eventId}/boards/${deleteId}`);
      setBoards((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success(t("manage.boards.deleteSuccess"));
      setDeleteId(null);
    } catch (err) {
      toast.error(parseApiError(err, t("manage.boards.deleteFailed")));
    } finally {
      setIsDeleting(false);
    }
  };

  const openScanner = (boardId: string) => {
    window.open(`/staff/scanner/${eventId}/${boardId}`, "_blank");
  };

  const handleOpenScannerButton = () => {
    const firstBoard = boards[0];
    if (boards.length === 1 && firstBoard) {
      openScanner(firstBoard.id);
    } else {
      setScannerModalOpen(true);
    }
  };

  // ── Status helpers ─────────────────────────────────────────────
  const statusBadge = (status: BoardStatus) => {
    switch (status) {
      case "ACTIVE": return <Badge variant="green">{t("manage.boards.statusActive")}</Badge>;
      case "PAUSED": return <Badge variant="yellow">{t("manage.boards.statusPaused")}</Badge>;
      case "CLOSED": return <Badge variant="gray">{t("manage.boards.statusClosed")}</Badge>;
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) return <SkeletonList count={3} />;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-section-title text-ink-1">
          {t("manage.boards.title")}
        </h3>
        <div className="flex items-center gap-2">
          {/* Global "Open Scanner" button */}
          {eventIsOngoing && boards.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenScannerButton}
            >
              <ScanQrCode size={14} />
              {t("event.openScanner")}
            </Button>
          )}
          {/* Add board button */}
          <Button variant="default" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            {t("manage.boards.add")}
          </Button>
        </div>
      </div>

      {/* Board list */}
      {boards.length === 0 ? (
        <EmptyState
          title={t("manage.noBoards")}
          icon={<LayoutGrid size={24} />}
          action={
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} />
              {t("manage.boards.add")}
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden divide-y divide-border-1">
          {boards.map((board) => (
            <div key={board.id} className="px-4 py-3 flex items-center gap-3">
              {/* Board name — inline editable */}
              <div className="flex-1 min-w-0">
                {renamingId === board.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={renameInputRef}
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename(board.id);
                        if (e.key === "Escape") cancelRename();
                      }}
                      className="h-7 text-sm py-0 px-2"
                      maxLength={64}
                    />
                    <button
                      type="button"
                      onClick={() => void commitRename(board.id)}
                      className="btn-icon text-success"
                      aria-label={t("common.save")}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="btn-icon text-ink-3"
                      aria-label={t("common.cancel")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-ink-1 truncate">{board.name}</p>
                    <p className="text-xs text-ink-4 mt-0.5">
                      {t("manage.boardCheckins", { count: board.checkinCount })}
                    </p>
                  </div>
                )}
              </div>

              {/* Status badge */}
              {renamingId !== board.id && statusBadge(board.status)}

              {/* Actions */}
              {renamingId !== board.id && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* Rename */}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => startRename(board)}
                    title={t("common.edit")}
                    aria-label={t("common.edit")}
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Pause / Resume (only for ACTIVE/PAUSED) */}
                  {board.status !== "CLOSED" && (
                    <button
                      type="button"
                      className={cn(
                        "btn-icon",
                        board.status === "PAUSED" && "text-warning"
                      )}
                      onClick={() => void toggleStatus(board)}
                      title={board.status === "ACTIVE" ? t("manage.boards.pause") : t("manage.boards.resume")}
                      aria-label={board.status === "ACTIVE" ? t("manage.boards.pause") : t("manage.boards.resume")}
                    >
                      {board.status === "ACTIVE" ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                  )}

                  {/* Scanner launch per board */}
                  {eventIsOngoing && (
                    <button
                      type="button"
                      className="btn-icon text-primary"
                      onClick={() => openScanner(board.id)}
                      title={t("manage.openScannerForBoard")}
                      aria-label={t("manage.openScannerForBoard")}
                    >
                      <ScanQrCode size={13} />
                    </button>
                  )}

                  {/* Delete — only if no check-ins */}
                  <button
                    type="button"
                    className={cn(
                      "btn-icon",
                      board.checkinCount > 0
                        ? "text-ink-4 cursor-not-allowed opacity-40"
                        : "text-danger"
                    )}
                    onClick={() => board.checkinCount === 0 && setDeleteId(board.id)}
                    disabled={board.checkinCount > 0}
                    title={
                      board.checkinCount > 0
                        ? t("manage.boards.cantDeleteHasCheckins")
                        : t("common.delete")
                    }
                    aria-label={t("common.delete")}
                  >
                    {board.checkinCount > 0 ? <Lock size={13} /> : <Trash2 size={13} />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add Board Modal ─────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("manage.boards.addTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAdding}
              disabled={!newBoardName.trim()}
              onClick={() => void handleAddBoard()}
            >
              {t("manage.boards.add")}
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          placeholder={t("manage.boards.namePlaceholder")}
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleAddBoard()}
          maxLength={64}
        />
      </Modal>

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      <Modal
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("common.delete")}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="default" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={() => void handleDelete()}>
              {t("common.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">
          {t("manage.boards.deleteConfirm", {
            name: boards.find((b) => b.id === deleteId)?.name ?? "",
          })}
        </p>
      </Modal>

      {/* ── Scanner Board Selector Modal ────────────────────────── */}
      <Modal
        open={scannerModalOpen}
        onOpenChange={setScannerModalOpen}
        title={t("manage.boards.selectBoardToScan")}
        size="sm"
      >
        <div className="space-y-2">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border-1 hover:bg-surface-raised hover:border-border-2 transition-colors text-left"
              onClick={() => {
                setScannerModalOpen(false);
                openScanner(board.id);
              }}
            >
              <ScanQrCode size={16} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-1">{board.name}</p>
                <p className="text-xs text-ink-4">
                  {t("manage.boardCheckins", { count: board.checkinCount })}
                </p>
              </div>
              {statusBadge(board.status)}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
