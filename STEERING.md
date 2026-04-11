# Dumped — Project Steering Document

*Plain-English guide to what this app is, how it works, and how we build it together.*

---

## What Is This App?

**Dumped** is an AI-powered life assistant. You "brain dump" your thoughts — anything on your mind, your goals, your worries, your tasks — and the app uses AI to:

- Extract action items and to-dos from your raw thoughts
- Spot patterns and themes across your life
- Keep a diary with mood tracking
- Schedule and prioritise your tasks
- Build a personal "persona" by learning how you think and write
- Let you have a conversation with an AI that knows your whole life context

The goal is to go from "I have a million things in my head" to "here's what actually matters and what to do next."

---

## The Tech Stack (What Each Tool Does)

Think of this like the parts of a building:

| Part | Tool | Plain-English Role |
|---|---|---|
| The walls and rooms (UI) | **React + TypeScript** | Everything you see and click in the browser |
| The builder's rulebook | **TypeScript** | Catches mistakes in the code before they become bugs |
| The construction vehicle | **Vite** | Packages and runs the code during development |
| The brain | **Google Gemini** | The AI that reads your brain dumps and generates insights |
| The filing cabinet | **Supabase** | Stores all your data (memories, diary, tasks) in a real database |
| The front door | **Google Sign-In** | How you log in |
| The website host | **Vercel** | Where the live app lives on the internet |
| The blueprint archive | **GitHub** | Stores every version of the code — a full history you can always go back to |

---

## How the App Is Structured (File Map)

```
Brain-Dump-App/
│
├── App.tsx              ← The main app. All pages and logic. (Very large — future cleanup task)
├── types.ts             ← Defines what a "Memory", "Task", "Diary Entry" etc. looks like
├── index.tsx            ← Starting point — loads the app into the browser
├── index.html           ← The HTML shell the app lives inside
│
├── services/
│   ├── geminiService.ts     ← All communication with the Gemini AI
│   └── databaseService.ts   ← All reading/writing to Supabase database
│
├── components/
│   └── MemoryCard.tsx       ← The card UI that displays a single memory
│
├── database/
│   └── schema.sql           ← The blueprint for the Supabase database tables
│
├── .env                 ← Your secret keys (NEVER share or commit this file)
├── CLAUDE.md            ← Claude's instructions for working on this project
├── STEERING.md          ← This document
└── README.md            ← Basic setup instructions
```

---

## The Database (What Gets Stored Where)

Your Supabase database has these "tables" (think of each as a spreadsheet tab):

| Table | What it stores |
|---|---|
| `user_profiles` | Your name, email, profile picture, settings |
| `user_personas` | How the AI understands your writing style and values |
| `memories` | Every brain dump you've entered |
| `action_items` | Tasks extracted from your brain dumps |
| `diary_entries` | Journal entries with mood |
| `life_synthesis` | AI's big-picture summary of your life patterns |
| `external_events` | Calendar events |
| `chat_messages` | Your conversation history with the AI |

**Important:** All data is protected by "Row Level Security" — meaning you can only ever see your own data, never anyone else's.

**Fallback behaviour:** If Supabase isn't connected, the app saves to your browser's local storage instead. This is a safety net during development, but it means data can get lost if you clear your browser. This is a known issue to fix.

---

## Current State of the App

### What's Working
- The core brain dump → action items flow exists
- Diary entry creation and display
- Life synthesis generation
- Basic calendar/scheduler view
- User persona building
- AI chat interface
- Google Sign-In flow (partially)
- Database schema is well designed

### Known Issues (Priority Order)

| # | Issue | Impact |
|---|---|---|
| 1 | **Auth is unreliable** | Users can't log in consistently |
| 2 | **Data doesn't save to Supabase** | App silently uses browser storage instead — data can be lost |
| 3 | **Gemini AI is spotty** | AI features fail without clear error messages |
| 4 | **UI is confusing** | Hard to know what to do or where things are |
| 5 | **All code in one big file** | `App.tsx` is very large — harder to maintain over time |

---

## The Roadmap

We'll work in this order (reliability before features):

### Phase 1 — Make It Reliable (Fix What's Broken)
- [ ] Stabilise Google Sign-In so login always works
- [ ] Confirm data is actually saving to Supabase (not just local storage)
- [ ] Make Gemini API calls reliable with proper error handling and user feedback
- [ ] Add visible error messages so you know when something fails

### Phase 2 — Make It Usable (UX Polish)
- [ ] Simplify the main navigation
- [ ] Make it clear what each feature does
- [ ] Mobile-friendly layout
- [ ] Loading states so the app doesn't look frozen

### Phase 3 — Make It Launchable (Product Readiness)
- [ ] Onboarding flow for new users
- [ ] Clean up the large `App.tsx` into smaller files
- [ ] Performance improvements
- [ ] Basic analytics to understand how it's being used

### Phase 4 — Grow It
- [ ] Additional AI features
- [ ] Potential monetisation (e.g. usage limits on free tier)
- [ ] User feedback loop

---

## The Document System

You now have a set of living documents that guide every session. Here's what each one is and where it lives:

| Document | Location | What It Does |
|---|---|---|
| **Global Rules** | `~/.claude/CLAUDE.md` | Standing rules that apply to every project — TypeScript standards, design principles, security, git conventions. Claude reads this automatically. |
| **Process Workflow** | `~/.claude/VIBE_CODE_PROCESS.md` | The 7-phase process from idea to launch. Use this as a checklist at the start of every new app. |
| **Setup Guide** | `~/.claude/SETUP_GUIDE.md` | Full stack reference — why each tool was chosen, how to set up a new project, code patterns, commands. |
| **Project Rules** | `Brain-Dump-App/CLAUDE.md` | Dumped-specific context — current stack, known issues, key files. Claude reads this at the start of every Dumped session. |
| **Steering Doc** | `Brain-Dump-App/STEERING.md` | This file — plain-English guide to the project for you. |

### Starting a New App
Follow the process in `~/.claude/VIBE_CODE_PROCESS.md` from Phase 1. Use the stack from `~/.claude/SETUP_GUIDE.md` as your template. Create a new project-level `CLAUDE.md` in that repo.

### Starting a New Claude Session on an Existing App
Claude will automatically read the `CLAUDE.md` files. You can also paste the relevant section of `SETUP_GUIDE.md` for additional context.

---

## How We Work Together

### The Process for Every Change

1. **I identify what to fix** — I'll read the code, understand the problem, and propose a specific fix
2. **I explain it to you in plain English** — what the problem is, what I'm going to do, and why
3. **You approve** — you say yes, ask questions, or redirect me
4. **I make the change** — I edit the code
5. **We verify it works** — you test in the browser
6. **We commit to GitHub** — save the progress permanently

### Ground Rules

- **You always approve before anything is pushed to GitHub or deployed to Vercel** — no surprises
- **We fix one thing at a time** — small changes are safe changes
- **I will never touch your `.env` file** — it contains real secret keys
- **If something breaks, we revert** — GitHub keeps a full history so nothing is ever permanently lost

### How to Think About GitHub

GitHub is like Google Docs "version history" but for code. Every time we commit, we save a named checkpoint. If something goes wrong, we can always go back. This is why we commit often.

### How to Think About Vercel

Vercel is connected to your GitHub. When you push code to GitHub, Vercel automatically rebuilds and re-deploys the live app. You don't need to do anything manually — but this is also why we're careful about what we push.

---

## Glossary

| Term | Plain English |
|---|---|
| **Component** | A reusable chunk of UI (like a button, a card, a page) |
| **TypeScript** | JavaScript with extra rules that catch bugs before they happen |
| **API** | A way for two programs to talk to each other |
| **Environment variable** | A secret setting (like a password or API key) stored outside the code |
| **Supabase** | A hosted database — like a very powerful spreadsheet in the cloud |
| **Row Level Security (RLS)** | A database rule that ensures users can only see their own data |
| **Vite** | The tool that bundles your code and runs it in the browser during development |
| **Commit** | Saving a named snapshot of the code to GitHub |
| **Deploy** | Pushing the latest code to the live internet so users can access it |
| **Fallback** | A backup plan the code uses when the primary option fails |
| **localStorage** | Temporary storage in the browser — cleared if you wipe browser data |
| **JWT** | A token (like a digital ticket) that proves you're logged in |
| **RLS** | Row Level Security — each user can only see their own rows in the database |

---

*Last updated: March 2026*
*Maintained by: Andre + Claude Code*
