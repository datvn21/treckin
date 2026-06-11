import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import {
  ATTENDANCE_POLICY,
  CHECKIN_MODE,
  EVENT_QR_BEHAVIOR,
  WORKSPACE_MEMBER_ROLE,
} from '@prisma/client';
import { EventsService } from './events.service';

describe('EventsService', () => {
  function createService(prismaOverrides: Record<string, any> = {}) {
    const prisma: any = {
      event: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      eventAssignment: {
        findUnique: jest.fn(),
      },
      eventSettings: {
        upsert: jest.fn(),
      },
      eventSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
      board: {
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      ...prismaOverrides,
    };
    const workspacesService: any = {
      canCreateEvent: jest.fn(),
    };

    return {
      prisma,
      service: new EventsService(prisma, workspacesService),
    };
  }

  const event = {
    id: 'event-1',
    workspaceId: 'workspace-1',
    attendancePolicy: ATTENDANCE_POLICY.SINGLE_IN,
    requiredBoardCount: null,
    checkinModes: [CHECKIN_MODE.ATTENDEE_CREDENTIAL],
    eventQrBehavior: EVENT_QR_BEHAVIOR.JOIN_ONLY,
    credentialGraceSeconds: 120,
    geofenceRadius: 100,
  };

  it('updates event settings and syncs legacy event fields', async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.ADMIN,
    });
    prisma.board.count.mockResolvedValue(2);
    prisma.eventSettings.upsert.mockResolvedValue({
      id: 'settings-1',
      attendancePolicy: ATTENDANCE_POLICY.BOARD_REQUIREMENTS,
      requiredBoardCount: 2,
      checkinModes: [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR],
      eventQrBehavior: EVENT_QR_BEHAVIOR.JOIN_AND_CHECKIN,
      credentialGraceSeconds: 60,
      geofenceRadiusMeters: 250,
    });
    prisma.event.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.updateSettings(
      'event-1',
      {
        attendancePolicy: ATTENDANCE_POLICY.BOARD_REQUIREMENTS,
        requiredBoardCount: 2,
        checkinModes: [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR],
        eventQrBehavior: EVENT_QR_BEHAVIOR.JOIN_AND_CHECKIN,
        credentialGraceSeconds: 60,
        geofenceRadiusMeters: 250,
      },
      'admin-1',
    );

    expect(result.id).toBe('settings-1');
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({
        attendancePolicy: ATTENDANCE_POLICY.BOARD_REQUIREMENTS,
        requiredBoardCount: 2,
        checkinModes: [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR],
        eventQrBehavior: EVENT_QR_BEHAVIOR.JOIN_AND_CHECKIN,
        credentialGraceSeconds: 60,
        geofenceRadius: 250,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'event.settings.updated',
        entityId: 'settings-1',
        workspaceId: 'workspace-1',
      }),
    });
  });

  it('rejects board requirement settings when required count exceeds board count', async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.ADMIN,
    });
    prisma.board.count.mockResolvedValue(1);

    await expect(
      service.updateSettings(
        'event-1',
        {
          attendancePolicy: ATTENDANCE_POLICY.BOARD_REQUIREMENTS,
          requiredBoardCount: 2,
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects sessions whose start is after the end', async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WORKSPACE_MEMBER_ROLE.ADMIN,
    });

    await expect(
      service.createSession(
        'event-1',
        {
          title: 'Invalid session',
          startsAt: '2026-06-15T10:00:00.000Z',
          endsAt: '2026-06-15T09:00:00.000Z',
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
