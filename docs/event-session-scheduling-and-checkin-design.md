# Event Session Scheduling And Check-In Design

## Purpose

This document captures the agreed event scheduling and check-in model before implementation. It exists to remove ambiguity between event time, session time, and check-in behavior, while keeping the operator flow simple.

## Understanding Summary

- Every event should always have one default full-event session that covers the entire event duration.
- Sessions exist primarily to support custom scheduling such as split shifts, time blocks, or sub-programs.
- The default event flow should remain simple and should not force operators to think about sessions.
- Events can enable custom sessions when organizers need to divide attendance into multiple time windows.
- When a scan does not fall inside any custom session, the system should still allow check-in as long as the event has not ended.
- Check-ins outside custom sessions should be visible in reporting by exporting `Outside session` in the session name column.
- Time-based enforcement for session matching and event closure must always use server time, not client device time.

## Assumptions

- The default full-event session is a system concept and does not need to be a prominent part of the basic event creation UI.
- Custom sessions are optional and are used mainly for shift-based or segmented events.
- Boards can continue to belong to the event as they do today; session resolution is primarily time-based in this phase.
- Export review is more important than adding extra operator confirmations during a live scan.
- Online check-in uses backend server time as the only authoritative time source.
- Offline sync remains a controlled exception and should keep its existing audit and grace-window behavior.

## Non-Functional Requirements

- **Performance**: Session resolution during scan must remain lightweight and should not add noticeable latency to check-in.
- **Security**: Online time decisions must never trust client device clocks because they can be manipulated.
- **Reliability**: Operators must still be able to check in valid attendees when a scan happens outside a custom session but before the event ends.
- **Auditability**: Reports and exports must clearly distinguish named-session check-ins from outside-session check-ins.
- **Maintainability**: Session-matching rules should live in backend logic so all scanner and check-in flows behave consistently.
- **Usability**: Basic event setup should remain understandable without requiring organizers to learn session internals.

## Decision Log

| Decision                                          | Alternatives Considered                                                                        | Reason                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Every event has a default full-event session      | Make sessions optional only, or treat event as an implicit session without data representation | A concrete default session gives the system one clear scheduling anchor and removes the current ambiguous mental model. |
| Custom sessions are opt-in                        | Require sessions for every event                                                               | Most events only need one overall schedule, so the default flow should stay simple.                                     |
| Allow check-in outside custom sessions            | Hard reject outside-session scans                                                              | Live operations should not fail just because a scan misses a custom time block.                                         |
| Outside-session scans export as `Outside session` | Auto-map them to the default session                                                           | Reporting should make schedule exceptions visible for later review.                                                     |
| Event end time is the hard stop                   | Let session rules override event completion                                                    | The event lifecycle remains the top-level boundary for valid check-in.                                                  |
| Use server time for session matching              | Use client time or mixed client/server time                                                    | Server time is safer and avoids clock spoofing or accidental device drift.                                              |

## Final Design

### Scheduling Model

Each `Event` remains the parent object for title, date, event start time, event end time, location, boards, and attendance rules.

Each event must also have one system-managed default session:

- It is created automatically when the event is created.
- Its time range always matches the full event range.
- It cannot be deleted.
- If the event start or end time changes, the default session should stay in sync with that range.

This default session is the product's scheduling baseline. It exists so the system always has a canonical session representation even when organizers never use custom session management.

### Custom Session Mode

Events should expose a product-level option equivalent to `custom sessions enabled`.

When custom sessions are disabled:

- The event behaves like a simple single-schedule event.
- Organizers do not need to manage extra sessions.
- Check-ins can be treated as event-level check-ins without forcing session awareness into the UI.

When custom sessions are enabled:

- Organizers can create additional sessions for separate shifts, tracks, or scheduled blocks.
- These sessions are used to classify check-ins by time.
- The default full-event session still exists internally, but it does not replace the custom session matching rules.

### Check-In Resolution

The backend remains the single source of truth for resolving whether a scan belongs to a session.

For online scans, the system should resolve check-in in this order:

1. Validate the board, event, attendee registration, and normal check-in permissions.
2. Read the authoritative current time from the backend server.
3. Reject the scan if the event has already ended according to server time.
4. If custom sessions are disabled, allow the scan under the event's normal rules.
5. If custom sessions are enabled, find a custom session whose configured time window contains the server timestamp.
6. If exactly one custom session matches, assign the check-in to that session.
7. If no custom session matches, still allow the check-in and mark it as outside session.

This model keeps live operations resilient while preserving scheduling visibility for later review.

### Outside-Session Behavior

An outside-session check-in is a valid check-in that:

- belongs to the event,
- happens before the event ends,
- but does not fall inside any active custom session window.

Outside-session is a reporting and audit classification, not an operator-facing error state in phase one.

The system should record enough information to let exports and admin views distinguish:

- named session check-ins,
- outside-session check-ins.

### Export And Reporting

Exports should include a `sessionName` column.

The export rule is:

- if the check-in matched a custom session, write that session's name;
- if the check-in did not match any custom session, write `Outside session`.

This keeps `.xlsx` review simple for organizers because they can immediately identify attendance that happened outside the planned schedule.

### Time Authority

Online session matching and event-end enforcement must always use backend server time.

Client-provided time must not be trusted for:

- deciding whether the event has ended,
- deciding which session matched,
- deciding whether a check-in is outside session,
- writing the official timestamp for online scans.

Offline sync can continue to use submitted scan time only within its explicitly controlled and audited offline model. That exception should remain narrow and must not change the online trust model.

## Flow Implications

### Event Setup Flow

Recommended organizer flow:

1. Create the event with title, date, event start time, event end time, location, boards, and check-in settings.
2. System automatically creates the default full-event session.
3. Organizer can leave scheduling as-is for simple events.
4. If the organizer needs separate shifts or blocks, they enable custom sessions and add them.

This keeps the base flow simple while preserving a consistent scheduling model underneath.

### Scanner Flow

Scanner users should not need to manually pick a session in the default design.

The backend should classify the scan automatically using server time and return the final resolved result. This avoids scanner-side complexity and keeps all check-in surfaces consistent.

## Risks

| Risk                                                          | Mitigation                                                                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Organizers confuse event time and session time                | Keep the default full-event session system-managed and explain custom sessions as an optional advanced scheduling feature. |
| Multiple overlapping custom sessions create ambiguous matches | Enforce non-overlapping custom session windows or add explicit conflict validation before activation.                      |
| Staff expect outside-session scans to be blocked              | Keep labels and reporting clear that outside-session is valid but flagged for review.                                      |
| Frontend and backend drift on time logic                      | Centralize all time resolution and session matching in backend services only.                                              |

## Implementation Notes

- Add or formalize a system default session for every event.
- Add an event-level flag for custom session mode.
- Resolve custom session matching on the backend using server time.
- Preserve the hard stop at event end time.
- Record session classification in a way that supports export as `sessionName`.
- Export unmatched scans as `Outside session`.
- Keep scanner UX simple; do not require manual session selection in the base design.
