# CLAUDE.md

## Commands
```bash
npm start           # Expo dev server
npm run ios         # iOS Simulator
npm run android     # Android Emulator
npm run web         # Browser
npm test            # Run tests (CI)
npm run test:watch  # Watch mode
npm run typecheck   # Type check only
```

## Stack
Expo Router + React Native + TS  
Zustand (client) + React Query (server)  
Supabase auth  
@/* -> src/*

## Structure
app/ = routes  
src/store/ = state  
src/api/ = API  
src/constants/ = config  
src/utils/ = helpers  

## Rules
- Backend authoritative for scoring/game logic
- Keep UI responsive (no fixed heights unless required)
- Preserve auth/session flow
- Mirror shared constants carefully
- Make minimal, scoped changes only
