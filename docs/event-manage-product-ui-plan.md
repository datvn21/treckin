# Event Manage Product UI Plan

## Purpose

Bring the product-grade backend features into the organizer UI incrementally, starting from the event management surface.

## Understanding Summary

- The first UI target is `EventManagePage` because organizers already use this page to operate an event.
- The UI should expose product functionality without creating many new routes too early.
- The first implementation phase focuses on `Sessions` and `Check-in Settings`.
- Later phases add `Registration Form`, `Consent`, and workspace admin controls.
- The UI should keep organization/event/attendee language, not university-only language.
- Data should be fetched per panel where practical so the manage page does not become a heavy initial load.

## Decision Log

| Decision | Selected option | Rationale |
| --- | --- | --- |
| UI entry point | `EventManagePage` | Highest product value for event operators. |
| Navigation pattern | Tabs inside the existing page | Avoids route sprawl and keeps context visible. |
| First phase | Sessions and check-in settings | These features directly improve event operations. |
| Component structure | Split panels under `src/components/event-manage` | Keeps the page maintainable. |
| Backend dependency | Use existing API endpoints | Schema and backend APIs are already implemented. |

## Phase 1 Scope

### Sessions Tab

Capabilities:

- List sessions for an event.
- Create a session.
- Edit an existing session.
- Set title, description, start/end time, capacity, status, and check-in window.
- Show board and check-in counts when available.

API:

- `GET /events/:id/sessions`
- `POST /events/:id/sessions`
- `PATCH /events/:id/sessions/:sessionId`

### Check-in Settings Tab

Capabilities:

- Load current event check-in settings.
- Update attendance policy.
- Update board requirement count.
- Update check-in modes.
- Update QR behavior.
- Update QR TTL, credential grace, geofence, offline sync, manual check-in, manual correction, certificate, and attendance proof flags.

API:

- `GET /events/:id/settings`
- `PATCH /events/:id/settings`

## Later Phases

### Phase 2: Registration Builder

- Attendee custom fields.
- Field archive/edit.
- Consent policies.
- Simple field ordering.

### Phase 3: Workspace Admin

- Workspace settings.
- Workspace policy.
- Member role UI.
- Invitation role UI.

## Risks

| Risk | Mitigation |
| --- | --- |
| `EventManagePage` becomes too large | Move feature sections into dedicated panel components. |
| Enum values are hard to read | Map enum values to localized labels. |
| Settings form grows too dense | Use grouped sections and compact controls. |
| Date-time handling becomes inconsistent | Use `datetime-local` inputs and ISO conversion helpers. |
| Backend rejects invalid policy combinations | Surface API errors through existing toast handling. |

## Implementation Notes

- Add i18n keys to both `vi.json` and `en.json`.
- Keep UI controls dense and operational, not marketing-like.
- Preserve existing overview/assignments/basic settings behavior.
- Run frontend build/tests and backend build/tests after implementation.
