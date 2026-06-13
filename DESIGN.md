# Treckin Design System — DESIGN.md

> **Phase 2: Dropbox-Inspired Product Design System**  
> Last updated: Phase 2 implementation. See `/docs/ux-redesign-phases.md` for full roadmap.

---

## Philosophy

The visual direction is **Dropbox product quality**: warm canvas, generous white space, calm motion, and friendly rounded shapes. The goal is a product that feels considered and settled — not a generic dashboard.

**Key principles:**

1. Warm over cool — canvas and ink lean warm, not cold blue-gray
2. Generous space — page and component spacing should never feel cramped
3. No hover movement — hover states change color, border, opacity, shadow only. Never translate or scale.
4. Blue means action — the primary action color (`#0061fe`) is reserved for primary buttons and active states
5. Typography hierarchy — every text element belongs to a named role

---

## 1. Architectural Pattern: Atomic Design

The frontend codebase is organized using strict **Atomic Design** layers.

```
src/
├── atoms/        # Base primitive components (no business logic, no API calls)
├── molecules/    # Combinations of atoms; may have local state
├── organisms/    # High-level; may use zustand stores
├── templates/    # Screen layouts (AppShell) defining where content lives
└── pages/        # Routed components — data fetching, routing, auth
```

**Rules:**

- Every directory (`atoms/`, `molecules/`, `organisms/`) must have an `index.ts` barrel export
- Atoms and Molecules must be purely presentational
- Atoms must not call APIs. Organisms may.
- No skipping layers — a Page imports Organisms, Organisms import Molecules, etc.

---

## 2. Color Tokens

### Light Mode (Dropbox-inspired warm palette)

| CSS Variable             | Value     | Tailwind Class               | Usage                          |
| ------------------------ | --------- | ---------------------------- | ------------------------------ |
| `--color-canvas`         | `#f7f5f2` | `bg-canvas`                  | Page background (warm cream)   |
| `--color-surface`        | `#ffffff` | `bg-surface`                 | Cards, modals, inputs          |
| `--color-surface-raised` | `#f2efe9` | `bg-surface-raised`          | Hover states, secondary panels |
| `--color-primary`        | `#0061fe` | `text-primary`, `bg-primary` | Dropbox blue — primary actions |
| `--color-primary-hover`  | `#004fd6` | —                            | Button hover background        |
| `--color-primary-muted`  | `#edf3ff` | `bg-primary-muted`           | Badge bg, active nav bg        |
| `--color-primary-border` | `#b8d0ff` | `border-primary-border`      | Badge borders, active nav      |
| `--color-primary-text`   | `#004fd6` | `text-primary-text`          | Text on muted primary bg       |
| `--color-ink-1`          | `#1e1919` | `text-ink-1`                 | Primary text (warm graphite)   |
| `--color-ink-2`          | `#4a4543` | `text-ink-2`                 | Body text (default)            |
| `--color-ink-3`          | `#776e6b` | `text-ink-3`                 | Secondary text, captions       |
| `--color-ink-4`          | `#a89e9b` | `text-ink-4`                 | Placeholders, muted icons      |
| `--color-border-1`       | `#e4deda` | `border-border-1`            | Default borders                |
| `--color-border-2`       | `#cfc8c3` | `border-border-2`            | Hover borders                  |
| `--color-border-3`       | `#b0a9a4` | `border-border-3`            | Strong borders                 |
| `--color-success`        | `#12a150` | —                            | Success green                  |
| `--color-warning`        | `#b45309` | —                            | Warning amber                  |
| `--color-danger`         | `#dc2626` | —                            | Error/danger red               |

### Dark Mode

| CSS Variable             | Value     | Usage                            |
| ------------------------ | --------- | -------------------------------- |
| `--color-canvas`         | `#1a1714` | Page background (warm dark)      |
| `--color-surface`        | `#231f1c` | Cards, modals                    |
| `--color-surface-raised` | `#2c2724` | Hover states                     |
| `--color-primary`        | `#5ba4f5` | Primary blue (adjusted for dark) |
| `--color-ink-1`          | `#f0ebe6` | Primary text (warm off-white)    |
| `--color-ink-2`          | `#c2b9b3` | Body text                        |
| `--color-border-1`       | `#3d3530` | Default borders                  |

**Rule:** Never use hardcoded hex values in component files. Always use CSS variables via Tailwind utility classes.

---

## 3. Typography Roles

All roles defined in `tailwind.config.js → fontSize`.

| Role          | Tailwind Class       | Size           | Weight | Usage                                  |
| ------------- | -------------------- | -------------- | ------ | -------------------------------------- |
| Page title    | `text-page-title`    | 22px / 30px lh | 600    | `<h1>` — one per page via `PageHeader` |
| Section title | `text-section-title` | 17px / 26px lh | 600    | Section headings, modal titles         |
| Card title    | `text-card-title`    | 15px / 24px lh | 600    | Card headings, item titles             |
| Body          | `text-body`          | 14px / 24px lh | 400    | Default prose                          |
| Body small    | `text-body-sm`       | 13px / 22px lh | 400    | Secondary descriptions                 |
| Caption       | `text-caption`       | 12px / 18px lh | 500    | Badges, metadata, timestamps           |
| Overline      | `text-overline`      | 11px / 16px lh | 600    | Section labels, nav labels (uppercase) |
| Form label    | `text-form-label`    | 13px / 22px lh | 600    | Form field labels (`<label>`)          |

**Rules:**

- Each page uses exactly **one** `<h1>` inside `<PageHeader />`
- Use `.text-section-title` for `<h2>` elements
- Use `.text-card-title` for `<h3>` elements
- Never use raw `font-size` or `text-[N]rem` in components — use named roles only

---

## 4. Spacing System

Tailwind spacing units (1 unit = 4px). Named for intent:

| Intent        | Size | Tailwind        | Example                  |
| ------------- | ---- | --------------- | ------------------------ |
| **Micro**     | 4px  | `gap-1`, `mb-1` | Icon-to-label gap        |
| **Micro**     | 8px  | `gap-2`, `mb-2` | Badge gap, small margins |
| **Micro**     | 12px | `gap-3`, `mb-3` | Label bottom margin      |
| **Component** | 16px | `gap-4`, `p-4`  | Default card padding     |
| **Component** | 24px | `gap-6`, `p-6`  | Section spacing          |
| **Component** | 32px | `gap-8`, `p-8`  | Large card padding       |
| **Page**      | 48px | `py-12`         | Section vertical gap     |
| **Page**      | 64px | `py-16`         | Major section divisions  |
| **Page**      | 96px | `py-24`         | Full-page breathing      |

**Page inner wrapper** uses `.page-inner`: `max-w-5xl`, padding `2rem` mobile → `2.5rem` desktop.

---

## 5. Border Radius Scale

| Token   | Class          | Size   | Usage                                      |
| ------- | -------------- | ------ | ------------------------------------------ |
| sm      | `rounded-sm`   | 6px    | Small tags, pills                          |
| DEFAULT | `rounded`      | 8px    | **Inputs**, selects, textareas             |
| md      | `rounded-md`   | 12px   | **Buttons**                                |
| lg      | `rounded-lg`   | 16px   | **Cards**, `.card`                         |
| xl      | `rounded-xl`   | 20px   | **Large panels**, `.card-elevated`, modals |
| 2xl     | `rounded-2xl`  | 24px   | Feature blocks, large hero elements        |
| full    | `rounded-full` | 9999px | Avatars, dot indicators                    |

---

## 6. Motion & Animation Rules

### ❌ FORBIDDEN: Hover Movement

Hover states must **never** change layout or position:

- `transform: translateY(...)` — no lifts
- `transform: scale(...)` — no scaling
- `transform: translateX(...)` — no shifts
- `margin`, `padding` changes
- Any Tailwind `hover:scale-*`, `hover:translate-*`, `hover:-translate-*`

### ✅ ALLOWED: Hover Color/Visual Changes

Hover states may change:

- `background-color`
- `color`
- `border-color`
- `box-shadow` (subtle, not dramatic lifts)
- `opacity`

### Active States

- Use `opacity: 0.82` for press feedback
- Never `scale(0.98)` or `translateY(1px)`

### Animation Library (CSS Keyframes)

| Animation      | Class                     | Duration  | Usage                    |
| -------------- | ------------------------- | --------- | ------------------------ |
| Fade in up     | `.animate-fade-in-up`     | 420ms     | Page content, list items |
| Fade in        | `.animate-fade-in`        | 260ms     | Overlays, backdrop       |
| Scale in       | `.animate-scale-in`       | 320ms     | Modals                   |
| Slide in right | `.animate-slide-in-right` | 320ms     | Toasts                   |
| Shimmer        | `.skeleton`               | 1.6s loop | Skeleton loaders         |

### Reduced Motion

All animations collapse to 1ms via `@media (prefers-reduced-motion: reduce)` — already in `index.css`. No additional work needed.

### Stagger Pattern

```tsx
items.map((item, i) => (
  <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
    ...
  </div>
));
```

---

## 7. Component State Checklist

Every interactive component must handle:

| State    | Implementation                                                       |
| -------- | -------------------------------------------------------------------- |
| Default  | Standard styling                                                     |
| Hover    | Color/border/shadow only — no movement                               |
| Focus    | `box-shadow: 0 0 0 3px rgba(0, 97, 254, 0.28)` via `*:focus-visible` |
| Active   | `opacity: 0.82`                                                      |
| Disabled | `opacity: 0.5`, `cursor-not-allowed`                                 |
| Loading  | Show `<Spinner />` or `<Skeleton />`, disable interaction            |
| Empty    | `<EmptyState />` with icon + title + description + action            |
| Error    | Red border + error text below field, or `.notice-danger` banner      |

---

## 8. Component Shape Reference

### Buttons (`.btn`)

- Border radius: **12px**
- Min height: **44px** (WCAG 2.5.5)
- Padding: `0 18px`
- Hover: background color shift only
- Active: `opacity: 0.82`

### Inputs (`.input`)

- Border radius: **8px**
- Min height: **44px**
- Focus: blue ring `0 0 0 3px rgba(0, 97, 254, 0.22)`

### Cards

- `.card`: 16px radius, `1px solid var(--color-border-1)`, minimal shadow
- `.card-elevated`: 20px radius, larger shadow for modal/dialogs
- `.panel`: 16px radius, `bg-surface-raised` background

### Modals

- Use `.card-elevated` CSS (20px radius)
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Entry animation: `.animate-scale-in`

---

## 9. Mobile UX & Accessibility

### Mobile Priority

- Bottom navigation for mobile (`< lg`)
- Desktop sidebar for desktop (`>= lg`)
- Touch targets: minimum **44px × 44px** for all interactive elements

### Swipe Gestures (BottomNav)

- Swipe left → next tab
- Swipe right → previous tab
- Minimum threshold: 50px horizontal

### Accessibility Rules

- One `<h1>` per page (via `<PageHeader />`)
- Focus states always visible (keyboard users)
- Icon-only buttons must have `aria-label`
- Radix UI primitives handle dialog/toast/dropdown ARIA automatically
- Never remove `outline: none` without replacing with a visible focus style

---

## 10. i18n Rules

- **All** user-facing copy goes through `t('key')` from `react-i18next`
- Default language: Vietnamese (`vi`)
- Never hardcode Vietnamese or English strings in TSX files
- Locale files: `src/i18n/locales/vi.json` and `src/i18n/locales/en.json`
- When adding a new key: add to **both** `vi.json` and `en.json` simultaneously
