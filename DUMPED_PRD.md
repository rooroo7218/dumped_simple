# Dumped — Product Requirements Document
**Version 2.0 · March 2026 · Updated from full codebase audit**

---

## 1. What Is Dumped?

Dumped is an AI-powered personal operating system for people with too much in their heads. You write (or speak) whatever is on your mind — worries, goals, to-dos, observations — and the app turns it into a prioritised, contextual action plan that adapts to your mood, available time, and personal values.

**The core promise:** Go from overwhelmed to "I know exactly what to do next" in under 60 seconds.

**Who it's for:** Busy professionals, solo founders, and anyone who feels like their brain is running too many tabs.

---

## 2. Current Build State

The app is **feature-complete at a prototype level**. All six screens exist and are wired up. The blockers to launch are reliability and polish, not missing features.

### What's Built and Working

| Screen | What Exists |
|--------|-------------|
| **Dump** | Freeform text input, voice input, image upload. AI extracts tasks with urgency, effort, category, context tags. User previews and edits before saving. |
| **Tasks** | Kanban board grouped by category or context. Drag-to-reorder within and across columns. Task completion toggle with ripple animation. Duplicate detection + cleanup. Quick-add task from nav. |
| **Priorities** | Session check-in (mood, time, location). Smart top-3 with guaranteed quick win. "Not this one" swap. "Just one small thing" mode. Per-task AI rationale in amber block. AI re-rank button. Trend indicators (↑↓) after re-rank. |
| **Focus** | Pomodoro timer (10/15/25/45/60 min). Circular SVG progress ring. Auto break prompt. Task selector overlay. Zen mode (hides all nav). Session count. Music integration. |
| **Journals** | Mood picker (6 options). Freeform entry. Voice input. Entry history with delete. |
| **About Me** | Goal editor (1/3/5-year horizons, priority 1-10). Work patterns. Constraints list. Core values (pill tags). Success vision textarea. Triggers AI re-rank when saved. |

### Infrastructure

| Layer | State |
|-------|-------|
| **Auth** | Supabase Google OAuth. Session persistence via `onAuthStateChange`. |
| **AI** | 7 Gemini API routes running as Vercel serverless functions. Rate-limited (Upstash). |
| **Database** | Supabase PostgreSQL. RLS on all tables. localStorage fallback on every write. |
| **Onboarding** | 9-step wizard. Collects persona, initial brain dump, goals. Runs on first login. |
| **Landing page** | Matter.js physics animation. Sign-in flow. |
| **Navigation** | Desktop top bar + mobile bottom bar. Zen mode (nav hides during focus). Quick-add task button everywhere. 34 background scenes. Music player. |

---

## 3. Known Issues (Priority Order)

### P0 — Breaks the Product

**3.1 Silent data loss**
Every Supabase write has a localStorage fallback that fires silently on failure. Users have no idea whether their data is cloud-backed or browser-only. On a new device or after clearing browser data, everything is gone.
- Root cause: `databaseService.ts` catches all Supabase errors and only logs to console
- Fix: Add a visible sync status indicator (saved / saving / local only) to the header
- Fix: Surface a persistent warning banner when operating in localStorage-only mode

**3.2 No error feedback on AI failures**
If a Gemini API call fails (quota, network, timeout), the UI either freezes or silently does nothing. Users don't know to retry.
- Root cause: `geminiService.ts` has retry logic but no user-visible error state on final failure
- Fix: Show a toast with actionable message ("AI unavailable — try again in a moment")
- Fix: Expose `aiStatus` and `lastAiError` (already in state) in the UI

**3.3 schema.sql was outdated — now fixed**
The live Supabase tables are `actions`, `diary`, `task_steps`, `memories`, and `profiles` — which is exactly what the code queries. The old `schema.sql` documented different names (`action_items`, `diary_entries`) and was simply wrong. `schema.sql` has been rewritten (March 2026) to match the live database. Tasks and diary entries are saving correctly.

### P1 — Degrades the Experience

**3.4 Drag-and-drop instability** *(partially fixed — March 2026)*
Cross-category drag-drop was crashing due to `draggedItemRef` being wiped before use. The double-listener bug in `SortableItem` has also been fixed. Needs QA confirmation in production.

**3.5 Persona sync conflict**
Persona is stored in two places: Supabase auth metadata AND localStorage. Last-write-wins by timestamp, but if a user edits on two devices, one edit is silently lost.
- Fix: Add a `version` counter to detect conflicts and prompt the user

**3.6 No "data is local only" warning for new users**
On first login, if Supabase isn't properly configured, all data goes to localStorage and users don't know their account isn't actually syncing.

**3.7 Focus session data evaporates**
Session count increments but is never persisted. If user closes the tab mid-session, all progress is lost. No analytics on time-on-task.

### P2 — Polishing for Launch

**3.8 Goals reordering not implemented**
PersonaEditor shows "Drag to reorder — coming soon" but dnd-kit is already in the project. Should be wired up.

**3.9 Transmutation count is tracked but never used**
`DiaryEntry.transmutationCount` exists in the schema but is never incremented or shown. Either wire it up or remove it.

**3.10 Coach endpoint exists, no UI**
`/api/gemini/coach` and `/api/gemini/recommend` are built but have no UI entry point. Either ship a basic chat interface or remove the dead endpoints.

**3.11 Sticker types still in `types.ts`**
Stickers were removed from the UI in March 2026 but the TypeScript types, Supabase table, and `databaseService` methods still exist. Creates noise for future contributors.

---

## 4. Feature Inventory (Complete)

### 4.1 Brain Dump Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Freeform text input | ✅ Live | Cmd+Enter to submit |
| Voice input | ✅ Live | Web Speech API |
| Image / file attachment | ✅ Live | AI extracts tasks from image |
| AI task extraction | ✅ Live | `/api/gemini/brain-dump` |
| Task preview + edit before save | ✅ Live | Urgency, effort, category editable in preview |
| Category auto-assignment | ✅ Live | AI assigns from list |
| Context tag extraction | ✅ Live | "At Computer", "Low Mental Load", etc. |
| Memory history (past dumps) | ✅ Live | Displayed below input |
| Manual category override | ❌ Missing | User can't change category in preview |
| Confidence / quality indicator | ❌ Missing | No signal if AI struggled to extract |

### 4.2 Tasks Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Kanban by category | ✅ Live | |
| Kanban by context | ✅ Live | Toggle in header |
| Task completion toggle | ✅ Live | With ripple animation |
| Drag within category | ✅ Live | |
| Drag across categories | ⚠️ Fixed (needs QA) | Crash fixed March 2026 |
| Task detail modal | ✅ Live | Full edit: text, category, urgency, effort, deadline, steps, tags |
| AI subtask breakdown | ✅ Live | "Deep Breakdown" in modal |
| Duplicate cleanup | ✅ Live | AI detects semantic duplicates |
| Archive (completed tasks) | ✅ Live | Collapsible "Done" section per bucket |
| Quick-add task from nav | ✅ Live | Added March 2026 |
| Manual category creation | ✅ Live | "+ Category" button |
| Context tags on tasks | ✅ Live | Display only in task cards |
| Add task directly to category | ❌ Missing | No inline "+" per column |
| Task batch grouping | ✅ Live | `batchId` field, colour-coded |
| Export / import JSON | ✅ Live | Settings area |

### 4.3 Priorities Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Session check-in (mood) | ✅ Live | 5 mood options |
| Session check-in (time) | ✅ Live | 4 time options |
| Session check-in (location) | ✅ Live | 4 location options |
| Context-aware scoring | ✅ Live | Mood × effort, time filter, location match |
| Composite score (urgency + alignment) | ✅ Live | 70/30 split |
| Deadline urgency bump | ✅ Live | Up to +4 for overdue |
| Frequency boost | ✅ Live | +5-10% if mentioned in recent dumps |
| Quick win in top 3 | ✅ Live | Guaranteed ≥1 low-effort |
| "Not this one" swap | ✅ Live | Per slot |
| "Just one small thing" mode | ✅ Live | Shows single low-effort task |
| AI rationale (amber block) | ✅ Live | Per task |
| AI global re-rank | ✅ Live | With strategy summary |
| Trend indicators | ✅ Live | ↑↓ after re-rank |
| Completion pattern in AI prompt | ✅ Live | AI sees which categories stall |
| Queue (draggable) | ✅ Live | Tasks 4+ below top 3 |
| Start Focus from priority | ✅ Live | Passes taskId to Focus tab |
| Session energy (separate from mood) | ❌ Missing | PRD specified; has "location" instead |

### 4.4 Focus Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Pomodoro timer | ✅ Live | 5 duration options |
| Circular SVG ring | ✅ Live | Stroke-dashoffset animation |
| Play / pause | ✅ Live | |
| Reset | ✅ Live | |
| Auto break prompt | ✅ Live | |
| 5-minute break mode | ✅ Live | |
| Task selector (link from task list) | ✅ Live | |
| Complete task from Focus | ✅ Live | Checkbox on task bubble |
| Zen mode (nav hides) | ✅ Live | |
| Session count display | ✅ Live | "3 done" |
| Session persistence | ❌ Missing | Count lost on tab close |
| Focus analytics | ❌ Missing | No history of sessions |
| Session notes | ❌ Missing | No field to note what was done |

### 4.5 Journals Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Freeform entry | ✅ Live | |
| Voice input | ✅ Live | |
| Mood picker (emoji, 6 options) | ✅ Live | |
| Past entries list | ✅ Live | Card grid |
| Delete entry | ✅ Live | Hover-reveal button |
| Numeric mood scale (1-10) | ❌ Missing | PRD specified; only emoji exists |
| AI synthesis of journal patterns | ⚠️ Partial | Synthesis triggers from dump, not from journal screen |
| "What came from this" (transmutation) | ❌ Not wired | Counter exists in DB, never used |
| Search entries | ❌ Missing | |

### 4.6 About Me Screen

| Feature | Status | Notes |
|---------|--------|-------|
| Long-term goals (1/3/5-year) | ✅ Live | With priority slider |
| Goals reordering | ❌ Not implemented | "Coming soon" label in UI |
| Work patterns (peak hours) | ✅ Live | |
| Constraints list | ✅ Live | Drag-to-reorder not implemented |
| Core values (pill tags) | ✅ Live | Inline editable |
| Success vision textarea | ✅ Live | |
| Trigger AI re-rank on save | ✅ Live | Via `assess-impact` endpoint |
| Life synthesis overview | ⚠️ Partial | Synthesis exists but display unclear |
| Profile picture / name | ✅ Live | Via Google OAuth |

---

## 5. AI Pipeline

All AI runs through Vercel serverless functions backed by Google Gemini 2.0 Flash.

| Endpoint | Input | Output | Status |
|----------|-------|--------|--------|
| `/api/gemini/brain-dump` | text + optional image | ActionItem[] | ✅ Live |
| `/api/gemini/reprioritize` | tasks + persona + diary + memories | ranked tasks + strategy | ✅ Live |
| `/api/gemini/synthesize` | memories + persona | life themes + friction | ✅ Live |
| `/api/gemini/breakdown` | task + persona | TaskStep[] | ✅ Live |
| `/api/gemini/duplicates` | tasks | duplicate groups | ✅ Live |
| `/api/gemini/assess-impact` | old/new persona | significance flag | ✅ Live |
| `/api/gemini/coach` | chat messages + persona | advice | ✅ Built, no UI |
| `/api/gemini/recommend` | tasks + synthesis | weekly recs | ✅ Built, no UI |

**Rate limiting**: 10 requests/user/minute via Upstash Redis.
**Retry strategy**: Exponential backoff on 5xx, user message on 429.
**Model**: Gemini 2.0 Flash (primary), Gemini 1.5 Flash (fallback).

---

## 6. Data Model

### Supabase Tables

| Table | Purpose | Live Rows | Primary Use |
|-------|---------|-----------|-------------|
| `profiles` | Identity (name, email, picture) | 2 | Auth layer |
| `memories` | Brain dumps | 122 | BrainDumpHub |
| `actions` | Tasks (child of memories) | 421 | TasksHub, PrioritiesHub |
| `task_steps` | Subtasks from AI breakdown | 90 | TaskDetailModal |
| `diary` | Journal entries | 6 | JournalHub |
| `stickers` | Gamification (archived) | 78 | Not rendered |

### localStorage Keys

| Key | Contents |
|-----|----------|
| `dumped_memories` | Full MemoryItem[] with nested ActionItem[] |
| `dumped_diary` | DiaryEntry[] |
| `dumped_persona` | UserPersona |
| `dumped_synthesis` | LifeSynthesis |
| `dumped_user` | UserProfile |
| `dumped_session_context` | Session check-in (1hr TTL) |

---

## 7. Phased Roadmap to Launch

### Phase 1 — Make It Trustworthy (Pre-Launch Critical)
*Must be done before any public users.*

| # | Task | Why |
|---|------|-----|
| 1.1 | ~~Fix table name mismatches~~ — **Done** (schema.sql updated March 2026, live DB was always correct) | Tasks and diary confirmed saving to Supabase (421 actions, 6 diary rows) |
| 1.2 | Show visible sync status in header (Saved ✓ / Saving… / Local only ⚠️) | Users need to know if their data is safe |
| 1.3 | Show error toast when AI fails (not just console.log) | Users can't recover from silent failures |
| 1.4 | Banner warning when operating in localStorage-only mode | Critical trust issue |
| 1.5 | QA cross-category drag-and-drop in production | Fix was shipped March 2026 — needs confirmation |
| 1.6 | Remove sticker types, DB table references, and unused endpoints | Clean codebase before users arrive |

### Phase 2 — Complete the Core Loops (Launch Week)
*Features that are almost done or clearly missing from the core flow.*

| # | Task | Why |
|---|------|-----|
| 2.1 | Wire up goals drag-to-reorder in PersonaEditor (dnd-kit already in project) | Listed as "coming soon" — removes broken promise |
| 2.2 | Add AI synthesis trigger from Journals screen | Currently only fires from brain dump |
| 2.3 | Add inline "+ task" per column in Tasks Hub | Faster workflow; quick-add nav exists but column-level is cleaner |
| 2.4 | Show life synthesis on About Me screen (data exists, display unclear) | Core feature of the "About Me" concept |
| 2.5 | Replace "location" check-in with "energy level" to match original PRD | Alignment between spec and product |
| 2.6 | Wire transmutation counter on diary entries | Shows users the tangible value of journaling |

### Phase 3 — Polish for Retention
*Makes the product feel finished and worth coming back to.*

| # | Task | Why |
|---|------|-----|
| 3.1 | Persist Focus session count and history | "You've focused for 3 hours today" is a powerful motivator |
| 3.2 | Add category manual override in brain dump preview | Power users want this immediately |
| 3.3 | Coach chat UI (endpoint already built) | High-value feature, low build cost |
| 3.4 | Confidence indicator on AI-extracted tasks | "AI is less certain about these" |
| 3.5 | Search across journal entries | Basic expected functionality |
| 3.6 | Add numeric mood scale (1-10) alongside emoji in Journals | Original spec + useful for longitudinal tracking |
| 3.7 | Persona conflict detection when editing on 2 devices | Prevents silent data loss for multi-device users |
| 3.8 | Onboarding email (first dump → success) | Activation loop |

### Phase 4 — Growth
*Features that drive retention and potential monetisation.*

| # | Task | Why |
|---|------|-----|
| 4.1 | Weekly synthesis email ("Here's what your week looked like") | Re-engagement |
| 4.2 | Streak tracking (days used in a row) | Habit formation |
| 4.3 | Calendar integration (external_events table exists) | High user request |
| 4.4 | Usage limits on free tier (AI calls per day) | Monetisation gate |
| 4.5 | Team / shared workspace | B2B expansion |
| 4.6 | Mobile app (PWA or React Native) | Core user behaviour is mobile |

---

## 8. Technical Debt Log

| Item | File(s) | Risk | Resolution |
|------|---------|------|------------|
| Sticker types still in `types.ts` | `types.ts`, `databaseService.ts` | Low | Remove cleanly |
| `user_personas` table no longer primary | `databaseService.ts` | Medium | Deprecate table, keep migration read |
| `transmutationCount` tracked but unused | `types.ts`, `databaseService.ts` | Low | Wire up or remove |
| `CoachHub.tsx` file exists but unused | `CoachHub.tsx` | Low | Delete or ship |
| `CalendarHub.tsx` file exists but unused | `CalendarHub.tsx` | Low | Delete or ship |
| `OverviewHub.tsx` removed from routing but file exists | `OverviewHub.tsx` | Low | Delete |
| `external_events` Supabase table defined, never queried | `schema.sql` | Low | Reserve for calendar feature |
| `chat_messages` Supabase table defined, never queried | `schema.sql` | Low | Reserve for coach feature |
| `focusType` field in persona actually stores focus hours | `PersonaEditor.tsx` | Low | Rename field |
| No memoisation on TaskBucket list renders | `TaskBucket.tsx` | Medium | Add `React.memo` |
| `AuthenticatedApp.tsx` is very large (~600 lines) | `AuthenticatedApp.tsx` | Medium | Extract drag handlers into hook |

---

## 9. Success Metrics (Post-Launch)

| Metric | Target at 30 days | Target at 90 days |
|--------|-------------------|-------------------|
| Daily active users (DAU) | 100 | 500 |
| Retention (D7) | 30% | 40% |
| Brain dumps per active user per week | 3+ | 5+ |
| Tasks completed vs created ratio | > 40% | > 55% |
| AI reprioritize uses per user per week | 1+ | 2+ |
| Time to first task (after signup) | < 3 min | < 2 min |
| Support tickets about data loss | 0 | 0 |

---

## 10. Out of Scope (Explicitly)

These will not be built until Phase 4 is confirmed:

- Native iOS / Android app
- Real-time collaboration / shared workspaces
- API for third-party integrations
- Payments / subscriptions (explore in Phase 4 only)
- Custom AI model training
- Offline-first architecture (current localStorage fallback is sufficient for MVP)

---

*Document maintained by: Andre + Claude Code*
*Last updated: March 2026 — from full codebase audit*
*Next review: After Phase 1 complete*
