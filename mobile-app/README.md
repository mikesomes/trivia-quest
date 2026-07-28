# mobile-app — Trivia Quest Mobile App

Expo React Native app (TypeScript) for the Trivia Quest trivia game. Uses Expo Router for file-based navigation, React Query for server state, and Zustand for client state.

Players sign in anonymously on first launch (no account required) and play one of four modes — Classic (10 questions, 3 lives), Blitz (one global clock, unlimited questions), Survival (one life, progressive difficulty), and Odd One Out — plus a Daily Challenge and a 12-category Quest campaign with star ratings and boss nodes. XP, coins, a power-up shop, achievements, and multi-mode leaderboards round out the meta-game. The backend is authoritative for all scoring.

---

## Table of Contents

- [App Structure](#app-structure)
- [State Management](#state-management)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Running Tests](#running-tests)
- [EAS Build & Deploy](#eas-build--deploy)
- [Gameplay](#gameplay)
- [Customization Guide](#customization-guide)
- [Adding a New Screen](#adding-a-new-screen)
- [Post-MVP TODOs](#post-mvp-todos)

---

## App Structure

### Screen flow

```
app/index.tsx                  — Splash / redirect (checks auth, routes to tabs or onboarding)
app/onboarding.tsx             — First-launch slides + display-name entry
│
├── app/(tabs)/_layout.tsx     — Bottom tab navigator
│   ├── (tabs)/home.tsx        — Greeting, XP bar, quest hero card, daily challenge, mode cards
│   ├── (tabs)/leaderboard.tsx — Mode tabs (XP/Classic/Survival/Blitz) × period tabs
│   ├── (tabs)/profile.tsx     — Avatar, editable name, stats grid, achievements
│   └── (tabs)/shop.tsx        — Spend coins on power-ups; equip loadout for next round
│
├── app/game/
│   ├── game/mode-select.tsx        — Pick Classic / Blitz / Survival / Odd One Out
│   ├── game/mode-intro.tsx         — Per-mode rules screen
│   ├── game/category.tsx           — Classic category picker
│   ├── game/blitz-category.tsx     — Blitz category picker
│   ├── game/play.tsx               — Active game: timer, question, answers, lives/power-ups
│   ├── game/results.tsx            — Round summary (classic/blitz/daily/quest variants)
│   ├── game/gameover.tsx           — All-lives-lost screen
│   └── game/sudden-death-over.tsx  — Survival-run-ended screen
│
└── app/quest/
    ├── quest/index.tsx        — Quest category hub
    └── quest/[categoryId].tsx — Node map for a category (stars, unlock gating)
```

### Source layout

```
src/
├── api/           — Typed API client functions (one file per endpoint group)
├── components/    — Shared UI components (Button, Card, ProgressBar, LivesDisplay, ...)
├── constants/
│   ├── categories.ts   — Display metadata for each category (label, emoji, description)
│   ├── difficulties.ts — Difficulty display metadata and color mapping
│   ├── game.ts         — Game constants (TIMER_SECONDS, STARTING_LIVES, etc.)
│   ├── queryKeys.ts    — React Query key factory
│   └── theme.ts        — Colors, spacing, border radius, font sizes
├── hooks/         — Custom hooks (useRound, useLeaderboard, useProfile, useTimer, ...)
├── lib/           — Supabase client initialization
├── store/
│   ├── authStore.ts        — Auth session (persisted to AsyncStorage)
│   ├── gameStore.ts        — Active round state (roundId, answers, streak, lives, round XP)
│   └── leaderboardStore.ts — Cached leaderboard period selection
├── types/         — Shared TypeScript types matching the backend schema
└── utils/
    └── scoring.ts — Client-side XP preview (mirrors backend scoring.ts)
```

---

## State Management

### Zustand stores

| Store | Persisted | Contents |
|---|---|---|
| `authStore` | Yes (AsyncStorage) | Supabase session, user ID, display name, level, XP. Survives app restarts. |
| `gameStore` | No | Active round: `roundId`, current question index, lives remaining, round XP, current streak, array of answer results. Cleared when a new round starts. |
| `leaderboardStore` | No | Selected leaderboard period (`weekly` / `alltime`). Resets to `weekly` on restart. |

### React Query (server state)

All data fetched from the API goes through React Query. This handles caching, background refetching, loading and error states automatically.

| Query key | Endpoint | Used in |
|---|---|---|
| `['profile']` | `GET /get-profile` | `(tabs)/profile.tsx`, `(tabs)/home.tsx` |
| `['leaderboard', period]` | `GET /get-leaderboard?period=...` | `(tabs)/leaderboard.tsx` |
| `['round', roundId]` | `GET /get-round-questions` | `game/play.tsx` |

Mutations (create round, submit answer, finish round, submit XP) use `useMutation` and invalidate related queries on success.

### AsyncStorage

Used exclusively by `authStore` (via Zustand's `persist` middleware) to save and restore the Supabase auth session between app launches. No other data is persisted manually.

---

## Prerequisites

- **Node.js 20+**
- **Expo CLI** — install globally or use `npx`:
  ```bash
  npm install -g expo-cli
  # or just use: npx expo <command>
  ```
- One of the following to run the app:
  - **iOS Simulator** — requires Xcode on macOS (free from the App Store)
  - **Android Emulator** — requires Android Studio
  - **Expo Go** — install the Expo Go app on a physical iOS or Android device for the fastest setup
- A running instance of `trivia-api` — either locally (`supabase start`) or a deployed Supabase project. See `../trivia-api/README.md`.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL, e.g. `https://abcdef.supabase.co`. For local dev, use `http://127.0.0.1:54321`. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The public anon key from your Supabase project (Settings → API). Safe to expose in the app. |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for Edge Function calls, e.g. `https://abcdef.supabase.co/functions/v1`. For local dev: `http://127.0.0.1:54321/functions/v1`. |
| `EXPO_PUBLIC_ENV` | `development` or `production`. Sentry reporting is enabled only in `production`. |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for crash/error reporting (optional in local dev). |

> All variables prefixed with `EXPO_PUBLIC_` are bundled into the app at build time and are readable by client code. Never put secrets (service role keys, OpenAI keys) in `.env.local`.

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — fill in your Supabase URL, anon key, and API base URL
```

For local backend development, use the values printed by `supabase start` in the `trivia-api` directory.

### 3. Start the development server

```bash
npx expo start
```

Then press:
- `i` — open iOS Simulator
- `a` — open Android Emulator
- `w` — open in web browser
- Scan the QR code with the Expo Go app on your phone

### 4. Hot reload

Expo supports fast refresh by default. Save any file and the app updates instantly without losing navigation state.

### Useful scripts

```bash
npm run ios        # Start and open directly in iOS Simulator
npm run android    # Start and open directly in Android Emulator
npm run web        # Start in web browser (limited native feature support)
```

---

## Running Tests

Tests use [Jest](https://jestjs.io/) with the `jest-expo` preset and [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/).

```bash
npm test           # run all tests once (CI mode)
npm run test:watch # watch mode — reruns tests on file change
npm run typecheck  # TypeScript type checking (no test execution)
```

### Test files

| File | What it tests |
|---|---|
| `__tests__/utils/scoring.test.ts` | Client-side XP preview — verifies it matches the backend XP formulas |
| `__tests__/utils/difficultyMix.test.ts` | Difficulty mix/segment generation for classic progression and Blitz |
| `__tests__/utils/format.test.ts` | Display formatting helpers |
| `__tests__/stores/gameStore.test.ts` | Zustand game store — round initialization, answer submission, streak/lives logic |
| `__tests__/api/profile.test.ts` | Profile API client behavior |

---

## EAS Build & Deploy

[Expo Application Services (EAS)](https://expo.dev/eas) handles building and submitting the app to the App Store and Google Play.

### First-time setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Configure EAS for this project (creates/updates eas.json)
eas build:configure
```

### Building

```bash
# iOS production build (requires Apple Developer account)
eas build --platform ios --profile production

# Android production build
eas build --platform android --profile production

# Build both platforms at once
eas build --platform all --profile production
```

Builds run on Expo's cloud infrastructure. You'll get a download link when the build finishes. Check status at https://expo.dev.

### Build profiles

The `eas.json` in this repo defines three profiles:

| Profile | Distribution | Notes |
|---|---|---|
| `development` | Internal | Includes dev client for debugging. Install on a device via QR code. |
| `preview` | Internal | Production-like build distributed internally (no app store). Good for QA. |
| `production` | Store | Optimized build for App Store / Play Store submission. |

### Submitting to stores

```bash
# Submit the latest build to App Store (requires App Store Connect credentials)
eas submit --platform ios

# Submit the latest build to Google Play
eas submit --platform android
```

EAS Submit handles the upload. You still need to fill in store listing metadata, screenshots, and privacy policy in App Store Connect / Google Play Console before the app can go live.

### Over-the-air (OTA) updates

For JS-only changes (no native code changes), you can push updates instantly without going through app store review:

```bash
eas update --branch production --message "Fix leaderboard sorting"
```

---

## Gameplay

### Rules

- **Classic**: 10 multiple-choice questions (4 options each) in a chosen category. Each question has a **15-second timer** (`TIMER_SECONDS`); timeouts count as wrong and cost a life. Players start with **3 lives** (more with level perks).
- **Blitz**: one global clock (`BLITZ_SECONDS`, currently 45s), unlimited questions; streaks add time, wrong answers subtract it.
- **Survival**: one life, chained 10-question batches with a progressive difficulty ramp and rotating categories.
- **Odd One Out**: pick the item that doesn't belong.
- **Daily Challenge**: a shared 10-question set for all players, resetting at midnight Eastern, with a day-streak counter.
- **Quest**: a campaign of 12 categories × 5 nodes (classic/timed/survival/boss), 1–3 stars per node, unlock gating.
- Power-ups from the shop: extra lives, hammers (remove 2 wrong options), shields (block one wrong answer), XP booster.
- After a round, the results screen shows XP earned (with speed/streak breakdown), coins, session totals, and rank.

### XP

| Component | Value |
|---|---|
| Base XP per correct answer | 10 on Easy, higher on harder modes |
| Speed bonus | Up to 50% of the difficulty base |
| Streak bonus | Multiplies answer XP at streak milestones |
| Wrong answer or timeout | 0 XP, −1 life |

XP is awarded from correct answers, speed, difficulty, streaks, and round-completion bonuses. Leveling uses a quadratic curve — early levels are quick, higher levels require significantly more XP. See `../trivia-api/README.md` for the full XP formula.

---

## Customization Guide

### Timer duration

Change `TIMER_SECONDS` in `src/constants/game.ts`. This must match `TIMER_SECONDS` in the backend's `supabase/functions/_shared/types.ts`. The timer visual in `game/play.tsx` reads from this constant.

### Lives per round

Change `STARTING_LIVES` in `src/constants/game.ts`. Must match the backend. Also update the `valid_lives` database constraint if the new value exceeds 3.

### XP preview

The client displays an XP preview during gameplay using `src/utils/scoring.ts`. If you change the backend XP formula, mirror those changes here so the UI stays accurate. The backend always recomputes the authoritative XP — this file only affects what the player sees in real time.

### Answer reveal delay

After submitting an answer, the app briefly shows correct/wrong feedback before advancing. Adjust `ANSWER_REVEAL_DELAY_MS` in `src/constants/game.ts` (default: 1200ms).

### Categories

The `src/constants/categories.ts` file maps each category ID to display metadata:
```typescript
{ id: 'science', label: 'Science', emoji: '🔬', description: 'Nature and discovery' }
```
When a new category is added to the backend, add a matching entry here. The category picker screen reads from this array.

### Theme / colors

All colors, spacing, border radii, and font sizes are defined in `src/constants/theme.ts`. The app uses a dark theme by default. Key color tokens:

| Token | Default | Usage |
|---|---|---|
| `colors.bg` | `#0f0f1a` | Screen background |
| `colors.bgCard` | `#1a1a2e` | Card/panel background |
| `colors.primary` | `#6c63ff` | Buttons, active states, tab bar |
| `colors.correct` | `#4CAF50` | Correct answer highlight |
| `colors.incorrect` | `#F44336` | Wrong answer highlight |
| `colors.easy` | `#4CAF50` | Easy difficulty label |
| `colors.medium` | `#FF9800` | Medium difficulty label |
| `colors.hard` | `#F44336` | Hard difficulty label |

---

## Adding a New Screen

Expo Router uses file-based routing — every file in `app/` automatically becomes a route.

### Steps

1. **Create the file:**
   ```bash
   # For a top-level screen:
   touch app/your-screen.tsx

   # For a screen inside the game flow:
   touch app/game/your-screen.tsx
   ```

2. **Write the component** — export a default React component from the file:
   ```typescript
   import { View, Text } from 'react-native'

   export default function YourScreen() {
     return (
       <View>
         <Text>Hello from your new screen</Text>
       </View>
     )
   }
   ```

3. **Navigate to it** using the `expo-router` `router` object or `<Link>` component:
   ```typescript
   import { router } from 'expo-router'

   // Imperative navigation
   router.push('/your-screen')

   // Or declarative
   import { Link } from 'expo-router'
   <Link href="/your-screen">Go to screen</Link>
   ```

4. **Pass parameters** via the URL:
   ```typescript
   router.push('/your-screen?id=123')

   // In the screen:
   import { useLocalSearchParams } from 'expo-router'
   const { id } = useLocalSearchParams()
   ```

No route registration is needed — Expo Router discovers all files in `app/` automatically.

---

## Post-MVP TODOs

- [ ] Offline mode — cache a set of questions in AsyncStorage so the game works without a connection
- [ ] Deep linking support — link directly into a specific category from a push notification
- [ ] E2E tests with [Detox](https://wix.github.io/Detox/)
- [ ] Dark/light theme toggle (currently dark-only)
- [ ] Server push notifications (Expo Push) — local scheduled notifications ship first
- [ ] Friends / head-to-head duels
- [ ] Weekly leagues (cohort-based promotion/demotion)
