# Platform Migration Plan – Set-Up Nicely

## Purpose

This document outlines how the Set-Up Nicely platform can transition away from key services (Firebase, Finnhub, Vite, etc.) with minimal disruption. The app is built with modular service wrappers and abstracted API layers to support easy replacement of infrastructure providers.

---

## 🔧 Hosting Migration (Frontend)

- **Current**: Cloudflare Pages via GitHub CI/CD
- **Alternative Options**: Vercel, Netlify, Firebase Hosting
- **Plan**:
  - Switch DNS to new platform
  - Update `vite.config.ts` and build output (`dist/`)
  - Adjust GitHub deployment workflows
  - No changes required to app code

---

## 🔐 Authentication Migration

- **Current**: Firebase Auth
- **Alternatives**: Auth0, Clerk, Supabase Auth
- **Plan**:
  - Swap `authService.ts` to match new provider SDK
  - Update `UserContext.tsx` to use new `onAuthStateChanged` equivalent
  - Keep role management logic the same (from Firestore or new DB)

---

## 📁 Database Migration

- **Current**: Firebase Firestore
- **Alternatives**: Supabase (Postgres), PlanetScale, MongoDB Atlas
- **Plan**:
  - Replace Firestore logic inside `dbService.ts` and `firestoreService.ts`
  - Keep route logic, PVS logic, and journal UI untouched
  - Migrate data schema (user roles, scan logs, journal entries)

---

## 📊 Market Data Migration

- **Current**: Finnhub API (Free Tier)
- **Optional Upgrade**: Polygon.io (Advanced Tier)
- **Plan**:
  - Use `marketDataService.ts` to switch APIs without touching scan engine logic
  - Update `scanRunner.ts` and `getScanTriggers.ts` to plug in new data endpoints
  - Maintain `CandleData` interface for consistent handling

---

## 🔄 Scan Engine Upgrade Path

- Abstracted scan functions (e.g., `emaCross`, `volumeSurge`) reside in `/src/logic/`
- Predictive Validity Scoring logic (`pvsScoring.ts`) is decoupled from specific APIs
- Switching logic or scan sources only requires edits to `marketDataService.ts` and `scanRunner.ts`

---

## 📦 PWA or Native App Migration

- **Current**: Web-based (PWA-eligible via Vite)
- **Options**: Capacitor (PWA to native), React Native (full rebuild)
- **Plan**:
  - Wrap existing UI using Capacitor for native builds
  - Firebase and REST APIs remain unchanged
  - Add platform-specific push notification logic later if needed

---

## ✅ Summary

The Set-Up Nicely platform is designed with modularity in mind. All services are abstracted through internal service layers, allowing the app to pivot providers with minimal code changes.

