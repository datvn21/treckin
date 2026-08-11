import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { DatabaseService } from "../database/database.service";
import {
  auditLogs,
  events,
  users,
  workspaceInvitations,
  workspaceMembers,
  workspacePolicies,
  workspaceSettings,
  workspaceUsage,
  workspaces,
} from "../database/schema";
import {
  CreateWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateWorkspacePolicyDto,
  UpdateWorkspaceSettingsDto,
} from "./dto/workspace.dto";

type WorkspaceMemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const name = dto.name.trim();
    const slug = await this.resolveWorkspaceSlug(dto.slug ?? name);

    const [workspace] = await this.db.db
      .insert(workspaces)
      .values({
        name,
        slug,
        description: dto.description?.trim() || null,
        timezone: dto.timezone?.trim() || "UTC",
        locale: dto.locale?.trim() || "en",
        createdById: userId,
      })
      .returning();

    await this.db.db.insert(workspaceSettings).values({ workspaceId: workspace.id });
    await this.db.db.insert(workspacePolicies).values({ workspaceId: workspace.id });
    await this.db.db.insert(workspaceUsage).values({
      workspaceId: workspace.id,
      storageBytes: 0n,
    });
    await this.db.db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    });

    return this.fetchWorkspace(workspace.id, userId);
  }

  async findMine(userId: string) {
    const rows = await this.db.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(sql`${workspaces.createdAt} DESC`);

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const w = await this.fetchWorkspace(row.id, userId);
        if (!w) throw new NotFoundException("Workspace not found");
        return w;
      }),
    );
    return enriched;
  }

  async findOne(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    const workspace = await this.fetchWorkspace(workspaceId, userId);
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto, userId: string) {
    await this.requireAdmin(workspaceId, userId);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData["name"] = dto.name.trim();
    if (dto.description !== undefined) {
      updateData["description"] = dto.description?.trim() || null;
    }
    if (dto.timezone !== undefined) updateData["timezone"] = dto.timezone.trim();
    if (dto.locale !== undefined) updateData["locale"] = dto.locale.trim();
    if (dto.slug !== undefined) updateData["slug"] = await this.resolveWorkspaceSlug(dto.slug);

    const [updated] = await this.db.db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, workspaceId))
      .returning();

    await this.writeAudit(workspaceId, userId, "workspace.updated", "Workspace", updated.id, {
      after: updated,
    });

    return this.fetchWorkspace(workspaceId, userId);
  }

  async getSettings(workspaceId: string, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    return this.upsertWorkspaceSettings(workspaceId);
  }

  async updateSettings(workspaceId: string, dto: UpdateWorkspaceSettingsDto, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    const updated = await this.upsertWorkspaceSettings(workspaceId, dto);
    await this.writeAudit(
      workspaceId,
      userId,
      "workspace.settings.updated",
      "WorkspaceSettings",
      updated.id,
      { after: updated },
    );
    return updated;
  }

  async getPolicy(workspaceId: string, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    return this.upsertWorkspacePolicy(workspaceId);
  }

  async updatePolicy(workspaceId: string, dto: UpdateWorkspacePolicyDto, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    const updated = await this.upsertWorkspacePolicy(workspaceId, dto);
    await this.writeAudit(
      workspaceId,
      userId,
      "workspace.policy.updated",
      "WorkspacePolicy",
      updated.id,
      { after: updated },
    );
    return updated;
  }

  async findMembers(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    const rows = await this.db.db
      .select({
        member: workspaceMembers,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(sql`${workspaceMembers.role} ASC`, sql`${workspaceMembers.createdAt} ASC`);

    return rows.map((r) => ({
      ...r.member,
      user: r.user,
    }));
  }

  async invite(workspaceId: string, dto: InviteWorkspaceMemberDto, userId: string) {
    const actor = await this.requireAdmin(workspaceId, userId);
    const email = dto.email.trim().toLowerCase();
    const role = (dto.role ?? "MEMBER") as WorkspaceMemberRole;
    this.assertAssignableRole(actor.role as WorkspaceMemberRole, role);

    const [invitedUser] = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (invitedUser) {
      const [existingMember] = await this.db.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, invitedUser.id),
          ),
        )
        .limit(1);
      if (existingMember) throw new ConflictException("User is already a workspace member");
    }

    const [invitation] = await this.db.db
      .insert(workspaceInvitations)
      .values({
        workspaceId,
        email,
        metadata: { role },
        invitedById: userId,
        token: randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      })
      .returning();

    const [withRefs] = await this.db.db
      .select({
        invitation: workspaceInvitations,
        workspace: { id: workspaces.id, name: workspaces.name },
        invitedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workspaceInvitations)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
      .innerJoin(users, eq(users.id, workspaceInvitations.invitedById))
      .where(eq(workspaceInvitations.id, invitation.id))
      .limit(1);

    return {
      ...withRefs.invitation,
      workspace: withRefs.workspace,
      invitedBy: withRefs.invitedBy,
      inviteLink: `/invite/${withRefs.invitation.token}`,
    };
  }

  async findInvitations(workspaceId: string, userId: string) {
    await this.requireOwner(workspaceId, userId);
    const rows = await this.db.db
      .select({
        invitation: workspaceInvitations,
        invitedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workspaceInvitations)
      .innerJoin(users, eq(users.id, workspaceInvitations.invitedById))
      .where(eq(workspaceInvitations.workspaceId, workspaceId))
      .orderBy(sql`${workspaceInvitations.createdAt} DESC`);

    return rows.map((r) => ({
      ...r.invitation,
      invitedBy: r.invitedBy,
    }));
  }

  async acceptInvitation(token: string, userId: string, userEmail: string) {
    const [invitation] = await this.db.db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token))
      .limit(1);

    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.status !== "PENDING") {
      throw new ConflictException("Invitation is no longer pending");
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.db.db
        .update(workspaceInvitations)
        .set({ status: "EXPIRED" })
        .where(eq(workspaceInvitations.id, invitation.id));
      throw new ConflictException("Invitation has expired");
    }
    if (invitation.email !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenException("Login with the invited email to accept this invitation");
    }

    await this.db.db.transaction(async (tx) => {
      await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: invitation.workspaceId,
          userId,
          role: this.resolveInvitationRole(invitation.metadata as unknown),
        })
        .onConflictDoUpdate({
          target: [workspaceMembers.workspaceId, workspaceMembers.userId],
          set: { role: this.resolveInvitationRole(invitation.metadata as unknown) },
        });

      await tx
        .update(workspaceInvitations)
        .set({
          status: "ACCEPTED",
          acceptedById: userId,
          acceptedAt: new Date(),
        })
        .where(eq(workspaceInvitations.id, invitation.id));
    });

    return this.findOne(invitation.workspaceId, userId);
  }

  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    dto: UpdateWorkspaceMemberRoleDto,
    actorUserId: string,
  ) {
    const actor = await this.requireAdmin(workspaceId, actorUserId);
    if (memberUserId === actorUserId && dto.role !== "OWNER") {
      throw new BadRequestException("You cannot demote yourself");
    }
    this.assertAssignableRole(actor.role as WorkspaceMemberRole, dto.role as WorkspaceMemberRole);

    const [existing] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberUserId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Workspace member not found");

    const [ownerCountRow] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, "OWNER"),
        ),
      );
    if (existing.role === "OWNER" && (actor.role as WorkspaceMemberRole) !== "OWNER") {
      throw new ForbiddenException("Only workspace owners can change owner roles");
    }
    if (
      existing.role === "OWNER" &&
      dto.role !== "OWNER" &&
      (ownerCountRow?.n ?? 0) <= 1
    ) {
      throw new BadRequestException("Workspace must keep at least one owner");
    }

    const [updated] = await this.db.db
      .update(workspaceMembers)
      .set({ role: dto.role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberUserId),
        ),
      )
      .returning();

    await this.writeAudit(
      workspaceId,
      actorUserId,
      "workspace.member.role_changed",
      "WorkspaceMember",
      updated.id,
      {
        before: { role: existing.role },
        after: { role: updated.role },
      },
    );

    return updated;
  }

  async requireMember(workspaceId: string, userId: string) {
    const [member] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Workspace access denied");
    return member;
  }

  async requireOwner(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role !== "OWNER") {
      throw new ForbiddenException("Workspace owner permission required");
    }
    return member;
  }

  async requireAdmin(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new ForbiddenException("Workspace admin permission required");
    }
    return member;
  }

  async canCreateEvent(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role === "OWNER" || member.role === "ADMIN") {
      return true;
    }
    if (member.role !== "MEMBER") {
      throw new ForbiddenException("Workspace admin permission required to create events");
    }

    const policy = await this.upsertWorkspacePolicy(workspaceId);
    if (!policy.memberCanCreateEvents) {
      throw new ForbiddenException("Workspace members cannot create events");
    }
    return true;
  }

  private async fetchWorkspace(workspaceId: string, userId: string) {
    const [workspace] = await this.db.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) return null;

    const [settings] = await this.db.db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);
    const [policy] = await this.db.db
      .select()
      .from(workspacePolicies)
      .where(eq(workspacePolicies.workspaceId, workspaceId))
      .limit(1);
    const [usage] = await this.db.db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.workspaceId, workspaceId))
      .limit(1);

    const memberCount = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    const eventCount = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.workspaceId, workspaceId));

    const [membership] = await this.db.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    return {
      ...workspace,
      settings,
      policy,
      usage,
      members: membership ? [{ role: membership.role }] : [],
      _count: { members: memberCount[0]?.n ?? 0, events: eventCount[0]?.n ?? 0 },
    };
  }

  private async upsertWorkspaceSettings(
    workspaceId: string,
    dto?: UpdateWorkspaceSettingsDto,
  ) {
    const [existing] = await this.db.db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);

    if (existing) {
      if (!dto) return existing;
      const [updated] = await this.db.db
        .update(workspaceSettings)
        .set(dto)
        .where(eq(workspaceSettings.workspaceId, workspaceId))
        .returning();
      return updated;
    }

    const [created] = await this.db.db
      .insert(workspaceSettings)
      .values({ workspaceId, ...(dto ?? {}) })
      .returning();
    return created;
  }

  private async upsertWorkspacePolicy(workspaceId: string, dto?: UpdateWorkspacePolicyDto) {
    const [existing] = await this.db.db
      .select()
      .from(workspacePolicies)
      .where(eq(workspacePolicies.workspaceId, workspaceId))
      .limit(1);

    if (existing) {
      if (!dto) return existing;
      const [updated] = await this.db.db
        .update(workspacePolicies)
        .set(dto)
        .where(eq(workspacePolicies.workspaceId, workspaceId))
        .returning();
      return updated;
    }

    const [created] = await this.db.db
      .insert(workspacePolicies)
      .values({ workspaceId, ...(dto ?? {}) })
      .returning();
    return created;
  }

  private async resolveWorkspaceSlug(input: string) {
    const base =
      input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || `workspace-${randomBytes(3).toString("hex")}`;

    for (let i = 0; i < 10; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      const [existing] = await this.db.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
      if (!existing) return slug;
    }

    return `${base}-${randomBytes(4).toString("hex")}`;
  }

  private resolveInvitationRole(metadata: unknown): WorkspaceMemberRole {
    if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      "role" in (metadata as Record<string, unknown>) &&
      typeof (metadata as Record<string, unknown>)["role"] === "string"
    ) {
      const role = (metadata as Record<string, unknown>)["role"] as WorkspaceMemberRole;
      if (["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(role)) {
        return role;
      }
    }
    return "MEMBER";
  }

  private assertAssignableRole(actorRole: WorkspaceMemberRole, targetRole: WorkspaceMemberRole) {
    if (
      actorRole !== "OWNER" &&
      (targetRole === "OWNER" || targetRole === "ADMIN")
    ) {
      throw new ForbiddenException("Only workspace owners can assign owner or admin roles");
    }
  }

  private async writeAudit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    payload: { before?: unknown; after?: unknown; metadata?: unknown },
  ) {
    await this.db.db.insert(auditLogs).values({
      workspaceId,
      actorUserId,
      action,
      entityType,
      entityId,
      before: this.toJsonValue(payload.before),
      after: this.toJsonValue(payload.after),
      metadata: this.toJsonValue(payload.metadata),
    });
  }

  private toJsonValue(value: unknown): unknown {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }
}
