# Trivia Quest

A full-stack trivia game. Players answer 10 questions per round against a 15-second timer, earn XP, level up, and compete on a leaderboard.

---

## Project Structure

```
trivia-app/
├── trivia-api/    — Backend: Supabase Edge Functions + PostgreSQL + OpenAI
└── mobile-app/    — Frontend: Expo React Native app (iOS + Android)
```

Each sub-project has its own README with full setup and documentation:

- **[trivia-api/README.md](trivia-api/README.md)** — Database schema, all 8 API endpoints, local dev setup, deployment to Supabase, XP/leveling formula, customization guide.
- **[mobile-app/README.md](mobile-app/README.md)** — Screen structure, state management (Zustand + React Query), local dev setup, EAS build and App Store submission, customization guide.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo (React Native), TypeScript, Expo Router, React Query, Zustand |
| API | Supabase Edge Functions (Deno runtime) |
| Database | PostgreSQL via Supabase (RLS-enabled) |
| Auth | Supabase anonymous auth |
| AI | OpenAI gpt-4o-mini (question generation) |

---

## Quick Start

### Backend

```bash
cd trivia-api
npm install
supabase start           # starts local Postgres + Edge Functions runtime
cp .env.example .env.local  # fill in OPENAI_API_KEY and CRON_SECRET
supabase db push         # apply migrations
supabase functions invoke generate-questions --body '{"topUpAll":true}'
```

See [trivia-api/README.md](trivia-api/README.md) for full details.

### Mobile App

```bash
cd mobile-app
npm install
cp .env.example .env.local  # fill in Supabase URL and anon key
npx expo start              # press i for iOS, a for Android
```

See [mobile-app/README.md](mobile-app/README.md) for full details.
