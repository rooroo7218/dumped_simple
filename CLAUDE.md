# CLAUDE.md — Dumped Project Instructions

This file is read by Claude Code at the start of every session.
Global rules (design, security, TypeScript standards, git) live in `~/.claude/CLAUDE.md` and apply here too.
Process workflow: `~/.claude/VIBE_CODE_PROCESS.md`
Stack reference: `~/.claude/SETUP_GUIDE.md`

---

## Project Identity

- **App name:** Dumped
- **Repo folder:** Brain-Dump-App
- **Goal:** Launch as a consumer product. Every decision should be made with reliability, stability, and real-user experience in mind.

---

## Tech Stack (quick reference)

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | UI and app logic |
| AI | Google Gemini (`@google/genai`) | Brain dump processing, chat, synthesis |
| Database | Supabase (PostgreSQL) | Persistent storage for all user data |
| Auth | Google Sign-In (JWT) | User identity |
| Deployment | Vercel | Hosting and CI/CD |
| Version Control | GitHub | Source of truth for code |

---

## Key Files

| File | What it does |
|---|---|
| `App.tsx` | Main application — all views, state, and UI logic live here (very large) |
| `types.ts` | TypeScript interfaces for all data models |
| `services/geminiService.ts` | All calls to the Gemini AI API |
| `services/databaseService.ts` | All Supabase database reads/writes, with localStorage fallback |
| `components/MemoryCard.tsx` | UI component for displaying a memory item |
| `database/schema.sql` | Supabase database table definitions |
| `vite.config.ts` | Build configuration |
| `.env` | Environment secrets (never commit this) |

---

## Database Tables

- `user_profiles` — user identity and settings
- `user_personas` — AI-learned user profile
- `memories` — brain dump entries
- `action_items` — tasks extracted from memories (child of memories)
- `diary_entries` — journal entries
- `life_synthesis` — AI-generated life overview
- `external_events` — calendar events
- `chat_messages` — conversation history

All tables have Row Level Security (RLS) enabled — users can only see their own data.

---

## Known Issues (as of project start)

1. **Auth is unreliable** — Google Sign-In / JWT handling is flaky
2. **Data not saving to Supabase** — app silently falls back to localStorage without telling user
3. **UI is confusing** — navigation and feature discoverability needs work
4. **Gemini AI connectivity is spotty** — calls fail silently or give poor results
5. **App.tsx is very large** — all logic is in one file; refactoring into components is a future priority

---

## Working Rules

1. **Always read a file before editing it** — never guess at content
2. **Fix one thing at a time** — small, testable changes
3. **Never commit `.env`** — it contains real API keys
4. **Never remove the localStorage fallback** without confirming Supabase is working
5. **Prefer editing existing files** over creating new ones
6. **Ask before touching auth or database schema** — these are high-risk changes
7. **User approves before we push or deploy** — always confirm before git push or Vercel deploy
8. **Prioritise reliability over features** — fix what's broken before adding new things
9. **App.tsx is very large** — do not add more code to it; refactor out to components when touching it

---

## Phase 1 Priority (Current Focus)
Fix reliability before any new features:
1. Stabilise Google Sign-In / JWT auth
2. Confirm data is saving to Supabase (not silently falling back to localStorage)
3. Add visible error messages so the user knows when something fails
4. Make Gemini API calls reliable with proper error handling

---

## Workflow with User

- User is non-technical. Explain changes in plain English before and after making them.
- User preference: Claude suggests what to do next, user approves.
- Present one clear recommendation at a time, not a menu of options.
- When something fails, explain why in plain terms — not stack traces.
- Never present a wall of technical output — summarise what matters.

---

## Environment Variables Required

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=   (or GEMINI_API_KEY depending on usage)
```

Check `.env` or `.env.local` for actual values — never hardcode or log these.
