# Event-Gated Check-In Redesign

## Understanding Summary

- The product should become a general-purpose event check-in app, not a TDTU-only or university-only app.
- Authentication should accept any valid email. TDTU participation is configured per event when needed.
- Global user roles should be limited to `USER` and `ADMIN`.
- Organizer and scanner permissions should come from workspace membership and event assignments.
- Each event controls attendee eligibility with allowed domains, allowed emails, and blocked emails.
- Eligibility must be checked when joining an event and checked again when creating check-in records.
- Events can enable scanner-based attendee credentials, board/event QR self check-in, or both.

## Assumptions

- Phase-one target scale is small to medium events, up to about 2,000 attendees per event.
- Offline support is only required for trusted scanner devices scanning attendee credentials.
- Board/event QR self check-in requires network connectivity in phase one.
- Specific allow/block email lists can be stored in clear text, but only workspace owners and event managers can view or edit them.
- Audit logging for sensitive event-rule changes is recommended and can be phased if scope needs to stay small.
- Existing TDTU-specific `mssv` behavior should be removed or converted to an optional neutral profile field later.

## Decision Log

| Decision                                                            | Alternatives Considered               | Reason                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Use event-level eligibility rules                                   | Global email-domain auth policy       | The app must support public/general events and organization-specific events.                                  |
| Use `allowedDomains`, `allowedEmails`, and `blockedEmails` together | Domain-only or email-list-only rules  | Mixed rules cover most real event cases without overcomplicating phase one.                                   |
| Check eligibility at join and check-in                              | Join-only or check-in-only validation | Re-checking prevents stale registrations from bypassing updated rules.                                        |
| Replace global `STUDENT/STAFF` with `USER/ADMIN`                    | Keep role inferred from email domain  | Workspace/event permissions are more accurate and safer than domain inference.                                |
| Let each event choose check-in modes                                | Force one global check-in flow        | Different events need different operational flows.                                                            |
| Support QR and one-time code credentials                            | QR-only                               | A short code fallback protects users when camera, screen, or QR scanning fails.                               |
| Add event-configurable grace window                                 | Hard reject at exact expiry           | Grace protects attendees from lag, poor network, and scans submitted near expiry.                             |
| Keep offline support scanner-only in phase one                      | Offline self check-in for attendees   | Scanner devices can be treated as trusted actors and audited. Attendee offline self check-in is much riskier. |
| Clean up TDTU/student/MSSV-specific source                          | Keep old wording and behavior         | Old assumptions would keep leaking into UX, auth, DTOs, and docs.                                             |

## Final Design

### Account And Permission Model

All normal accounts use global role `USER`. Platform administrators use `ADMIN`.

Event ownership and operational permissions are not inferred from email domains. They are derived from:

- `WorkspaceMember`: workspace owners and members.
- `EventAssignment`: event managers and scanners.

Existing users with old `STUDENT` or `STAFF` roles should be migrated to `USER`. Any real organizer/scanner access should remain represented through workspace membership or event assignment rows.

### Event Eligibility

Events should store:

- `allowedDomains`
- `allowedEmails`
- `blockedEmails`

Eligibility check order:

1. Normalize the user's email.
2. If email is in `blockedEmails`, reject.
3. If any allow rule exists, require a match in `allowedEmails` or `allowedDomains`.
4. If no allow rule exists, treat the event as public to users with the join code or event QR.

TDTU-only events are just one configuration example: `allowedDomains = ["student.tdtu.edu.vn"]`.

### Join And Check-In Modes

Events should store:

- `checkinModes`: `ATTENDEE_CREDENTIAL`, `BOARD_QR`
- `eventQrBehavior`: `JOIN_ONLY`, `JOIN_AND_CHECKIN`
- `credentialGraceSeconds`: default `120`, allowed range `0-300`

`JOIN_ONLY` registers the attendee after eligibility passes. The attendee can then present a personal QR or one-time code to a scanner.

`JOIN_AND_CHECKIN` registers the attendee if needed and creates a check-in immediately when the event/board QR is scanned, if eligibility and event status checks pass.

Scanner credential mode requires:

- Scanner has permission for the event or board.
- Event enables `ATTENDEE_CREDENTIAL`.
- Attendee is registered and still eligible.
- Credential signature, TTL, grace, context, and reuse checks pass.

Board QR mode requires:

- Event enables `BOARD_QR`.
- QR is bound to the event, board, and direction.
- Attendee is online in phase one.
- Backend still checks eligibility and duplicate/idempotency.

### Credential Security

QRs and one-time codes must represent signed credentials, not plain identifiers.

Credential payload should include:

- `type`
- `userId`
- `eventId`
- `boardId` when relevant
- `direction` when relevant
- `issuedAt`
- `expiresAt`
- `jti`

Backend verifies:

- HMAC signature.
- Context binding.
- TTL plus event grace.
- `jti` has not been consumed.
- Event status and check-in mode.
- Registration and eligibility.
- Scanner permission for scanner-based check-in.

Check-in records should remain idempotent by event/user/board/direction so repeated scans return an "already checked in" result instead of creating duplicates.

### Grace And Offline Fairness

Grace should use the time the credential was scanned, not only the server receive time.

For online scans, `scannedAt` is effectively request time. For offline scanner sync, the scanner submits the original `scannedAt`.

Backend should accept a scanner-offline check-in if:

- The credential was valid at `scannedAt`.
- `scannedAt` is within event close plus `credentialGraceSeconds`.
- Scanner is authorized.
- The record is not a duplicate.

Tokens generated after an event closes should not become valid merely because of grace.

### Cleanup Scope

Remove or neutralize legacy assumptions:

- Hard-coded TDTU domains in auth.
- Email-domain role detection.
- Automatic MSSV extraction from TDTU email.
- `STUDENT` and `STAFF` global roles.
- TDTU examples in DTOs and Swagger docs.
- "University Edition", "student", "MSSV", and similar wording in app copy where it is not neutral.

Keep and evolve:

- Workspace permissions.
- Event assignments.
- Event registrations.
- Check-in idempotency.
- Existing HMAC/Redis QR foundation.

## Implementation Plan

1. Foundation cleanup
   - Change role enum to `USER` and `ADMIN`.
   - Add migration mapping existing `STUDENT` and `STAFF` to `USER`.
   - Remove TDTU domain restriction and role inference from auth.
   - Update auth DTO examples and generic UI wording.

2. Event eligibility
   - Add event eligibility fields.
   - Add DTO validation and normalization.
   - Add a shared eligibility service/helper.
   - Enforce it in join and check-in paths.

3. Check-in mode configuration
   - Add `CHECKIN_MODE` enum and event field.
   - Default existing events to compatible modes.
   - Enforce mode checks in personal credential and board QR endpoints.

4. Event QR behavior
   - Add `EVENT_QR_BEHAVIOR`.
   - Support `JOIN_ONLY` and `JOIN_AND_CHECKIN`.
   - Return clear duplicate/already-registered states.

5. One-time code and grace
   - Extend QR credential payload with explicit issue/expiry metadata.
   - Add short code fallback mapped to the same signed credential model.
   - Add `credentialGraceSeconds` enforcement.
   - Persist or log `scannedAt`, `receivedAt`, and credential `jti` where useful.

6. Frontend
   - Update create/edit event UI for eligibility, modes, event QR behavior, and grace.
   - Add scanner input for one-time code fallback.
   - Update attendee dashboard and labels to neutral wording.
   - Add clear join/check-in failure messages by context.

7. Verification
   - Unit test eligibility rules.
   - Integration test join and check-in enforcement.
   - Test duplicate, blocked email, public event, domain allow, email allow, and stale registration cases.
   - Test grace behavior with near-expiry credentials and offline scanner sync.
