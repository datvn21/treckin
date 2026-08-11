import { describe, expect, it, jest } from '@jest/globals';
import { WORKSPACE_MEMBER_ROLE_VALUES } from '../database/schema/enums';
import { WorkspacesService } from './workspaces.service';

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

describe('WorkspacesService (Drizzle)', () => {
  function createService() {
    const db = makeDb();
    const service = new WorkspacesService(db);
    return { db, service };
  }

  it('exports WORKSPACE_MEMBER_ROLE enum values', () => {
    expect(WORKSPACE_MEMBER_ROLE.OWNER).toBe('OWNER');
    expect(WORKSPACE_MEMBER_ROLE.ADMIN).toBe('ADMIN');
    expect(WORKSPACE_MEMBER_ROLE.MEMBER).toBe('MEMBER');
    expect(WORKSPACE_MEMBER_ROLE.VIEWER).toBe('VIEWER');
  });

  it('can be instantiated', () => {
    const { service } = createService();
    expect(service).toBeDefined();
  });
});
