# Rork App — Reliability Recovery & Acceleration Plan

## Phase 0 · Baseline Forensics & Instrumentation
- **Objective:** Capture a reproducible picture of the failing startup flow before touching dependencies.
- **Actions:**
  - Run `npx expo-doctor` and `expo diagnostics` to snapshot the current environment.
  - Collect Metro start logs with `EXPO_DEBUG=true` and save to `/logs/bootstrap-*.log` for diffing.
  - Enable Bun/Node version pinning via `.nvmrc` (Expo 53 expects Node 18 LTS) and verify bundler path resolution.
  - Add a minimal smoke screen (`app/__startup-check.tsx`) that renders before security services initialize to observe bundle success.
- **Success Criteria:** Metro reaches “Bundling …” without throwing `TerminalReporter` or `getDevServer` errors.

## Phase 1 · Dependency & Toolchain Realignment
- **Objective:** Align the runtime to Expo 53’s supported matrix to eliminate Metro export errors.
- **Actions:**
  - Reset Expo packages to exact versions (`expo@53.0.22`, `expo-router@5.1.5`, `react-native@0.76.x`) using `npx expo install --fix`.
  - Remove stale package artifacts (`bun pm cache rm`, delete `node_modules` and `package-lock.json`) and reinstall via `bun install` + `npx expo-doctor --fix`.
  - Audit custom scripts for deep Metro imports; ensure no package references `metro/src/lib/TerminalReporter`.
  - Lock versions in `package.json` with `~` to prevent drift and add `bun link --frozen-lockfile` check in CI.
- **Success Criteria:** `expo start --clear` boots bundler without module-resolution faults on Android and Web.

## Phase 2 · Startup Architecture Decompression
- **Objective:** Prevent the security stack from blocking the root navigator and crashing Hermes.
- **Actions:**
  - Gate heavy services in `app/_layout.tsx` behind `InteractionManager.runAfterInteractions` and platform guards to avoid running on Web/Expo Go where native bridges are absent.
  - Break `initializeAppSecurity` into composable hooks within a `SecurityBootstrapProvider` that can short-circuit safely.
  - Introduce timeout + retry budget so the first screen renders even if security modules fail (render fallback banner instead of returning `null`).
  - Replace direct `Alert` calls during bootstrap with log events to avoid UI blocking in headless start.
- **Success Criteria:** The index screen renders within 3 seconds on slow devices even when security modules degrade to fallbacks.

## Phase 3 · Navigation & First-Load Experience Hardening
- **Objective:** Guarantee the initial route renders under poor connectivity.
- **Actions:**
  - Shrink the initial bundle by lazy-loading tabs (`React.lazy` with Expo Router’s dynamic route segments) and deferring optional dashboards.
  - Implement an offline-ready welcome screen with cached assets (use `expo-asset` + `Asset.fromModule`).
  - Add `testID`-backed startup smoke tests in `__tests__/startup.spec.tsx` using `@testing-library/react-native` to confirm first-view rendering.
- **Success Criteria:** First paint occurs with a functional skeleton UI regardless of network speed.

## Phase 4 · Platform-Specific Resilience & Slow-Network Strategy
- **Objective:** Make the app pleasant on 2G/3G connections.
- **Actions:**
  - Integrate React Query globally with request-scoped caching and stale-while-revalidate; fall back to AsyncStorage snapshots when offline.
  - Apply adaptive image loading using `expo-image` placeholders, low-quality-thumb-first (LQIP) technique, and manual prefetch on Wi‑Fi.
  - Add network quality detector (`NetInfo`) to adapt polling intervals and disable non-critical background jobs when bandwidth is low.
  - Implement request queuing and exponential backoff for write operations with clear user feedback banners.
- **Success Criteria:** Core flows (Chats, Social feed, Wallet list) operate with cached data and user feedback while offline and recover cleanly once online.

## Phase 5 · Portal Deep-Dives (Chats · Social · Wallet)
- **Objective:** Elevate the three flagship surfaces to production polish.
- **Actions:**
  - **Chats:** Optimize list virtualization via FlashList, collapse logging noise, and ensure message composer debounces encryption hooks.
  - **Social:** Audit feed rendering; move mocked data into React Query seeds and add shimmer placeholders + optimistic like actions.
  - **Wallet:** Enforce numeric precision with `big.js`, add risk badges from security signals, and design offline receipt caching.
  - Establish per-portal QA checklists (visual regression via `expo-storybook` preview if available).
- **Success Criteria:** Each portal ships with measurable UX KPIs (render time < 200 ms after cache warm, scroll FPS ≥ 55 on mid-tier Android).

## Phase 6 · Security & Observability Harmonization
- **Objective:** Preserve advanced security intent without sacrificing stability.
- **Actions:**
  - Consolidate security service configuration into `/services/security/bootstrap.ts` with interface mocks for non-native environments.
  - Add structured logging (JSON) piped to a buffered console transport to reduce log spam.
  - Create incident simulation scripts under `scripts/security-scenarios/` to test degraded modes without blocking startup.
  - Wire critical metrics (boot duration, failed module count) into a lightweight telemetry store for future dashboards.
- **Success Criteria:** Security subsystems can be toggled per-platform via config flags, and their failure never prevents navigation from loading.

## Phase 7 · Continuous Verification & Delivery Readiness
- **Objective:** Prevent regressions and pave the way for production hardening.
- **Actions:**
  - Automate end-to-end smoke runs on Expo Web + Android via `expo start --web` in CI using Playwright (web) and Detox-like lightweight harness (native).
  - Add performance budgets (`scripts/performance-testing`) to fail builds when bundle size or TTI exceeds thresholds.
  - Produce a living README (with Windows/PowerShell & Anaconda workflow) and an engineer onboarding checklist once stabilization completes.
- **Success Criteria:** Green CI pipeline validates startup, offline flows, and security toggles within 10 minutes and blocks divergence automatically.

---
**Implementation Order:** Follow phases sequentially; do not begin a new phase until the prior success criteria are met. Document every change in a changelog to maintain auditability.
