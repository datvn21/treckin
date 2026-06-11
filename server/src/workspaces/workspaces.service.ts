import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { INVITATION_STATUS, Prisma, WORKSPACE_MEMBER_ROLE } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateWorkspacePolicyDto,
  UpdateWorkspaceSettingsDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const name = dto.name.trim();
    const slug = await this.resolveWorkspaceSlug(dto.slug ?? name);

    return this.prisma.workspace.create({
      data: {
        name,
        slug,
        description: dto.description?.trim() || undefined,
        timezone: dto.timezone?.trim() || 'UTC',
        locale: dto.locale?.trim() || 'en',
        createdById: userId,
        settings: { create: {} },
        policy: { create: {} },
        usage: { create: {} },
        members: {
          create: {
            userId,
            role: WORKSPACE_MEMBER_ROLE.OWNER,
          },
        },
      },
      include: this.workspaceInclude(userId),
    });
  }

  async findMine(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: this.workspaceInclude(userId),
    });
  }

  async findOne(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: this.workspaceInclude(userId),
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async getSettings(workspaceId: string, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    return this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId },
    });
  }

  async updateSettings(workspaceId: string, dto: UpdateWorkspaceSettingsDto, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    const updated = await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: dto,
      create: { workspaceId, ...dto },
    });
    await this.writeAudit(workspaceId, userId, 'workspace.settings.updated', 'WorkspaceSettings', updated.id, {
      after: updated,
    });
    return updated;
  }

  async getPolicy(workspaceId: string, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    return this.prisma.workspacePolicy.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId },
    });
  }

  async updatePolicy(workspaceId: string, dto: UpdateWorkspacePolicyDto, userId: string) {
    await this.requireAdmin(workspaceId, userId);
    const updated = await this.prisma.workspacePolicy.upsert({
      where: { workspaceId },
      update: dto,
      create: { workspaceId, ...dto },
    });
    await this.writeAudit(workspaceId, userId, 'workspace.policy.updated', 'WorkspacePolicy', updated.id, {
      after: updated,
    });
    return updated;
  }

  async findMembers(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async invite(workspaceId: string, dto: InviteWorkspaceMemberDto, userId: string) {
    const actor = await this.requireAdmin(workspaceId, userId);
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? WORKSPACE_MEMBER_ROLE.MEMBER;
    this.assertAssignableRole(actor.role, role);

    const invitedUser = await this.prisma.user.findUnique({ where: { email } });

    if (invitedUser) {
      const existingMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: invitedUser.id } },
      });
      if (existingMember) throw new ConflictException('User is already a workspace member');
    }

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        metadata: { role },
        invitedById: userId,
        token: randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...invitation,
      inviteLink: `/invite/${invitation.token}`,
    };
  }

  async findInvitations(workspaceId: string, userId: string) {
    await this.requireOwner(workspaceId, userId);
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async acceptInvitation(token: string, userId: string, userEmail: string) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new ConflictException('Invitation is no longer pending');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: INVITATION_STATUS.EXPIRED },
      });
      throw new ConflictException('Invitation has expired');
    }
    if (invitation.email !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenException('Login with the invited email to accept this invitation');
    }

    await this.prisma.$transaction([
      this.prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
        update: {},
        create: {
          workspaceId: invitation.workspaceId,
          userId,
          role: this.resolveInvitationRole(invitation.metadata),
        },
      }),
      this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: INVITATION_STATUS.ACCEPTED,
          acceptedById: userId,
          acceptedAt: new Date(),
        },
      }),
    ]);

    return this.findOne(invitation.workspaceId, userId);
  }

  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    dto: UpdateWorkspaceMemberRoleDto,
    actorUserId: string,
  ) {
    const actor = await this.requireAdmin(workspaceId, actorUserId);
    if (memberUserId === actorUserId && dto.role !== WORKSPACE_MEMBER_ROLE.OWNER) {
      throw new BadRequestException('You cannot demote yourself');
    }
    this.assertAssignableRole(actor.role, dto.role);

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    });
    if (!existing) throw new NotFoundException('Workspace member not found');

    const ownerCount = await this.prisma.workspaceMember.count({
      where: { workspaceId, role: WORKSPACE_MEMBER_ROLE.OWNER },
    });
    if (existing.role === WORKSPACE_MEMBER_ROLE.OWNER && actor.role !== WORKSPACE_MEMBER_ROLE.OWNER) {
      throw new ForbiddenException('Only workspace owners can change owner roles');
    }
    if (existing.role === WORKSPACE_MEMBER_ROLE.OWNER && dto.role !== WORKSPACE_MEMBER_ROLE.OWNER && ownerCount <= 1) {
      throw new BadRequestException('Workspace must keep at least one owner');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await this.writeAudit(workspaceId, actorUserId, 'workspace.member.role_changed', 'WorkspaceMember', updated.id, {
      before: { role: existing.role },
      after: { role: updated.role },
    });
    return updated;
  }

  async requireMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Workspace access denied');
    return member;
  }

  async requireOwner(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role !== WORKSPACE_MEMBER_ROLE.OWNER) {
      throw new ForbiddenException('Workspace owner permission required');
    }
    return member;
  }

  async requireAdmin(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role !== WORKSPACE_MEMBER_ROLE.OWNER && member.role !== WORKSPACE_MEMBER_ROLE.ADMIN) {
      throw new ForbiddenException('Workspace admin permission required');
    }
    return member;
  }

  async canCreateEvent(workspaceId: string, userId: string) {
    const member = await this.requireMember(workspaceId, userId);
    if (member.role === WORKSPACE_MEMBER_ROLE.OWNER || member.role === WORKSPACE_MEMBER_ROLE.ADMIN) {
      return true;
    }
    if (member.role !== WORKSPACE_MEMBER_ROLE.MEMBER) {
      throw new ForbiddenException('Workspace admin permission required to create events');
    }

    const policy = await this.prisma.workspacePolicy.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId },
    });
    if (!policy.memberCanCreateEvents) {
      throw new ForbiddenException('Workspace members cannot create events');
    }
    return true;
  }

  private async resolveWorkspaceSlug(input: string) {
    const base = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || `workspace-${randomBytes(3).toString('hex')}`;

    for (let i = 0; i < 10; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      const existing = await this.prisma.workspace.findUnique({ where: { slug } });
      if (!existing) return slug;
    }

    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  private resolveInvitationRole(metadata: Prisma.JsonValue | null): WORKSPACE_MEMBER_ROLE {
    if (
      metadata &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata) &&
      'role' in metadata &&
      typeof metadata.role === 'string' &&
      Object.values(WORKSPACE_MEMBER_ROLE).includes(metadata.role as WORKSPACE_MEMBER_ROLE)
    ) {
      return metadata.role as WORKSPACE_MEMBER_ROLE;
    }
    return WORKSPACE_MEMBER_ROLE.MEMBER;
  }

  private assertAssignableRole(actorRole: WORKSPACE_MEMBER_ROLE, targetRole: WORKSPACE_MEMBER_ROLE) {
    if (
      actorRole !== WORKSPACE_MEMBER_ROLE.OWNER &&
      (targetRole === WORKSPACE_MEMBER_ROLE.OWNER || targetRole === WORKSPACE_MEMBER_ROLE.ADMIN)
    ) {
      throw new ForbiddenException('Only workspace owners can assign owner or admin roles');
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
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType,
        entityId,
        before: this.toJsonValue(payload.before),
        after: this.toJsonValue(payload.after),
        metadata: this.toJsonValue(payload.metadata),
      },
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private workspaceInclude(userId: string) {
    return {
      _count: { select: { members: true, events: true } },
      settings: true,
      policy: true,
      usage: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    } as const;
  }
}
