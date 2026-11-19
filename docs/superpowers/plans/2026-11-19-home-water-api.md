# Home Water API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Home's Water samples with authenticated daily intake, goal progress and a chart of today's logged drinks.

**Architecture:** Home reads the Water feature's existing authenticated daily-summary hook/repository. A Home-owned chart presents each API log and a 500 ml scale; the backend contract and Water feature ownership remain unchanged.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, React Native SVG, existing Water repository and i18n.

**Spec:** [Home Water API design](../specs/2026-11-19-home-water-api-design.md)

## Global Constraints

- Use the existing Water API contract and authenticated repository.
- Keep feature logic in owning modules and use `src/theme/` tokens.
- Provide English and Vietnamese UI text.
- Do not show sample intake when API data is unavailable.
- Run Mobile typecheck and lint before completion.

## Review Focus

- Empty day — show zero/current goal and an explicit no-log chart state.
- API failure — expose retry and do not display stale hardcoded values.
- Over-goal log/total — preserve real values while capping only the progress visualization.
- Local timezone — format log labels in the device timezone used by the API query.
- Many/large logs — chart spacing and 500 ml ticks remain readable and scale to actual amounts.

---

### Task 1: Load Home Water summary

**Files:**
- Modify: `src/features/home/screens/home-screen.tsx`
- Modify: `src/features/home/data/dashboard.ts`
- Modify: `src/features/home/components/metric-card.tsx`
- Modify: `src/features/home/messages.ts`
- Test/check: existing Home/Water tests and Mobile lint/typecheck

**Interfaces:**
- Consumes: `useWaterDaily(date)` and `waterRepository.getContext().today` (confirm exact date API in source); existing `DailyWaterSummary`.
- Produces: Home Water tile state carrying `totalMl`, `goalMl`, and chronological `logs`, plus retry handling.

- [x] Add the authenticated daily summary to Home and ensure both pull/explicit refresh reload Water; preserve user scoping and error/loading/empty states.
- [x] Remove hardcoded Water values from dashboard data and supply the current summary to the Water card.
- [x] Run `npx tsc --noEmit` and `npx expo lint`; no focused Home component test suite exists in this checkout.

### Task 2: Render goal progress and log chart

**Files:**
- Create: `src/features/home/components/water-intake-chart.tsx`
- Modify: `src/features/home/components/metric-card.tsx`
- Modify: `src/features/home/messages.ts`
- Test/check: targeted chart tests if an existing test pattern applies; otherwise lint/typecheck and visual inspection

**Interfaces:**
- Consumes: `logs: WaterLog[]`, `goalMl`, `totalMl`, `loading/error/empty` state.
- Produces: accessible chart showing every event by local time, with horizontal amount scale ticks at 0, 500, 1000 ml etc. through a readable maximum above the largest event.

- [x] Render the Water goal with the actual API target and cap only the ring's visual fill.
- [x] Render each API log in local chronological order on a chart with 500 ml scale increments; label bars/events for accessibility.
- [x] Add EN/VI copy for axis, empty, loading and retry states.
- [x] Check chart scaling by implementation for over-goal values, empty logs, and multiple logs; rerun Mobile typecheck and lint.

### Task 3: Record and hand off

**Files:**
- Modify: `vitaloom-business-docs-and-tools/docs/development-workflow/tasks/home-water-api.md`

- [x] Record changed files and actual verification command output.
- [x] Capture remaining API/runtime limitations and next action.
