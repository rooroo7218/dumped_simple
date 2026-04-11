# DUMPED — Product Requirements Document
**Version 3.0 · March 2026 · Live codebase audit of 52 source files**

---

## 1. What Is Dumped?

Dumped is an AI-powered personal operating system for people whose brain is running too many tabs. You write (or speak) whatever is on your mind — worries, goals, tasks, observations — and the app turns it into a prioritized, context-aware action plan that adapts to your mood, available time, and personal goals.

> **The core promise:** Go from overwhelmed to "I know exactly what to do next" in under 60 seconds.

- **Who it's for:** Busy professionals, solo founders, and anyone who feels like their brain is running too many tabs.
- **Core loop:** Dump → AI extracts tasks → Priorities (context check-in) → Focus (Pomodoro) → Journal → repeat
- **Key differentiator:** AI reasoning quotes tied to named goals ("Downgrading your AMV Chase card aligns with your Financial Clarity goal"). No competitor has this combination.

---

## 2. Current Build State

The app is feature-complete at a prototype level. All six screens exist, are wired, and have real functionality. Blockers to a sticky launch are reliability, data trust, and habit anchoring — not missing features.

### 2.1 Screens — confirmed from source

| Screen | Component | Status | What Actually Exists |
|---|---|---|---|
| **Brain Dump** | `BrainDumpHub.tsx` | ✅ Live | Freeform textarea, ⌘+Enter submit, voice input (Web Speech API), image/file attachment, AI task extraction with preview, per-task editing before save, category and urgency visible in preview, discard or Save to Tasks flow. Rotating thinking messages during processing. |
| **Tasks** | `TasksHub.tsx` + `TaskBucket.tsx` | ✅ Live | Kanban board with category and context toggle views. Drag within column and across columns (dnd-kit). Task cards: 72px fixed height, completion toggle, star, 'Maybe Later' parking lot, urgency badge, NEW badge, batch group color, context tag chips, view count 'Revisit' badge. Archive section per column. Quick inline task add per column. Duplicate cleanup modal. Export/import JSON. Category create/delete. |
| **Priorities** | `PrioritiesHub.tsx` | ✅ Live | Session check-in (mood 5 options, time 4 options, location 4 options). Context-aware scoring across effort × mental load × time fit × mood × quick win multiplier × time-of-day bonus. Smart top-3 with guaranteed quick win. 'Not this one' swap from pool. 'Just one small thing' mode. AI rationale amber block per task. Re-rank button. Trend indicators (↑↓). Draggable queue backlog. Maybe Later collapse. Global ranking (raw score, context-free). Session persisted 1hr in localStorage. |
| **Focus** | `FocusHub.tsx` | ⚠️ Partial | Pomodoro timer (10/15/25/45/60 min). Circular SVG progress ring. Play/pause/reset/skip. Task selector overlay. Zen mode (nav hidden via `setIsZenMode`). Auto break prompt at session end. Session count increments — but `sessionCount` is **not persisted** (lost on tab close). Music integration via ZenPlayer. Exit focus mode button. Duration pre-filled from session context localStorage. |
| **Journals** | `JournalHub.tsx` | ✅ Live | 6 mood chips (Joyful/Peaceful/Tired/Anxious/Frustrated/Elated with icons + colors). Freeform textarea. Voice input. Entry history with delete. Date+time display. No AI synthesis trigger from this screen. No numeric mood scale. |
| **About Me** | `PersonaEditor.tsx` | ⚠️ Partial | Goals editor (goal text, timeframe select, priority 1–10, add/remove). Work patterns (peak energy, focused hours text inputs). Constraints list (add/remove). Core values as inline-editable pill tags. Re-prioritize button triggers AI re-rank. Redo Setup button triggers re-onboarding. **Bug:** The life vision textarea is wired to `persona.brutalistBackground` (wrong field — should be `successVision`). Goals show "Drag to reorder (coming soon)" — dnd-kit is in the project but not wired here. |

### 2.2 Infrastructure — confirmed from source

| Layer | File(s) | Status | Reality |
|---|---|---|---|
| **Auth** | `App.tsx`, `useAuth` hook | ✅ Live | Supabase Google OAuth. `onAuthStateChange` session persistence. Onboarding gate checks Supabase metadata + localStorage fallback. Re-onboarding supported from About Me. |
| **AI** | `geminiService.ts` | ✅ Live | Vercel serverless functions. 7+ endpoints called in code. Rate limited via Upstash. Models: Gemini 2.0 Flash primary, 1.5 Flash fallback. |
| **Database** | `databaseService.ts` | ⚠️ Broken | All writes have silent localStorage fallback on Supabase failure. Table mismatches exist (`action_items` vs `actions`, `diary_entries` vs `diary`). Sync status not visible to user. No error surfaced when writes fail. |
| **Onboarding** | `OnboardingFlow.tsx` | ✅ Live | 10-step wizard. Name, roles, life areas, goals (3), brain dump, hours/day, dependents, avoidances, work style, success vision. Builds persona and saves to Supabase. Can re-run from About Me. Animated slide transitions, loading dots on finish. |
| **Navigation** | `Navigation.tsx` | ✅ Live | Desktop: single-row fixed header with tabs, quick-add task popover, scenery picker, fullscreen toggle, user menu. Mobile: fixed bottom bar with all tabs + quick-add + music button. Zen mode hides nav with CSS transition. Music selector popover on mobile. |
| **Background** | `ZenBackground.tsx`, `AuthenticatedApp.tsx` | ✅ Live | 34 named background scenes (Ghibli images + CSS gradients). Aurora, Warp shader, Galaxy Gradient as special procedural scenes. User-selected, persisted in `persona.brutalistBackground`. Scenery picker in nav. |
| **Music** | `ZenPlayer.tsx`, `useZenPlayer` hook | ✅ Live | YouTube embed (0×0, hidden). Play/pause/mute. Track list. Desktop bubble UI. Mobile popover. Animated music bars when playing. |
| **DnD** | `AuthenticatedApp.tsx` | ⚠️ Partial | dnd-kit PointerSensor + KeyboardSensor. Cross-category drag fixed March 2026 (`draggedItemRef` pattern). Category column reorder supported. Priorities queue draggable. QA needed in production. |
| **Dead code** | Multiple files | ❌ Issue | `CoachHub.tsx`, `CalendarHub.tsx`, `OverviewHub.tsx`, `PlaybookHub.tsx`, `StickersHub.tsx`, `TimelineView.tsx`, `StarGraph.tsx`, `MemoryCard.tsx`, `EnergyTracker.tsx`, `AchievementToast.tsx` all exist but are NOT wired into navigation or `AuthenticatedApp` routing. |

---

## 3. Known Issues — Priority Order

### P0 — Breaks the product

#### 3.1 Silent data loss (`databaseService.ts`)

Every Supabase write silently falls back to localStorage on failure. Users have no indication whether data is cloud-synced or browser-only. Data is invisible on new devices or after clearing browser storage.

- **Root cause:** `databaseService.ts` catches all Supabase errors and logs to console only
- **Fix:** Add visible sync status indicator in the header (Saved ✓ / Saving… / Local only ⚠️)
- **Fix:** Show persistent warning banner when running in localStorage-only mode

#### 3.2 Table name mismatches — tasks and journal not saving to Supabase

`databaseService.ts` queries `actions` in some places but the schema defines `action_items`. Similarly `diary` vs `diary_entries`. Every task and journal save silently falls to localStorage.

- **Fix:** Audit and align all table references in `databaseService.ts`

#### 3.3 No user-visible AI error feedback

When Gemini API calls fail (quota, network, timeout), the UI either freezes or silently does nothing. `geminiService.ts` has retry logic but exposes no user-visible error state on final failure. `aiStatus` and `lastAiError` exist in state but are never surfaced in the UI.

- **Fix:** Show actionable toast on AI failure — "AI unavailable — try again in a moment"
- **Fix:** Wire `aiStatus`/`lastAiError` from `useAppData` into a visible indicator

#### 3.4 PersonaEditor life vision wired to wrong field

In `PersonaEditor.tsx`, the "Your vision" textarea reads and writes `persona.brutalistBackground` — the background scene ID field. The `successVision` field exists in the type definition and is correctly used elsewhere, but this editor silently overwrites the user's background selection.

- **Fix:** Change the textarea to read/write `persona.successVision`

---

### P1 — Degrades the experience

#### 3.5 Focus session count not persisted

`sessionCount` in `FocusHub.tsx` increments correctly during a session but is local `useState` only — lost on tab close, refresh, or navigation. No analytics on time-on-task.

- **Fix:** Persist session count and total focus time to Supabase (or localStorage as fallback)

#### 3.6 Goals drag-to-reorder not wired

`PersonaEditor.tsx` shows "Drag to reorder — coming soon" despite dnd-kit already being installed and used throughout the app. This is a broken promise shown to every user who visits About Me.

- **Fix:** Wire dnd-kit `SortableContext` to the goals list — 2–3 hours of work

#### 3.7 Persona sync conflict on multiple devices

Persona is stored in both Supabase auth metadata and localStorage. Last-write-wins by timestamp, but editing on two devices can silently lose one version.

- **Fix:** Add a version counter to detect conflicts and prompt the user to choose

#### 3.8 DnD cross-category drag needs production QA

The `draggedItemRef` fix was deployed March 2026 but has not been confirmed working under real production load. The double-listener bug fix in `SortableItem` was also recent.

- **Fix:** Structured QA session: drag within category, across categories, and in Priorities queue

---

### P2 — Polishing for launch

#### 3.9 Large dead code surface

8 components exist in the codebase but are not routed anywhere: `CoachHub`, `CalendarHub`, `OverviewHub`, `PlaybookHub`, `StickersHub`, `TimelineView`, `StarGraph`, `MemoryCard`, `EnergyTracker`, `AchievementToast`. Sticker types and their Supabase table also remain.

- **Fix:** Delete or explicitly park all unused components and types before launch

#### 3.10 No AI synthesis trigger from Journals

`JournalHub.tsx` saves diary entries correctly, but saving a journal entry never triggers the AI synthesis pipeline. Synthesis currently only fires from brain dump.

- **Fix:** Add `/api/gemini/synthesize` trigger on diary save (debounced — not every entry)

#### 3.11 Location check-in should be energy level

`PrioritiesHub` uses "Where are you?" (desk/home/out/phone) as the third context question. The original spec intended "Energy level" instead, which maps more cleanly to the scoring model.

- **Fix:** Replace location check-in with energy level (High / Medium / Low / Running on fumes) and update scoring

#### 3.12 Coach endpoint has no UI

`/api/gemini/coach` and `/api/gemini/recommend` are built and deployed. `CoachHub.tsx` exists and is fully formed — it just isn't wired into the navigation.

- **Option A:** Add "Coach" tab to navigation (7th tab) and route to `CoachHub`
- **Option B:** Remove dead endpoints to reduce attack surface and confusion

---

## 4. Feature Inventory (Complete)

### 4.1 Brain Dump

| Feature | Status | Notes |
|---|---|---|
| Freeform text input | ✅ Live | Cmd/Ctrl+Enter to submit |
| Voice input (Web Speech API) | ✅ Live | Appends to existing input text |
| Image / file attachment | ✅ Live | AI extracts tasks from image/PDF/doc/txt |
| AI task extraction | ✅ Live | `/api/gemini/brain-dump` — preview shown before save |
| Per-task editing in preview | ✅ Live | Text editable inline; delete individual tasks |
| Category shown in preview | ✅ Live | Auto-assigned by AI, read-only in preview |
| Urgency badge in preview | ✅ Live | Shown if urgency > 7 |
| Discard / Save to Tasks | ✅ Live | Header row with task count |
| Rotating thinking messages | ✅ Live | 12 rotating strings, 2.2s interval |
| Memory history (past dumps) | ✅ Live | Shown below input area |
| Manual category override in preview | ❌ Missing | User cannot change AI-assigned category before saving |
| AI confidence indicator | ❌ Missing | No signal if AI was uncertain about extraction |
| Voice input on mobile | ⚠️ Untested | Web Speech API has inconsistent mobile support |

### 4.2 Tasks

| Feature | Status | Notes |
|---|---|---|
| Kanban by category | ✅ Live | Columns from `persona.customCategories` + any AI-assigned |
| Kanban by context | ✅ Live | Toggle in header; groups by `contextTags` |
| Task completion toggle | ✅ Live | Rainbow ripple effect on completion |
| Task completion toast | ✅ Live | 'Task completed' success toast |
| Drag within category | ✅ Live | Persists `categoryOrder` |
| Drag across categories | ⚠️ Fixed — needs QA | `draggedItemRef` fix March 2026 |
| Category column reorder | ✅ Live | Category drag type via dnd-kit |
| Task card: 72px fixed height | ✅ Live | Consistent card height with `line-clamp` |
| Task card: star | ✅ Live | Toggles `task.starred` |
| Task card: Maybe Later parking | ✅ Live | Sends to Maybe Later column; persisted in localStorage |
| Task card: NEW badge | ✅ Live | Shown for `isNew` tasks |
| Task card: Urgent badge | ✅ Live | Shown for urgency > 8 |
| Task card: batch group badge | ✅ Live | Color-coded by `batchId` |
| Task card: Revisit badge | ✅ Live | Shown when `viewCount` ≥ 3 and not completed |
| Task card: context tag chips | ✅ Live | First 2 shown |
| Task detail modal (slide-up panel) | ✅ Live | Bottom-right, 440px wide, 80vh max, spring animation |
| Modal: edit title | ✅ Live | Textarea, inline |
| Modal: category picker | ✅ Live | Dropdown of `allCategories` |
| Modal: notes | ✅ Live | Free text |
| Modal: steps (drag + AI breakdown) | ✅ Live | AI breakdown = `/api/gemini/breakdown`; drag via dnd-kit |
| Modal: urgency slider | ✅ Live | 1–10 range |
| Modal: due date picker | ✅ Live | Date input → `task.completeBy` |
| Modal: context tags | ✅ Live | Add/remove inline |
| Modal: batch group | ✅ Live | Existing batches shown as clickable pills |
| Modal: AI rationale (italic quote) | ✅ Live | `task.rationale` shown if present |
| Modal: Start Focus | ✅ Live | Routes to Focus tab with `taskId` |
| Modal: Mark complete / Reactivate | ✅ Live | Toggles completion |
| Modal: Maybe Later / Restore | ✅ Live | Wired to `maybeLaterIds` localStorage |
| Modal: Delete (with confirm) | ✅ Live | Two-step: shows "Delete task?" before confirming |
| Archive section per column | ✅ Live | Collapsed "Done (N)" section showing completed tasks |
| Quick inline task add per column | ✅ Live | "+ Add task" inline input at bottom of each bucket |
| Duplicate cleanup modal | ✅ Live | AI detects semantic duplicates; user picks which to keep |
| Export JSON | ✅ Live | Settings area |
| Import JSON | ✅ Live | Settings area |
| Category create | ✅ Live | "+ Category" button in header |
| Category delete | ✅ Live | Trash icon in bucket header; "Keep tasks" or "Delete all" |
| Maybe Later column | ✅ Live | Separate greyed column at end of board |
| Add task directly to category (inline per column) | ✅ Live | Confirmed in `TaskBucket.tsx` |

### 4.3 Priorities

| Feature | Status | Notes |
|---|---|---|
| Session check-in: mood (5 options) | ✅ Live | Energized / Focused / Okay / Tired / Stressed |
| Session check-in: time (4 options) | ✅ Live | 15 min / 30 min / 1 hour / 2+ hours |
| Session check-in: location (4 options) | ✅ Live | At desk / At home / Out & about / On phone |
| Session TTL (1 hour) | ✅ Live | Persisted in localStorage with `answeredAt` timestamp |
| Context-aware scoring (effort × load × time fit × mood) | ✅ Live | Full scoring engine in `PrioritiesHub.tsx` |
| Mental load classification | ✅ Live | Auto-inferred from task text via keyword matching |
| Duration estimation | ✅ Live | `estimateMinutes()` — keyword matching + effort fallback |
| Time-of-day bonus | ✅ Live | `getTimeOfDayBonus()` from `utils/taskScoring` |
| Quick win multiplier (tired/stressed) | ✅ Live | Boosts short concrete tasks for tired/stressed users |
| Smart top-3 with guaranteed quick win | ✅ Live | `getSmartTop3()` ensures ≥1 low-effort in top 3 |
| "Not this one" swap | ✅ Live | Per slot; pulls from `swapPool` (scored tasks not in top-3) |
| "Just one small thing" mode | ✅ Live | Shows single lowest-effort task with Start button |
| AI rationale (amber block) | ✅ Live | `task.rationale` shown per priority card |
| Global re-rank button | ✅ Live | Calls `handleGlobalReprioritization` (AI re-rank) |
| Trend indicators ↑↓ | ✅ Live | Shown in global ranking list |
| Completion pattern in AI prompt | ✅ Live | AI sees which categories stall |
| Draggable queue (backlog) | ✅ Live | `SortableContext` for tasks below top-3 |
| Maybe Later collapse | ✅ Live | Collapsible section; restore individual tasks |
| Global ranking (raw score, context-free) | ✅ Live | Collapsible "Global ranking" section |
| Start Focus from priority | ✅ Live | Routes to Focus tab with `taskId` |
| Context persisted between visits (1hr) | ✅ Live | Existing session reloads if within TTL |
| Session reset on task completion | ✅ Live | `completedCount` watcher clears session on change |
| AI reasoning quotes tied to named goals | ✅ Live | Core differentiator — present throughout |
| Journal mood auto-updates priority context | ❌ Missing | Mood from journal does not feed next Priority session |
| Context chips persist "Still same?" prompt | ❌ Missing | No "still the same situation?" UX between sessions |

### 4.4 Focus

| Feature | Status | Notes |
|---|---|---|
| Pomodoro timer (10/15/25/45/60 min) | ✅ Live | Duration pre-filled from session context if recent |
| Circular SVG progress ring | ✅ Live | CX=192, CY=192, R=168, STROKE=32 — click to play/pause |
| Play / Pause / Reset / Skip | ✅ Live | Reset clears to full duration; Skip goes to/from break |
| Auto break prompt (5 min) | ✅ Live | Modal: "Yes please" or "Keep going" |
| Task selector overlay | ✅ Live | Slides from ranked tasks; shows category + urgency fire emoji |
| Zen mode (nav hidden) | ✅ Live | `setIsZenMode(true)` while active; ESC or button to exit |
| Session count display | ✅ Live | "N done" shown inside ring — resets on page close |
| Music integration | ✅ Live | ZenPlayer independent of Focus state |
| Start from Priority / Task modal | ✅ Live | `initialTaskId` prop auto-starts timer |
| Session count persistence | ❌ Missing | `sessionCount` is `useState` — lost on tab close (PRD 3.5) |
| Focus history / total time | ❌ Missing | No record of past sessions |
| Post-focus acknowledgement message | ❌ Missing | Completion shows generic modal; no goal-tied message |

### 4.5 Journals

| Feature | Status | Notes |
|---|---|---|
| 6 mood chips with icons | ✅ Live | Joyful/Peaceful/Tired/Anxious/Frustrated/Elated |
| Freeform journal entry | ✅ Live | Textarea with min-height |
| Voice input | ✅ Live | Appends to existing text |
| Entry history with delete | ✅ Live | Sorted by timestamp; group-hover reveals trash button |
| Date + time display on entries | ✅ Live | Short month + day + HH:MM |
| Clear all entries | ✅ Live | Button with implicit confirm (no dialog) |
| AI synthesis trigger on save | ❌ Missing | Journal save does not trigger life synthesis update |
| Numeric mood scale 1–10 | ❌ Missing | Emoji only; no numeric scale |
| Journal search | ❌ Missing | No search across entries |
| Mood → Priority context auto-update | ❌ Missing | Journal mood does not feed next Priority session |
| Mascot mood chips (SVG) | ✅ Built, not wired | SVGs exist in `components/mascots/`; JournalHub uses Heroicons |

### 4.6 About Me

| Feature | Status | Notes |
|---|---|---|
| Goal editor (text, timeframe, priority) | ✅ Live | 1-year/3-year/5-year; priority 1–10 inline number input |
| Add / remove goals | ✅ Live | Plus button adds; trash removes |
| Peak energy window | ✅ Live | Free text input |
| Focused hours per day | ✅ Live | Free text input (stored as `focusType` — confusing field name) |
| Constraints list | ✅ Live | Add/remove inline text inputs |
| Core values as editable pill tags | ✅ Live | Inline input, auto-sizes to content |
| Life vision textarea | ⚠️ Bug | Reads/writes `persona.brutalistBackground` — wrong field (should be `successVision`) |
| Re-prioritize button | ✅ Live | Triggers AI re-rank with current persona |
| Redo Setup button | ✅ Live | Opens `OnboardingFlow` overlay with pre-filled data |
| Life synthesis display | ❌ Missing | `OverviewHub.tsx` exists but is not routed; synthesis data not shown on About Me |
| Goals drag-to-reorder | ❌ Missing | "Coming soon" text shown; dnd-kit not wired here |

---

## 5. AI Pipeline

All AI runs through Vercel serverless functions. Models: Gemini 2.0 Flash (primary), Gemini 1.5 Flash (fallback). Rate limiting: 10 requests/user/minute via Upstash Redis.

| Endpoint | Input | Output | Status | UI Entry Point |
|---|---|---|---|---|
| `/api/gemini/brain-dump` | text + optional image | `ActionItem[]` | ✅ Live | BrainDumpHub submit |
| `/api/gemini/reprioritize` | tasks + persona + diary + memories | ranked tasks + strategy summary | ✅ Live | PrioritiesHub re-rank button |
| `/api/gemini/synthesize` | memories + persona | life themes + friction + trajectory | ✅ Live | Auto after brain dump + About Me save — **output never displayed** |
| `/api/gemini/breakdown` | task + persona | `TaskStep[]` | ✅ Live | TaskDetailModal "AI breakdown" button |
| `/api/gemini/duplicates` | `tasks[]` | `DuplicateGroup[]` | ✅ Live | TasksHub "Clean Up" button |
| `/api/gemini/assess-impact` | old/new persona | significance flag | ✅ Live | About Me `onSave` (called by `databaseService`) |
| `/api/gemini/coach` | chat history + persona | AI advice text | ⚠️ Built, no UI | `CoachHub.tsx` exists but not routed |
| `/api/gemini/recommend` | tasks + synthesis | weekly recommendations | ⚠️ Built, no UI | No UI entry point |

---

## 6. Data Model

### 6.1 Supabase Tables

| Table | Purpose | Status | Notes |
|---|---|---|---|
| `user_profiles` | User identity (name, email, picture) | ✅ Active | Auth layer |
| `user_personas` | Legacy persona storage | ⚠️ Partially deprecated | Being replaced by Supabase auth metadata; kept for migration reads |
| `memories` | Brain dump sessions | ✅ Active | Primary store for `MemoryItem[]` with nested `ActionItem[]` |
| `action_items` | Tasks (child of memories) | ⚠️ Broken | Schema uses `action_items`; code queries `actions` in places — silent localStorage fallback |
| `diary_entries` | Journal entries | ⚠️ Broken | Schema uses `diary_entries`; code queries `diary` — silent localStorage fallback |
| `life_synthesis` | AI synthesis output | ✅ Written | AI writes here after brain dump; never displayed to user |
| `external_events` | Calendar sync | ❌ Not used | Table exists; `CalendarHub.tsx` not routed |
| `chat_messages` | Coach chat history | ❌ Not used | Table exists; `CoachHub.tsx` not routed |
| `stickers` | User sticker collection | ❌ Not used | `StickersHub.tsx` not routed; types still in `types.ts` |

### 6.2 localStorage Keys

| Key | Contents | TTL |
|---|---|---|
| `dumped_memories` | Full `MemoryItem[]` with nested `ActionItem[]` | Persistent |
| `dumped_diary` | `DiaryEntry[]` | Persistent |
| `dumped_persona` | `UserPersona` | Persistent |
| `dumped_synthesis` | `LifeSynthesis` | Persistent |
| `dumped_user` | `UserProfile` | Persistent |
| `dumped_session_context` | Priority session: mood, time, location, `answeredAt` | 1 hour |
| `dumped_maybe_later_ids` | `string[]` of parked task IDs | Persistent |
| `seen_landing` | `'true'` when landing page dismissed | Persistent |
| `onboarding_complete_{userId}` | `'true'` when onboarding done | Persistent |

### 6.3 Key Type Fields (confirmed via usage in components)

| Type | Key Fields | Notes |
|---|---|---|
| `ActionItem` | `id`, `text`, `category`, `urgency` (1–10), `effort` (low/medium/high), `estimatedMinutes`, `contextTags[]`, `steps[]`, `rationale`, `alignmentScore`, `globalOrder`, `categoryOrder`, `batchId`, `isNew`, `starred`, `viewCount`, `completed`, `trend`, `trendDelta`, `deadline`, `timeOfDay`, `description`, `completeBy`, `scheduledTime`, `impactArea`, `transmutationCount` | `transmutationCount` tracked but never used or displayed |
| `MemoryItem` | `id`, `content`, `timestamp`, `actions[]`, `tags[]`, `priority`, `category`, `mood` | `actions[]` is the nested task array |
| `UserPersona` | `writingStyle`, `thoughtProcess`, `values[]`, `jobTitle`, `lifestyle`, `customCategories[]`, `longTermGoals[]`, `productivityPatterns`, `currentConstraints[]`, `successVision`, `brutalistBackground`, `coreValues[]` | `brutalistBackground` stores the scene ID — also incorrectly wired to the vision textarea in `PersonaEditor` |
| `DiaryEntry` | `id`, `content`, `mood`, `timestamp`, `transmutationCount` | `transmutationCount` never incremented |
| `LifeSynthesis` | `themes[]`, `frictionPoints[]`, `currentTrajectory`, `synthesis`, `generatedAt` | Generated and stored after every brain dump; never shown to user |

---

## 7. Mascot & Mood Chip System

A complete mascot design system exists in `components/mascots/` and is production-ready but not yet integrated into the main app UI.

| Asset | File | Size | Animation | Status |
|---|---|---|---|---|
| Dumpy | `dumpy.svg` | 88×88 | squish | ✅ Built — not wired into BrainDumpHub |
| Prio | `prio.svg` | 88×88 | jelly | ✅ Built — not wired into PrioritiesHub |
| Foco | `foco.svg` | 88×88 | wiggle | ✅ Built — not wired into FocusHub |
| Moji | `moji.svg` | 88×88 | bounce | ✅ Built — not wired into JournalHub |
| Goalie | `goalie.svg` | 88×88 | spin-pop | ✅ Built — not wired into PersonaEditor |
| Mood: Joyful | `mood-joyful.svg` | 56×56 | heartbeat | ✅ Built — JournalHub uses Heroicons instead |
| Mood: Peaceful | `mood-peaceful.svg` | 56×56 | heartbeat | ✅ Built — not used |
| Mood: Tired | `mood-tired.svg` | 56×56 | squish | ✅ Built — not used |
| Mood: Anxious | `mood-anxious.svg` | 56×56 | wiggle | ✅ Built — not used |
| Mood: Frustrated | `mood-frustrated.svg` | 56×56 | jelly | ✅ Built — not used |
| Mood: Elated | `mood-elated.svg` | 56×56 | pop | ✅ Built — not used |
| Animation CSS | `mascot-animations.css` | — | 7 keyframes | ✅ Built — not imported |
| Animation JS | `mascot-animations.js` | — | Auto-wire API | ✅ Built — not imported |
| React wrapper | `SquishyMascotMockups.tsx` | — | Particle system | ✅ Built — not routed |

> **Integration effort:** Wiring the mascot system into the main app is low-effort: import the CSS, inline the SVGs in each hub's header area, and the JS auto-wires click animations. `SquishyMascotMockups.tsx` already shows the correct React pattern.

---

## 8. Dead Code Inventory

These files exist in the codebase, are fully formed, and compile — but are not reachable from the app's navigation or routing. Each one needs an explicit decision before launch.

| File | What it does | Recommendation | Effort to ship |
|---|---|---|---|
| `CoachHub.tsx` | Full AI chat interface. Wired for `/api/gemini/coach`. Well-formed component. | **SHIP** — add to navigation as 7th tab | < 1 day |
| `CalendarHub.tsx` | Weekly calendar grid. Drag tasks onto time slots. External event integration. | **PARK** — requires calendar sync backend first | — |
| `OverviewHub.tsx` | Life synthesis dashboard. Star graph. Trajectory, themes, friction points. | **SHIP** as About Me tab section — synthesis data already exists | 1 day |
| `StickersHub.tsx` | Full sticker board with crafting (Sparkle Mixie Station). Drag-and-drop. | **DELETE** — gamification belongs post-PMF | — |
| `TimelineView.tsx` | Roadmap view of goals by timeframe with progress bars. | **SHIP** as About Me section — persona data already exists | 0.5 days |
| `StarGraph.tsx` | SVG radar chart for life category balance. | **SHIP** within OverviewHub | Already bundled |
| `PlaybookHub.tsx` | "Vibe → Robust" tech stack guide. Unrelated to DUMPED's purpose. | **DELETE** — clearly a personal reference doc | — |
| `MemoryCard.tsx` | Legacy card component. Different styling era. | **DELETE** — superseded by TaskBucket pattern | — |
| `EnergyTracker.tsx` | Brutalist energy level picker (2–10 in 5 buttons). | **DELETE** — superseded by Priority check-in mood | — |
| `AchievementToast.tsx` | Sticker award toast. Depends on sticker system. | **DELETE** with StickersHub | — |

---

## 9. Phased Roadmap to Sticky Launch

Sequenced by dependency and compounding value. Each phase has a gate condition before proceeding.

---

### Phase 0 — Make It Trustworthy (~3.5 days)
*Non-negotiable. Everything else depends on users being able to trust their data.*

| # | Task | Effort | Why |
|---|---|---|---|
| 0.1 | Fix table name mismatches (`action_items` vs `actions`, `diary_entries` vs `diary`) in `databaseService.ts` | 0.5d | Tasks and journal entries are not actually saving to Supabase. This is the root failure. |
| 0.2 | Fix `PersonaEditor` life vision textarea to write `persona.successVision` instead of `persona.brutalistBackground` | 0.5d | Users are unknowingly overwriting their background scene selection when updating their vision. |
| 0.3 | Add visible sync status in header: Saved ✓ / Saving… / Local only ⚠️ | 1d | Users need to know whether their data is safe without reading console logs. |
| 0.4 | Show error toast on AI failure — not just `console.log`. Wire `aiStatus` and `lastAiError` into UI. | 0.5d | Silent failures read as a broken app. A toast with "try again" restores user agency. |
| 0.5 | Show persistent banner when in localStorage-only mode | 0.5d | Critical trust signal — users must know their account isn't syncing. |
| 0.6 | QA cross-category drag-and-drop in production | 0.5d | Fix was shipped March 2026 but never confirmed working under real conditions. |

> **Gate:** Zero support tickets about data loss in pre-launch testing.

---

### Phase 1 — Build the Daily Habit (~5.75 days)
*Ritual + Outcome — fastest stickiness to build, most forgiving if imperfect.*

| # | Task | Effort | Why |
|---|---|---|---|
| 1.1 | Persist Focus session count and history across tab closes | 1d | "You've focused for 3h today" is the cheapest high-impact outcome signal. Currently evaporates on close. |
| 1.2 | Morning AI greeting on app open — one AI-generated sentence using profile + task + journal data | 1d | One API call. Transforms how the app feels to open. "Morning. 3 things tied to Financial Clarity are waiting." |
| 1.3 | End-of-day Journal push notification at user's stated peak evening window (from About Me) | 0.5d | Closes the daily loop. Uses data already in the profile. Costs one scheduled notification. |
| 1.4 | Goal progress echo on task completion — inline one-liner after marking done | 1d | "Financial Clarity: 4 tasks this week." Connects action to meaning in real time. |
| 1.5 | Persist Priority context chips — "Still the same situation?" instead of fresh form on return | 0.5d | Reduces friction. Makes the app feel like it remembers. Local state change only. |
| 1.6 | Journal mood auto-updates Priority context for next session | 1d | If user logged Anxious, next Priority run pre-fills accordingly. Closes the mood loop. |
| 1.7 | Journal save confirmation copy: "Entry saved. I'll factor this in tomorrow." | 0.25d | One copy change. Confirms the feedback loop is real. Trivial effort, meaningful trust signal. |
| 1.8 | Post-Focus quiet acknowledgement line tied to goal | 0.5d | "Done. That was tied to Financial Clarity. One step closer." Replaces current silence. |

> **Gate:** D7 retention improves vs baseline. If flat, adjust push timing and greeting content before Phase 2.

---

### Phase 2 — Make Progress Visible (~8.5 days)
*Outcome + Investment — turning invisible value into felt value.*

| # | Task | Effort | Why |
|---|---|---|---|
| 2.1 | Weekly summary card — Monday morning before first dump | 2d | "Last week: 12 tasks. 7 tied to Financial Clarity. Best focus day: Thursday." Uses all existing data. |
| 2.2 | Wire `OverviewHub.tsx` into About Me tab — life synthesis display (data already exists) | 1d | The AI synthesis that runs after every dump is never shown. Showing patterns is the highest-value investment signal. |
| 2.3 | Wire `TimelineView.tsx` into About Me tab — goal roadmap view | 0.5d | Goals by timeframe with progress bars. All data exists. Component is complete. |
| 2.4 | Wire goals drag-to-reorder in `PersonaEditor` (dnd-kit already in project) | 1d | "Coming soon" shown to every user. Removing broken promises matters before launch. |
| 2.5 | Add AI synthesis trigger from Journals screen (debounced — not every entry) | 0.5d | Journal entries update mood patterns; synthesis should update accordingly. |
| 2.6 | Replace location check-in with energy level in Priorities (High/Medium/Low/Running on fumes) | 0.5d | Energy level maps more cleanly to the scoring model than location. Aligns spec to reality. |
| 2.7 | Streak counter — quiet, non-punishing (days with ≥1 Focus session) | 1d | "Day 12" shown subtly. Never surfaces a broken streak. The record, not the pressure. |
| 2.8 | "Your DUMPED life" stats view — total dumps, tasks cleared, focus time, goals updated | 1.5d | Makes user investment visible. Three months should feel weightier than day one. |
| 2.9 | Name the AI companion — consistent name + visual pip on AI bar | 0.5d | Name candidates: Ori, Emi, Lumi, Nova. Sets up all future companion work. |

> **Gate:** Weekly summary open rate ≥ 45%. If lower, summary content is too generic — invest in prompt engineering.

---

### Phase 3 — Complete and Launch (~16.5 days)
*Final completions, companion depth, and launch readiness.*

| # | Task | Effort | Why |
|---|---|---|---|
| 3.1 | Wire `CoachHub.tsx` into navigation as 7th tab — endpoint already built | 0.5d | Highest-value missing feature. Component is complete. Just needs routing. |
| 3.2 | Wire mascot SVGs into each hub header — Dumpy/Prio/Foco/Moji/Goalie | 1d | All SVGs and animation system complete. Auto-wires on click. Import CSS + inline SVGs. |
| 3.3 | Replace JournalHub mood chips with mood SVGs from `components/mascots/` | 0.5d | Mood SVGs are complete and animated. Replaces Heroicons with on-brand character system. |
| 3.4 | Journal callbacks — AI references past mood when context is similar | 2d | "You logged Anxious last Tuesday and still cleared your top task." Requires journal history in AI prompt context. |
| 3.5 | "You've done this before" confidence moments on familiar task categories | 1d | "You've cleared Finance tasks 8 times this month." Pattern matching on task history. |
| 3.6 | Manual category override in brain dump preview | 1d | Power users want this immediately. Category is read-only in current preview. |
| 3.7 | AI confidence indicator on extracted tasks | 1d | "AI is less certain about this one" reduces trust erosion when categorization is off. |
| 3.8 | Numeric mood scale 1–10 alongside emoji in Journals | 0.5d | Original spec item. Enables longitudinal mood tracking and richer AI context. |
| 3.9 | Persona conflict detection on multi-device edit | 1d | Prevents silent data loss for users editing from two devices. |
| 3.10 | Shareable priority card — "My AI told me to ___" screenshot-ready | 1d | The aesthetic makes it inherently shareable. Plants identity seeds before launch. |
| 3.11 | Onboarding activation email — trigger after first dump + priorities viewed | 1d | Activation loop. Confirms first session worked. Invites them back for Day 2. |
| 3.12 | Re-engagement push notifications — goal-specific, no urgency or guilt framing | 1.5d | "Your Financial Clarity goal has 3 tasks sitting. Nothing urgent. Whenever you're ready." |
| 3.13 | Journal search across entries | 1.5d | Basic expected functionality for a journal product. |
| 3.14 | Clean up dead code — delete `PlaybookHub`, `MemoryCard`, `EnergyTracker`, `AchievementToast`, `StickersHub` | 0.5d | Reduce surface area. Remove sticker types from `types.ts` and Supabase table. |
| 3.15 | Product Hunt prep — assets, 60-second demo video, waitlist landing page | 3d | The aesthetic drives organic upvotes. Target: Top 5 Product of the Day. |

> **Gate:** Closed beta with 20 real users. Watch sessions not surveys. Does the morning greeting land? Does the weekly summary open? Is companion voice consistent? Fix before public launch.

---

## 10. Companion Voice Rules

Every AI-generated line — greeting, reasoning quote, goal echo, journal confirmation, re-engagement push — must follow these rules. Inconsistency destroys the companion feeling.

| Rule | What it means | Do say | Never say |
|---|---|---|---|
| **No exclamation marks. Ever.** | They signal performance anxiety. A companion is calm. | "Done. That was tied to Financial Clarity." | "Great work!" |
| **Specificity over encouragement** | Data is the warmth. Generic praise is hollow. | "4 tasks tied to Financial Clarity this week." | "You're making progress!" |
| **Acknowledge, don't celebrate** | Acknowledgement means the app noticed something real. | "You cleared everything today. That doesn't happen often." | "Amazing day! 🎉" |
| **No guilt. Ever.** | Never mention what the user didn't do or missed. | "Your priorities are waiting whenever you're ready." | "You haven't used the app in 3 days!" |
| **One sentence maximum** | Long AI output reads as system, not companion. | One line. Then silence. | Multi-sentence greetings or explanations. |

---

## 11. Out of Scope Before Launch

| Feature | Why not yet | When to revisit |
|---|---|---|
| Native iOS / Android app | Web experience isn't sticky yet. A native app of a leaky product is a leaky native app. | After D30 retention > 20% on web |
| Calendar integration | `external_events` table exists. Feature is real. Doesn't serve stickiness goal right now. | Phase 4 — after stable MAU |
| Payments / subscriptions | No point gating a product users aren't returning to yet. | After weekly active users stable |
| Real-time collaboration | Core single-user experience not finished. Multi-user adds complexity without fixing retention. | Phase 4 — after product-market fit |
| Custom AI model training | Massive cost and complexity. Gemini 2.0 Flash is more than sufficient. | Serious scale only |
| Identity / community (Discord) | Identity stickiness manufactured too early reads as cringe. Must emerge organically. | After 500+ organic active users |
| Sticker system | Belongs post-PMF. `StickersHub.tsx` should be deleted before launch. | Phase 4 if at all |

---

## 12. Success Metrics

### Foundation — must be zero before public launch

| Metric | Target | What failure means |
|---|---|---|
| Support tickets about data loss | 0 | Phase 0 not done. Do not proceed. |
| Sessions where localStorage-only mode triggers silently | 0 | Sync status indicator not working. |
| AI failures with no user-visible feedback | 0 | Phase 0 item 0.4 incomplete. |
| PersonaEditor overwriting background with vision text | 0 | Phase 0 item 0.2 not fixed. |

### Stickiness — measure post-Phase 1

| Metric | Architecture | Target D30 | Target D90 |
|---|---|---|---|
| Day 7 retention | Ritual | ≥ 30% | ≥ 40% |
| Day 30 retention | Ritual + Outcome | ≥ 20% | ≥ 30% |
| Morning open rate (opens within 2hrs of waking) | Ritual | ≥ 35% active users | ≥ 45% |
| Weekly summary open rate | Outcome | ≥ 45% | ≥ 55% |
| Brain dumps per active user per week | Ritual | 3+ | 5+ |
| Focus sessions per active user per week | Ritual + Outcome | 2+ | 3+ |
| Journal entries per active user per week | Companion | 1+ | 2+ |
| Context persistence rate (confirm vs reset) | Companion | ≥ 50% | ≥ 60% |
| "Not this one" skip rate on AI top priority | Companion | < 30% | < 20% |
| Push notification open rate | Companion | ≥ 15% | ≥ 20% |
| Time to first task after signup | Onboarding | < 3 min | < 2 min |

### The companion test — qualitative

> At Day 30, ask 10 users one question: **"Does DUMPED feel like a tool you use, or something that is part of your daily life?"** Target: 6 out of 10 answering "part of my daily life." Below 4 means the voice and greeting work needs revision before scaling.

---

## 13. Total Effort Summary

| Phase | Focus | Est. effort | Gate |
|---|---|---|---|
| Phase 0 — Trust | Data integrity fixes, AI error surfacing, PersonaEditor bug | ~3.5 days | Zero data loss tickets in testing |
| Phase 1 — Habit | Morning greeting, focus persistence, goal echo, ritual push | ~5.75 days | D7 retention improves vs baseline |
| Phase 2 — Progress | Weekly summary, life synthesis surface, drag-to-reorder, stats view | ~8.5 days | Weekly summary open rate ≥ 45% |
| Phase 3 — Launch | Coach UI, mascots, journal callbacks, shareable card, Product Hunt | ~16.5 days | Closed beta: companion voice consistent across 20 users |
| **Total** | | **~34 days (1 dev) / ~17 days (2 devs parallel)** | |

The most important insight from the codebase audit: DUMPED has more built than most teams realize. `OverviewHub`, `TimelineView`, `CoachHub`, and the entire mascot system are complete and sitting unused. Phase 3 is as much about wiring existing work as building new features.

---

*DUMPED PRD v3.0 · March 2026 · Live codebase audit: 52 source files · Confidential*
*Document maintained by: Andre + Claude Code · Next review: After Phase 0 complete*
