import { useMemo, useState, type FormEvent } from "react";
import { Copy, Mail, UserPlus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/atoms/Button";
import { Badge } from "@/atoms/Badge";
import { Select } from "@/atoms/Select";
import { Modal } from "@/molecules/Modal";
import { FormField } from "@/molecules/FormField";
import { useToast } from "@/molecules/Toast";
import { parseApiError } from "@/lib/parseApiError";
import { Avatar } from "@/atoms/Avatar";

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  avatarUrl?: string;
}

interface WorkspaceInvitation {
  id: string;
  email: string;
  createdAt: string;
  status?: string;
  token?: string;
  metadata?: { role?: WorkspaceRole } | null;
  inviteLink?: string;
}

interface WorkspaceMembersPanelProps {
  workspaceId: string;
  currentUserRole: WorkspaceRole;
  members: WorkspaceMember[];
  pendingInvitations?: WorkspaceInvitation[];
  onReload: () => void;
}

const roleOptions: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];


function roleBadge(role: WorkspaceRole) {
  if (role === "OWNER") return "yellow";
  if (role === "ADMIN") return "blue";
  if (role === "VIEWER") return "gray";
  return "green";
}

export function WorkspaceMembersPanel({
  workspaceId,
  currentUserRole,
  members,
  pendingInvitations = [],
  onReload,
}: WorkspaceMembersPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [showRoles, setShowRoles] = useState(false);

  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canAssignElevatedRoles = currentUserRole === "OWNER";
  const selectableInviteRoles = useMemo(
    () =>
      canAssignElevatedRoles
        ? roleOptions
        : roleOptions.filter((role) => role !== "OWNER" && role !== "ADMIN"),
    [canAssignElevatedRoles],
  );

  const roleLabels: Record<WorkspaceRole, string> = {
    OWNER: t("workspace.roles.owner", { defaultValue: "Owner" }),
    ADMIN: t("workspace.roles.admin", { defaultValue: "Admin" }),
    MEMBER: t("workspace.roles.member", { defaultValue: "Member" }),
    VIEWER: t("workspace.roles.viewer", { defaultValue: "Viewer" }),
  };

  const roleDescriptions: Record<WorkspaceRole, string> = {
    OWNER: t("workspace.roleDescriptions.owner", {
      defaultValue: "Full control over workspace policy, settings, members, roles, and events.",
    }),
    ADMIN: t("workspace.roleDescriptions.admin", {
      defaultValue:
        "Manages workspace settings, policies, events, and can invite standard members.",
    }),
    MEMBER: t("workspace.roleDescriptions.member", {
      defaultValue:
        "Can view assigned workspace events. Cannot create events unless policy allows it.",
    }),
    VIEWER: t("workspace.roleDescriptions.viewer", {
      defaultValue: "Read-only access for overview and reporting where workspace policy permits.",
    }),
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    try {
      await api.post(`/workspaces/${workspaceId}/invitations`, { email, role: inviteRole });
      toast.success(t("workspace.inviteSuccess"));
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      onReload();
    } catch (err) {
      toast.error(parseApiError(err, t("workspace.inviteFailed")));
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (memberId: string, role: WorkspaceRole) => {
    setSavingRoleId(memberId);
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
      toast.success(t("workspace.roleUpdated", { defaultValue: "Role updated" }));
      onReload();
    } catch (err) {
      toast.error(
        parseApiError(
          err,
          t("workspace.roleUpdateFailed", { defaultValue: "Could not update role" }),
        ),
      );
    } finally {
      setSavingRoleId(null);
    }
  };

  const copyInviteLink = async (invitation: WorkspaceInvitation) => {
    const link = invitation.inviteLink ?? (invitation.token ? `/invite/${invitation.token}` : "");
    if (!link) return;
    const url = link.startsWith("http") ? link : `${window.location.origin}${link}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("common.copied"));
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex justify-end">
        {canManageMembers && (
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={15} />
            {t("workspace.inviteMember")}
          </Button>
        )}
      </div>

      <div className="card !bg-transparent overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRoles((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink-2 hover:text-ink-1 transition-all duration-100 text-left outline-none"
          aria-expanded={showRoles}
        >
          <span className="flex items-center gap-2">
            <span>{t("workspace.roleInformation")}</span>
          </span>
          <ChevronDown
            size={15}
            className={cn(
              "text-ink-4 transition-transform duration-150",
              showRoles && "rotate-180",
            )}
          />
        </button>

        {showRoles && (
          <div className="p-4 border-t border-border-1 bg-surface-raised/30 animate-fade-in space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {roleOptions.map((role) => (
                <div key={role} className="card bg-surface p-4 border border-border-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-ink-1">{roleLabels[role]}</p>
                  </div>
                  <p className="text-xs leading-5 text-ink-3">{roleDescriptions[role]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border-1">
            <p className="text-caption text-ink-3 uppercase tracking-wider">
              {t("workspace.pendingInvitations")} ({pendingInvitations.length})
            </p>
          </div>
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border-1 last:border-b-0"
            >
              <Mail size={16} className="text-ink-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-2 truncate">{invitation.email}</p>
                <p className="text-xs text-ink-4">
                  {roleLabels[invitation.metadata?.role ?? "MEMBER"]}
                </p>
              </div>
              {(invitation.token || invitation.inviteLink) && (
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => copyInviteLink(invitation)}
                  aria-label={t("common.copyToClipboard")}
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border-1 last:border-b-0"
          >
            <Avatar src={member.avatarUrl} name={member.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-1 truncate">
                {member.name || t("common.noName", { defaultValue: "Chưa đặt tên" })}
              </p>
              <p className="text-xs text-ink-4 truncate">{member.email}</p>
            </div>
            {canManageMembers ? (
              <div className="w-32 ml-auto shrink-0">
                <Select
                  value={member.role}
                  onChange={(e) => updateRole(member.id, e.target.value as WorkspaceRole)}
                  disabled={savingRoleId === member.id}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Badge variant={roleBadge(member.role)} className="shrink-0 ml-auto">
                {roleLabels[member.role]}
              </Badge>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInviteOpen(false);
            setInviteEmail("");
            setInviteRole("MEMBER");
          }
        }}
        title={t("workspace.inviteMember")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="workspace-invite-form"
              isLoading={inviting}
              disabled={!inviteEmail.trim()}
            >
              {t("workspace.inviteMember")}
            </Button>
          </>
        }
      >
        <form id="workspace-invite-form" onSubmit={handleInvite} className="space-y-3">
          <FormField label={t("workspace.inviteEmail")} htmlFor="invite-email">
            <input
              id="invite-email"
              type="email"
              className="input"
              placeholder="ban@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField
            label={t("workspace.inviteRole", { defaultValue: "Role" })}
            htmlFor="invite-role"
          >
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
            >
              {selectableInviteRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
