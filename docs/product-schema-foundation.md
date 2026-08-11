# Treckin Product Schema Foundation

## Purpose

This document defines the product-grade data model direction for Treckin as it moves from MVP to a multi-workspace attendance and check-in product for many organizations.

The product should not be tied to university-only language. University events remain a supported use case, but the core model uses neutral terms such as workspace, member, attendee, registration, session, board, and organization-style operations.

## Understanding Summary

- Treckin is evolving into a multi-workspace product where each workspace is an independent tenant/project/team.
- There is no billing in the first product phase, but the schema should support internal plan keys, usage tracking, and soft quotas.
- The product should be designed for large SaaS-ready scale: many workspaces, large events, 10,000+ attendees, many scanners, async reports, and reliable audit trails.
- Workspace roles are fixed for now: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
- Event-level assignments stay separate from workspace roles: `EVENT_MANAGER` and `SCANNER`.
- `MEMBER` cannot create events by default.
- Attendee data must support custom fields, CSV import, consent capture, waitlist, approval, and retention.
- Deleted data uses soft delete first. The default retention window is 30 days, after which data can be purged or anonymized.
- Check-in workflows should support advanced attendance: QR, board QR, short code, manual lookup, kiosk/self check-in, CSV bulk check-in, offline sync, sessions, capacity, waitlist, and attendance proof.
- Identity remains one account across the full system in the first phase. Workspace-specific user profiles and enterprise identity can be added later.

## Assumptions

- `Workspace` is the tenant boundary for access control, audit logs, soft quotas, settings, and most reports.
- Existing MVP fields should remain during the first migration so backend and frontend code can move gradually.
- Product settings should not be stored only in one large JSON field. High-value settings should be typed columns so they can be validated, indexed, and documented.
- Some flexible data, such as import mappings, validation rules, field options, notification metadata, and audit payloads, can use JSON.
- Exports, CSV imports, report generation, and certificate generation should be asynchronous jobs at product scale.
- Audit logging is required for role changes, invitation changes, event settings changes, imports, exports, manual check-ins, and check-in corrections.
- Retention defaults to 30 days, but workspace policy can override it later.
- Billing/payment is out of scope for this phase.

## Decision Log

| Decision | Selected option | Rationale |
| --- | --- | --- |
| Tenant model | Workspace as independent tenant | Fits the current app and avoids early organization hierarchy complexity. |
| Billing | Not implemented in this phase | Product is not charging yet. Usage/plan metadata can exist without payment. |
| Scale target | Large SaaS-ready | Prevents schema decisions that fail for large events and many workspaces. |
| Workspace roles | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` | Clear product roles without custom RBAC complexity. |
| Event roles | `EVENT_MANAGER`, `SCANNER` | Event assignment needs to vary per event. |
| Member event creation | Disabled by default | Keeps event creation controlled by workspace operators. |
| Deletion model | Soft delete plus retention | Supports recovery, audit, and privacy operations. |
| Retention default | 30 days | Simple, privacy-friendly default for deleted data. |
| Product language | Organization/workspace/attendee | Avoids hard-coding university-only assumptions. |
| Schema approach | Modular Product Schema | More extensible than MVP tables, simpler than custom platform/RBAC engine. |

## Role Model

### Workspace Roles

| Role | Product meaning |
| --- | --- |
| `OWNER` | Full workspace control, including workspace deletion, ownership transfer, settings, members, roles, all events, reports, audit, imports, exports, and retention policy. |
| `ADMIN` | Daily workspace administration. Can manage most members, create and manage events, assign event operators, run imports/exports, and view audit/reporting. Cannot delete workspace or transfer ownership. |
| `MEMBER` | Internal participant. Can view workspace-visible events and register/check in where eligible. Cannot create events by default. |
| `VIEWER` | Read-only observer. Can view allowed dashboards/reports depending on workspace policy. Cannot mutate event, member, or check-in data. |

### Event Assignment Roles

| Role | Product meaning |
| --- | --- |
| `EVENT_MANAGER` | Manages a specific event: settings, sessions, boards, registrations, scanner assignment, reports, and manual operations if workspace policy allows. |
| `SCANNER` | Operates check-in for assigned event/board/session. Can scan, sync offline scans, and view scan results. Extra access is controlled by workspace policy. |

### Recommended Permission Defaults

| Capability | Owner | Admin | Event Manager | Scanner | Member | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| View workspace | Yes | Yes | Yes | Limited | Yes | Yes |
| Edit workspace settings | Yes | Yes | No | No | No | No |
| Delete workspace | Yes | No | No | No | No | No |
| Invite members | Yes | Yes | No | No | No | No |
| Change member roles | Yes | Yes, below owner/admin policy | No | No | No | No |
| Create events | Yes | Yes | No by default | No | No | No |
| Manage all events | Yes | Yes | No | No | No | No |
| Manage assigned event | Yes | Yes | Yes | No | No | No |
| Assign scanner | Yes | Yes | Policy-controlled | No | No | No |
| Scan check-in | Yes | Yes | Yes | Yes | No | No |
| Manual check-in/correction | Yes | Yes | Policy-controlled | Policy-controlled off by default | No | No |
| Export reports | Yes | Yes | Policy-controlled | No | No | Policy-controlled off by default |
| View audit log | Yes | Yes | Event-level only later | No | No | No |

## Core Tenant Schema

Workspace remains the core tenant. It should contain identity and lifecycle fields only. Settings, policies, and usage are separated into dedicated models.

Recommended additions to `Workspace`:

- `slug`: stable, human-readable workspace identifier.
- `description`: optional workspace description.
- `logoUrl`: optional branding asset.
- `timezone`: default timezone for events and reports.
- `locale`: default UI/report locale.
- `status`: lifecycle state.
- `deletedAt`: soft-delete timestamp.
- `purgeAfter`: timestamp used by retention jobs.

Recommended workspace lifecycle enum:

```prisma
enum WORKSPACE_STATUS {
  ACTIVE
  SUSPENDED
  ARCHIVED
  DELETING
}
```

## Workspace Settings

`WorkspaceSettings` stores typed product options that affect default behavior.

Recommended options:

- `defaultRetentionDays`: default `30`.
- `allowPublicEventJoin`: whether public event links can be used.
- `requireEmailVerification`: whether accounts must verify email before joining/registering.
- `allowMemberEventView`: whether regular members can see workspace-visible events.
- `allowViewerReports`: whether viewers can see reports.
- `defaultEventVisibility`: `PRIVATE`, `WORKSPACE`, or `PUBLIC_LINK`.
- `defaultQrTtlSeconds`: default QR credential TTL.
- `defaultOfflineGraceSeconds`: default grace window for offline scan sync.

## Workspace Policy

`WorkspacePolicy` stores operational permissions and compliance choices that should be configurable per workspace without custom RBAC.

Recommended options:

- `memberCanCreateEvents`: default `false`.
- `eventManagerCanInviteScanner`: default `true`.
- `eventManagerCanExportReports`: default `true`.
- `scannerCanSeeAttendeeList`: default `false`.
- `scannerCanManualCheckin`: default `false`.
- `viewerCanExportReports`: default `false`.
- `requireApprovalForEvents`: default `false`.
- `requireApprovalForImports`: default `false`.
- `requireReasonForManualEdit`: default `true`.
- `dataDeletionMode`: `ANONYMIZE` by default.
- `retentionDays`: default `30`.

## Workspace Usage

`WorkspaceUsage` gives the product enough structure for internal limits without billing.

Recommended fields:

- `planKey`: default `free_internal`.
- `maxMembers`, `maxEvents`, `maxAttendees`, `maxMonthlyCheckins`.
- `storageBytes`.
- `monthlyCheckins`.
- `monthlyExports`.
- `periodStartedAt`, `periodEndsAt`.

This is not a subscription model. It is a product operations model.

## Audit Log

`AuditLog` should be workspace-scoped and append-only.

Recommended fields:

- `workspaceId`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `metadata`
- `ipAddress`
- `userAgent`
- `createdAt`

Recommended event examples:

- `workspace.member.invited`
- `workspace.member.role_changed`
- `workspace.settings.updated`
- `event.created`
- `event.settings.updated`
- `event.registration.approved`
- `event.registration.rejected`
- `checkin.manual_created`
- `checkin.corrected`
- `import.started`
- `import.completed`
- `export.requested`
- `export.downloaded`

## Event Schema

The current event model should migrate gradually from MVP fields to product fields.

Recommended product fields:

- `type`: `SINGLE_SESSION`, `MULTI_SESSION`, or `OPEN_CHECKIN`.
- `visibility`: `PRIVATE`, `WORKSPACE`, or `PUBLIC_LINK`.
- `status`: includes `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `ONGOING`, `COMPLETED`, `CANCELLED`, and `ARCHIVED`.
- `startsAt`, `endsAt`: product-grade replacement for split date/start/end fields.
- `timezone`: event-specific override.
- `locationName`, `locationAddress`.
- `capacity`.
- `waitlistMode`: `DISABLED`, `AUTO_PROMOTE`, `MANUAL`.
- `registrationMode`: `CLOSED`, `INVITE_ONLY`, `WORKSPACE_MEMBERS`, `PUBLIC_LINK`, `APPROVAL_REQUIRED`.
- `registrationOpensAt`, `registrationClosesAt`.
- `publicSlug`.
- `deletedAt`, `purgeAfter`.

Existing fields such as `date`, `startTime`, `endTime`, `location`, `attendancePolicy`, `checkinModes`, and `credentialGraceSeconds` should remain temporarily for compatibility. New service code can gradually move behavior into `EventSettings`.

## Event Settings

`EventSettings` stores operational event rules:

- Attendance policy and board requirement count.
- Check-in methods.
- QR behavior.
- QR TTL and credential grace seconds.
- Offline sync enablement.
- Geofence enablement and radius.
- Manual check-in and correction enablement.
- Correction reason requirement.
- Certificate and attendance proof enablement.

This avoids making `Event` a large mixed table containing identity, schedule, registration, and check-in behavior.

## Sessions and Boards

`EventSession` represents a scheduled part of an event. `Board` represents a checkpoint/check-in station.

Recommended `EventSession` fields:

- `eventId`
- `title`
- `description`
- `startsAt`
- `endsAt`
- `locationName`
- `capacity`
- `status`
- `checkinOpensAt`
- `checkinClosesAt`

Recommended `Board` additions:

- `sessionId`
- `code`
- `locationName`
- `lastCheckinAt`

Capacity rules:

- `Event.capacity` is the total registration capacity.
- `EventSession.capacity` is the capacity for a specific session.
- Session capacity can be null to inherit event-level behavior or mean unlimited for that session.
- Waitlist should be event-level in the first product implementation.

## Registration, Custom Fields, and Consent

`EventRegistration` should become the main attendee-event relationship.

Recommended additions:

- `status`: `PENDING_APPROVAL`, `APPROVED`, `WAITLISTED`, `REJECTED`, `CANCELLED`, `CHECKED_IN`, `NO_SHOW`.
- `source`: self join, invite, import, admin add, API, or waitlist promotion.
- `approvedById`, `approvedAt`.
- `rejectedReason`.
- `waitlistPosition`.
- `cancelledAt`.

Custom fields should be modeled as definitions and typed values:

- `AttendeeFieldDefinition`: workspace/event field definitions.
- `RegistrationFieldValue`: typed field values per registration.

Field definitions can be workspace-wide or event-specific. Typed value columns should be used for common querying and reporting:

- `valueText`
- `valueNumber`
- `valueDate`
- `valueJson`

Consent should be versioned:

- `ConsentPolicy`: workspace/event policy text, version, and active state.
- `RegistrationConsent`: accepted/rejected consent per registration and policy.

## Check-in Records, Corrections, and Proof

`CheckinRecord` should support session tracking, richer source metadata, and correction workflows.

Recommended additions:

- `workspaceId`
- `sessionId`
- `status`: `VALID`, `VOIDED`, `CORRECTED`, `FLAGGED`.
- extended source values: `SHORT_CODE`, `KIOSK`, `CSV_IMPORT`.
- `deviceId`
- `latitude`, `longitude`
- `ipAddress`, `userAgent`
- `metadata`

Manual corrections should not overwrite history. Use `CheckinCorrection`:

- `checkinId`
- `action`
- `reason`
- `before`
- `after`
- `createdById`
- `createdAt`

Attendance proof should be its own model:

- `AttendanceProof`
- `proofCode`
- `issuedAt`
- `revokedAt`
- `metadata`

This model can support verification pages, proof links, and certificates later.

## Import, Export, and Async Jobs

Large import/export operations must be asynchronous.

Recommended job models:

- `ImportJob`
- `ExportJob`

Import types:

- `ATTENDEES`
- `REGISTRATIONS`
- `CHECKINS`

Export types:

- `EVENT_REPORT`
- `ATTENDEE_LIST`
- `CHECKIN_LOG`
- `CERTIFICATES`
- `AUDIT_LOG`

Recommended job fields:

- workspace and optional event scope.
- job type.
- status.
- file URLs.
- mapping/filters JSON.
- summary JSON.
- error output.
- requester.
- start/finish timestamps.

## Notifications and Webhooks

Notification schema can exist before a full notification UI.

Recommended models:

- `NotificationPreference`: user/workspace/channel/event-type preferences.
- `WebhookEndpoint`: workspace webhook URL, secret hash, enabled flag, subscribed events.

Recommended channels:

- `EMAIL`
- `IN_APP`
- `WEBHOOK`

## Implementation Phases

### Phase 1: Product Foundation

- Expand enums and models while preserving MVP fields.
- Add workspace status/settings/policy/usage.
- Add event product fields and `EventSettings`.
- Add `EventSession`.
- Extend `Board`.
- Extend `EventRegistration`.
- Extend `CheckinRecord`.
- Add `AuditLog`.
- Add soft delete and retention fields.

### Phase 2: Data Operations

- Add custom attendee fields UI/API.
- Add consent policy UI/API.
- Add import job API.
- Add export job API.
- Add background worker for jobs.
- Add audit logging hooks for high-risk operations.

### Phase 3: Advanced Attendance

- Add waitlist workflows.
- Add approval workflows.
- Add event/session capacity enforcement.
- Add manual correction UI with required reasons.
- Add attendance proof and certificate generation.
- Add notification preferences and webhooks.

### Phase 4: Enterprise Readiness Later

- Organization hierarchy above workspace.
- Workspace-specific profile.
- Domain verification.
- SSO/OIDC/SAML.
- SCIM/provisioning.
- Custom RBAC if fixed roles become insufficient.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Schema grows too fast | Slower implementation and harder UI | Keep product fields modular and phase API/UI work. |
| Existing services break | Regression in MVP flows | Preserve existing fields first, then migrate behavior gradually. |
| Settings become inconsistent | Hard-to-debug permission behavior | Centralize permission checks in policy services. |
| Large exports time out | Poor UX and server pressure | Use async jobs and downloadable files. |
| Custom fields become hard to report | Weak reporting | Store typed values, not only JSON. |
| Manual corrections reduce trust | Audit risk | Append correction records and require reasons. |
| Retention deletes needed data | Support issues | Use soft delete and `purgeAfter`, then build clear admin UI. |

## Immediate Implementation Scope

The first code change should focus on Drizzle schema expansion only:

- Add enums.
- Add models.
- Add relation fields.
- Add indexes.
- Preserve current MVP fields.
- Run `drizzle-kit generate` to produce migrations.

API, services, UI, background jobs, and migrations should be implemented in separate follow-up phases after the foundation schema is stable.
