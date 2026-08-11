/* ═══════════════════════════════════════════════════════════════
   WorkspacesPage — /app/workspaces
   List all workspaces the user belongs to + create workspace modal.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import { Modal } from "@/molecules/Modal";
import { FormField } from "@/molecules/FormField";
import { PageHeader } from "@/organisms/PageHeader";
import { WorkspaceCard } from "@/organisms/WorkspaceCard";
import { Button } from "@/atoms";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import { setFlowPreference } from "@/lib/flow-preference";
import { useDocumentTitle } from "@/hooks";
import { parseApiError } from "@/lib/parseApiError";
import { cn } from "@/lib/utils";

interface ApiWorkspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  role?: "OWNER" | "MEMBER";
  members?: Array<{ role: "OWNER" | "MEMBER" }>;
  _count?: { events: number; members: number };
}

interface WorkspaceCardItem extends ApiWorkspace {
  role: "OWNER" | "MEMBER";
}

export function WorkspacesPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("workspace.myWorkspaces"));
  const navigate = useNavigate();
  const toast = useToast();

  const [workspaces, setWorkspaces] = useState<WorkspaceCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create workspace modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiWorkspace[] | { data: ApiWorkspace[] }>("/workspaces");
      const arr = Array.isArray(data) ? data : data.data;
      setWorkspaces(
        arr.map((ws) => ({
          ...ws,
          role: ws.role ?? ws.members?.[0]?.role ?? "MEMBER",
        })),
      );
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    setFlowPreference("organizer");
    void load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { data } = await api.post<{ id: string }>("/workspaces", { name });
      toast.success(t("workspace.createSuccess"));
      setCreateOpen(false);
      setNewName("");
      navigate(`/app/workspaces/${data.id}`);
    } catch (err) {
      toast.error(parseApiError(err, t("workspace.createFailed")));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("workspace.myWorkspaces")}
        subtitle={
          !loading ? t("workspace.workspacesCount", { count: workspaces.length }) : undefined
        }
        action={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            {t("workspace.createWorkspace")}
          </Button>
        }
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : workspaces.length === 0 ? (
        <EmptyState
          title={t("workspace.noWorkspaces")}
          description={t("workspace.noWorkspacesDescription")}
          icon={<Building2 size={24} />}
          action={
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              {t("workspace.createWorkspace")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Stat-Led Header Pills */}
          <div className="flex flex-wrap items-center gap-3 animate-fade-in-up">
            <div className="card px-3.5 py-2 flex items-center gap-2 text-caption">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-ink-3">{t("workspace.total", "Total Workspaces")}:</span>
              <span className="font-semibold text-ink-1">{workspaces.length}</span>
            </div>
            <div className="card px-3.5 py-2 flex items-center gap-2 text-caption">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-ink-3">{t("workspace.owner", "Owner")}:</span>
              <span className="font-semibold text-ink-1">
                {workspaces.filter((w) => w.role === "OWNER").length}
              </span>
            </div>
            <div className="card px-3.5 py-2 flex items-center gap-2 text-caption">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-ink-3">{t("workspace.member", "Member")}:</span>
              <span className="font-semibold text-ink-1">
                {workspaces.filter((w) => w.role === "MEMBER").length}
              </span>
            </div>
          </div>

          {/* Bento-inspired Workspace Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {workspaces.map((ws, i) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                role={ws.role}
                onClick={() => navigate(`/app/workspaces/${ws.id}`)}
                className={cn(
                  "hover:shadow-sm transition-all duration-200",
                  i === 0 && workspaces.length > 1 && "md:col-span-2 lg:col-span-1",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <Modal
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCreateOpen(false);
            setNewName("");
          }
        }}
        title={t("workspace.createWorkspace")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="create-ws-form"
              isLoading={creating}
              disabled={!newName.trim()}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form id="create-ws-form" onSubmit={handleCreate}>
          <FormField label={t("workspace.workspaceName")} htmlFor="ws-name">
            <input
              id="ws-name"
              className="input"
              placeholder={t("workspace.workspaceNamePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
