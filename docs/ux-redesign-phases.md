# Treckin UX Redesign Phases

## Purpose

This document captures the agreed UX redesign direction for Treckin before implementation. It exists to prevent scope drift, duplicated flows, mixed-language copy, and another round of generic dashboard UI.

## Understanding Summary

- Treckin currently mixes attendee and organizer flows, so users do not know where to start after login.
- The app needs a clear first decision: join an event or manage events.
- Joining an event must support scanning a QR code, opening a join link, scanning a raw join code, and manual code entry.
- The product must support true VI/EN localization, defaulting to Vietnamese, without hardcoded mixed-language UI.
- The visual direction should feel like high-quality Dropbox product UI: warm canvas, clear blue actions, generous spacing, readable typography, friendly cards, and calm motion.
- Buttons and headings should not be icon-heavy by default. Icons are used only when they clarify the action.
- Hover states must never scale, translate, rotate, or move UI. Hover may change color, border, opacity, and shadow only.

## Non-Functional Requirements

- **Performance**: Core navigation, join, and scan flows should feel instant. Avoid heavy animations and avoid adding large dependencies for Phase 1.
- **Reliability**: Manual join code entry must remain available if camera permission, QR scanning, or deep links fail.
- **Security**: QR payloads only initiate the flow. Joining still calls backend APIs with the authenticated user.
- **Accessibility**: All key flows must be usable with keyboard, visible focus states, real buttons/inputs, and clear labels.
- **Maintainability**: New copy must go through i18n. Shared mapping logic should be extracted when duplication appears in multiple screens.
- **Mobile priority**: Join and QR flows must be first-class on mobile.

## Decision Log

| Decision                                    | Alternatives Considered                            | Rationale                                                                                     |
| ------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Add a post-login role gateway               | Keep sending users straight to events or workspace | The current app hides the product model and makes first use confusing.                        |
| Gateway offers attendee and organizer paths | Add only a QR button to current events page        | A single button would not fix the mixed mental model.                                         |
| Remember last selected flow in localStorage | Backend user profile, hybrid                       | LocalStorage is fast, low risk, and does not require schema/API work for Phase 1.             |
| QR join supports both link and raw code     | Link-only, code-only                               | Link works from phone camera. Raw code works inside app scanner and printed fallback.         |
| True VI/EN i18n, default Vietnamese         | Keep mixed Vietnamese/English labels               | Mixed copy is a core UX defect and makes the app feel unfinished.                             |
| Dropbox-inspired product polish             | Exact Dropbox clone, generic dashboard             | The goal is quality and friendliness, not copying marketing pages or adding icons everywhere. |
| Phased rollout                              | Full rewrite                                       | Phases reduce regression risk and keep cleanup enforceable.                                   |
| Cleanup is part of each phase               | Cleanup as a later task                            | Leaving old routes/components/copy behind will recreate the current confusion.                |

## Phase 1: Flow Foundation

### Goal

Make the product understandable in the first 10 seconds after login.

### Scope

- Add a gateway/resolver for `/app`.
- If `localStorage.treckin-flow` is missing, show the gateway.
- If selected flow is `attendee`, route to the attendee hub.
- If selected flow is `organizer`, route to the organizer hub.
- Provide a visible "change mode" control in the shell or hub so users can switch later.
- Create or reshape an attendee hub around:
  - Scan QR to join.
  - Enter join code.
  - Joined events.
- Support `/join/:code`.
- QR parsing accepts:
  - Full join URL, such as `/join/ABCD1234`.
  - Raw event code, such as `ABCD1234`.
- Move all new copy to `src/i18n/locales/vi.json` and `src/i18n/locales/en.json`.
- Clean mixed-language copy in the affected core screens.

### Preferred Routes

- `/app`: resolver that redirects or renders gateway.
- `/app/home`: optional explicit gateway route.
- `/app/join`: attendee hub.
- `/join/:code`: authenticated join confirmation route. If not authenticated, login then continue.
- `/app/events`: joined events list, still accessible.
- `/app/workspaces`: organizer workspace list/hub.

### Attendee Flow

1. User logs in.
2. If no preference exists, gateway asks them to choose:
   - Join an event.
   - Manage events.
3. User chooses "Join an event".
4. Save `localStorage.treckin-flow = "attendee"`.
5. Show attendee hub with scan QR, enter code, and joined events.
6. If QR/link/code is valid, show a confirmation screen before joining.
7. On success, route to event detail with QR credential clearly visible.

### Organizer Flow

1. User chooses "Manage events".
2. Save `localStorage.treckin-flow = "organizer"`.
3. Show organizer hub/workspace overview.
4. Primary actions are create workspace, open workspace, create event, scanner/manage.

### Acceptance Criteria

- A first-time user is not dropped directly into a mixed event/workspace dashboard.
- The app has a clear place to scan a QR to join an event.
- Manual join code remains visible and usable.
- `/join/:code` works as a user-facing entry route.
- All Phase 1 visible text is available in VI and EN.
- No hover movement or hover scale is introduced.
- Old duplicated or orphaned route/component code is removed or consolidated.

### Cleanup Checklist

- Remove unused imports, abandoned route wrappers, and duplicate join UI.
- Avoid keeping both old and new attendee entry points unless both are intentionally linked.
- Replace hardcoded strings in touched files.
- Consolidate repeated event status mapping if touched in multiple screens.
- Keep `DESIGN.md` aligned with the implemented flow.

## Phase 2: Dropbox-Inspired Design System

### Goal

Make the app feel cohesive, friendly, and stable across screens.

### Scope

- Recalibrate global tokens:
  - Warm canvas inspired by `#f7f5f2`.
  - Primary blue inspired by `#0061fe`.
  - Dark graphite text inspired by `#1e1919`.
  - White elevated surfaces.
- Define typography roles for product UI:
  - Page title.
  - Section title.
  - Card title.
  - Body.
  - Caption.
  - Form label.
- Normalize spacing:
  - Micro: `4`, `8`, `12`.
  - Component: `16`, `24`, `32`.
  - Page: `48`, `64`, `96`.
- Normalize component shapes:
  - Inputs: 8px.
  - Buttons: 12px.
  - Cards/containers: 16px.
  - Large feature panels: 20px.
- Update core primitives:
  - Button.
  - Input.
  - Card/panel.
  - Modal.
  - Tabs.
  - Empty state.
  - Page header.
  - Badge/status.
- Motion:
  - No hover movement.
  - No hover scale.
  - Calm opacity/color/border/shadow transitions.
  - Reduced motion support.

### Acceptance Criteria

- Touched screens share consistent spacing and type hierarchy.
- Primary action is visually obvious but not loud.
- Cards no longer feel cramped.
- Buttons and headings are not icon-heavy by default.
- Component states cover hover, focus, active, disabled, loading, empty, and error.

## Phase 3: Core Screen Redesign

### Goal

Redesign the highest-use screens after the flow and component system are stable.

### Screens

- Gateway.
- Attendee hub / join event.
- Joined events list.
- Event detail.
- QR credential view.
- Organizer hub / workspace overview.
- Workspace detail event list.
- Create event entry point.

### UX Requirements

- Page purpose is visible above the fold.
- Primary action per screen is clear.
- Secondary actions are quieter.
- Empty states explain the next action.
- Status labels are consistent and localized.
- QR credential is easy to find after joining an active event.

### Acceptance Criteria

- A new attendee can join an event without understanding workspace concepts.
- A new organizer can create or open a workspace without seeing attendee-only UI.
- Event detail explains event time, location, status, registration state, and check-in credential clearly.
- Mobile layout is not a compressed desktop sidebar experience.

## Phase 4: Organizer And Scanner Polish

### Goal

Make operational flows fast, clear, and low-error.

### Screens And Flows

- Event manage overview.
- Event settings.
- Assign manager/scanner.
- Board QR display.
- Scanner board.
- Recent check-ins.
- Offline queue and sync states.
- Success/error/race-condition scan feedback.

### UX Requirements

- Scanner UI may be denser than the rest of the app, but it must still be readable and consistent.
- Critical scan results must use strong hierarchy, not decorative animation.
- Offline and sync states must be explicit.
- Admin/manager/scanner terms must be localized consistently.

### Acceptance Criteria

- Scanner operators can identify event, board, online/offline state, and last scan result at a glance.
- Error messages tell the operator what happened and what to do next.
- Organizer pages expose common tasks without digging through generic tabs.

## Phase 5: Hardening And Cleanup

### Goal

Prevent the redesign from regressing into mixed copy, duplicate flows, and untested UI.

### Scope

- Full i18n audit for VI/EN.
- Accessibility audit for keyboard, focus, contrast, and labels.
- Mobile viewport audit.
- Remove stale files/components/routes.
- Build/test cleanup.
- Update `DESIGN.md` with final patterns.
- Add or update focused tests for route decisions, QR parsing, and status mapping.

### Acceptance Criteria

- `npm run build` passes.
- Backend build passes if backend routes are touched.
- No hardcoded user-facing copy remains in redesigned core screens.
- No duplicate old/new join flows remain.
- `DESIGN.md` and this document match the implemented behavior.

## Implementation Order

1. Phase 1 route and flow changes.
2. Phase 1 join QR/code behavior.
3. Phase 1 i18n and cleanup.
4. Phase 2 tokens and primitives.
5. Phase 3 screen redesigns.
6. Phase 4 scanner/organizer polish.
7. Phase 5 hardening.

## Non-Goals For Phase 1

- Backend user preference storage.
- Full visual redesign of every page.
- Offline attendee self check-in.
- New analytics system.
- Replacing the existing backend event model.
- Heavy animation libraries.

## Open Risks

- QR payload format may already exist in generated QR screens and must be verified before implementation.
- Existing login redirect behavior may need careful handling to preserve `/join/:code` continuation.
- Some i18n files currently contain mojibake/encoding artifacts and may require cleanup beyond the new flow.
- Current repo has many untracked/modified files, so implementation must avoid reverting unrelated work.
