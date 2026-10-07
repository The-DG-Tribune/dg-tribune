# DG Tribune

**The Home of Sports Fans** — a modern football media platform: news, players,
teams, leagues, quizzes, wallpapers and interactive tools.

This repository is being built phase by phase according to the DG Tribune
Master Builder Specification. This commit represents **Phase 1: Project
Initialization**.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · React Router · Framer Motion ·
Lucide Icons · Firebase (Auth + Firestore) · Cloudinary · Football-Data.org API

## Getting started (one-time setup)

1. **Install Node.js** (LTS) from [nodejs.org](https://nodejs.org) if you
   don't already have it.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Confirm your `.env` file has real values (already included for this
   project — see below). Never commit this file.
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open the printed `http://localhost:5173` link in your browser.

You should see a **"Phase 1 · Project Initialization"** status card
confirming Tailwind, fonts, routing and the design system are all working.
A 404 page is also live — try visiting any other path (e.g.
`http://localhost:5173/anything`).

## Environment variables

`.env` already contains your real Firebase, Cloudinary, and Football-Data.org
credentials, supplied for this build. `.env.example` is the safe-to-commit
template. `.env` is git-ignored — never push it to a public repository.

## Project structure

```
src/
  assets/        Icons, images, fonts
  components/    Reusable UI (built out in Phase 2)
  pages/         Route-level page components
  layouts/       PublicLayout, DashboardLayout (Phase 5/7)
  hooks/         Custom React hooks
  services/      firebase/, cloudinary/, footballAPI/ — all external calls
                 live here, never directly in components (Phase 3)
  utils/         Small helper functions
  constants/     routes.ts, theme.ts — single sources of truth
  types/         Shared TypeScript types
  context/       React Context providers
  styles/        Global Tailwind stylesheet
  router/        Route configuration
  lib/           Third-party integration glue
  data/          Static/reference data (not CMS content)
  config/        App-level configuration
```

## Build order

This project follows a strict phase order — see Document 10 (Claude Master
Build Instructions) for the full sequence. Each phase ships in a working
state before the next begins.

- [x] Phase 1 — Project Initialization
- [ ] Phase 2 — Global UI System
- [ ] Phase 3 — Firebase Integration
- [ ] Phase 4 — Authentication
- [ ] Phase 5 — CMS Foundation
- [ ] Phase 6 — CMS Modules
- [ ] Phase 7 — Public Website Foundation
- [ ] Phase 8 — Football Pages
- [ ] Phase 9 — Tools Platform
- [ ] Phase 10 — Wallpapers
- [ ] Phase 11 — Search
- [ ] Phase 12 — SEO
- [ ] Phase 13 — Optimization
- [ ] Phase 14 — Deployment
