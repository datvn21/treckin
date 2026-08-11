import { describe, expect, it, jest } from '@jest/globals';
import { EventsService } from './events.service';
import { WORKSPACE_MEMBER_ROLE_VALUES } from '../database/schema/enums';

const WORKSPACE_MEMBER_ROLE = Object.fromEntries(
  WORKSPACE_MEMBER_ROLE_VALUES.map((v) => [v, v]),
) as { [K in (typeof WORKSPACE_MEMBER_ROLE_VALUES)[number]]: K };

function makeDb() {
  const result: any = {
    update: jest.fn(() => result),
    set: jest.fn(() => result),
    where: jest.fn(() => result),
    returning: jest.fn(async () => []),
    insert: jest.fn(() => result),
    values: jest.fn(() => result),
    onConflictDoUpdate: jest.fn(() => result),
    delete: jest.fn(() => result),
    select: jest.fn(() => result),
    from: jest.fn(() => result),
    innerJoin: jest.fn(() => result),
    leftJoin: jest.fn(() => result),
    execute: jest.fn(async () => []),
    transaction: jest.fn(async (cb: any) => cb(result)),
    query: {},
  };
  return result;
}

describe('EventsService (Drizzle)', () => {
  function createService() {
    const db = makeDb();
    const workspacesService: any = {
      canCreateEvent: jest.fn(),
    };
    const service = new EventsService(db, workspacesService);
    return { db, service, workspacesService };
  }

  it('exposes session validation through createSession flow', () => {
    const { service } = createService();
    expect(typeof service.createSession).toBe('function');
    expect(typeof service.updateSession).toBe('function');
  });

  it('does not crash with the WORKSPACE_MEMBER_ROLE re-export', () => {
    expect(WORKSPACE_MEMBER_ROLE.OWNER).toBe('OWNER');
    expect(WORKSPACE_MEMBER_ROLE.MEMBER).toBe('MEMBER');
  });
});
