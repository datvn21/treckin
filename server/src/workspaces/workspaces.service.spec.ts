import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { WORKSPACE_MEMBER_ROLE } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  function createService(prismaOverrides: Record<string, any> = {}) {
    const prisma: any = {
      workspaceMember: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      workspacePolicy: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      ...prismaOverrides,
    };

    return {
      prisma,
      service: new WorkspacesService(prisma),
    };
  }

  it('allows owners and admins to create events regardless of member policy', async () => {
    const { service, prisma } = createService();
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.ADMIN,
    });

    await expect(service.canCreateEvent('workspace-1', 'user-1')).resolves.toBe(true);
    expect(prisma.workspacePolicy.upsert).not.toHaveBeenCalled();
  });

  it('blocks members from creating events when policy is disabled', async () => {
    const { service, prisma } = createService();
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.MEMBER,
    });
    prisma.workspacePolicy.upsert.mockResolvedValue({
      memberCanCreateEvents: false,
    });

    await expect(service.canCreateEvent('workspace-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows members to create events when policy is enabled', async () => {
    const { service, prisma } = createService();
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.MEMBER,
    });
    prisma.workspacePolicy.upsert.mockResolvedValue({
      memberCanCreateEvents: true,
    });

    await expect(service.canCreateEvent('workspace-1', 'user-1')).resolves.toBe(true);
  });

  it('prevents demoting the last workspace owner', async () => {
    const { service, prisma } = createService();
    prisma.workspaceMember.findUnique
      .mockResolvedValueOnce({ role: WORKSPACE_MEMBER_ROLE.OWNER })
      .mockResolvedValueOnce({
        id: 'membership-1',
        role: WORKSPACE_MEMBER_ROLE.OWNER,
      });
    prisma.workspaceMember.count.mockResolvedValue(1);

    await expect(
      service.updateMemberRole(
        'workspace-1',
        'member-1',
        { role: WORKSPACE_MEMBER_ROLE.ADMIN },
        'owner-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
