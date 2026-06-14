# AI Skills for Threadify — Zed AI Agent

> These skills define the context, capabilities, and constraints for the Zed AI coding agent
> working on the Threadify social media platform project.

---

## Project Identity

```
Project : Threadify
Stack   : Next.js 14 (App Router) + Supabase + TailwindCSS
Type    : Progressive Web App (PWA)
Goal    : Safe social media platform with AI content moderation
AI Mod  : Google Gemini API (Layer 2 Meta Prompting)
Timeline: 2 March 2026 – 9 June 2026
```

---

## Skill 1 — Next.js App Router Expert

**Trigger:** Any task involving page creation, routing, layouts, server/client components, or API routes.

### Rules
- Always use the **App Router** (`app/` directory). Never use `pages/` directory.
- Default to **React Server Components (RSC)**. Add `"use client"` only when strictly necessary (event handlers, hooks, browser APIs).
- Co-locate components in `app/` using the folder-based routing convention.
- Use **Next.js Server Actions** for form mutations instead of standalone API routes where possible.
- Apply `loading.tsx`, `error.tsx`, and `not-found.tsx` in every major route segment.
- Use `generateMetadata()` for SEO on all public-facing pages.
- PWA: maintain `manifest.json` and service worker via `next-pwa` configuration.

### File Structure Convention
```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (main)/
    feed/page.tsx
    profile/[username]/page.tsx
    post/[id]/page.tsx
  api/
    moderation/route.ts
    reports/route.ts
components/
  ui/           # Reusable primitives (Button, Input, Modal)
  feed/         # Feed-specific components
  post/         # Post card, composer
  profile/      # Avatar, profile header
  moderation/   # Strike notice, appeal form
lib/
  supabase/     # Client, server, middleware helpers
  ai/           # Gemini API moderation wrapper
  utils/        # cn(), formatDate(), etc.
hooks/          # Custom React hooks
types/          # Global TypeScript types & interfaces
```

---

## Skill 2 — Supabase Integration Expert

**Trigger:** Any task involving database queries, authentication, storage, real-time, or Row Level Security.

### Rules
- Always use **typed Supabase client** generated from `supabase gen types typescript`.
- Use **server-side Supabase client** (`createServerClient`) in Server Components and Server Actions.
- Use **browser Supabase client** (`createBrowserClient`) only in Client Components.
- All database mutations must go through **Row Level Security (RLS) policies** — never disable RLS.
- Phone OTP authentication flow: use `supabase.auth.signInWithOtp({ phone })` — never bypass this.
- File uploads (post images) go to Supabase Storage bucket `post-images` with public read, authenticated write policy.
- Use Supabase **Realtime** for live feed updates via `channel().on('postgres_changes', ...)`.

### Auth Flow
```
Register  → signInWithOtp (phone) → verify OTP → create profile record
Login     → signInWithOtp (phone) → verify OTP → session established
Protected routes → middleware.ts checks session → redirect if unauthenticated
```

### Key Tables (reference ERD.md for full schema)
```
users, profiles, posts, comments, likes, reports, strikes, appeals
```

---

## Skill 3 — TailwindCSS Styling Expert

**Trigger:** Any task involving UI components, layouts, responsive design, or styling.

### Rules
- Use **TailwindCSS utility classes only** — no inline styles, no CSS modules unless absolutely necessary.
- Follow **mobile-first** responsive design: `base → sm → md → lg → xl`.
- Use `cn()` helper (from `clsx` + `tailwind-merge`) for conditional class merging.
- Define design tokens in `tailwind.config.ts` under `theme.extend` — never hardcode color hex values in components.
- Dark mode via `class` strategy in Tailwind config.
- Animations: use Tailwind's built-in `animate-*` classes; avoid raw CSS `@keyframes` unless unavoidable.

### Design System Tokens (Threadify Brand)
```typescript
// tailwind.config.ts — theme.extend.colors
colors: {
  brand: {
    primary:   '#4F46E5', // Indigo-600 — main CTA, active states
    secondary: '#7C3AED', // Violet-600 — accents
    safe:      '#10B981', // Emerald-500 — safe content badge
    warning:   '#F59E0B', // Amber-500 — strike warning
    danger:    '#EF4444', // Red-500 — violation, report
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted:   '#F9FAFB',
    card:    '#F3F4F6',
  }
}
```

### Component Conventions
```tsx
// Always use semantic HTML
<article>  // Post card
<section>  // Feed sections
<nav>      // Navigation
<header>   // Page / component headers
<aside>    // Sidebar, notifications panel
```

---

## Skill 4 — AI Content Moderation Integration

**Trigger:** Any task involving content filtering, moderation pipeline, strike system, or appeal flow.

### Overview
Threadify uses a **two-layer moderation system** before any post or comment is published:

```
User submits content
      │
      ▼
[Layer 1] Rule-Based Filter
  • Regex/blocklist check against prohibited words (SARA, hate speech, NSFW)
  • If match → BLOCK immediately (no AI call needed)
  • If clean → proceed to Layer 2
      │
      ▼
[Layer 2] Gemini AI Meta Prompting
  • Send content to Google Gemini API for contextual analysis
  • Analyze: intent, slang, implicit hate, contextual toxicity
  • Response: { verdict: "safe" | "toxic", confidence: number, reason: string }
      │
      ▼
[Decision Gate]
  • "safe"  → publish to feed (Jalur A)
  • "toxic" → hold + issue strike + notify user (Jalur B)
```

### Gemini API Integration Pattern
```typescript
// lib/ai/moderator.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function moderateContent(content: string): Promise<ModerationResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',         // fast & cost-efficient for moderation
    generationConfig: {
      responseMimeType: 'application/json',  // enforce JSON response
      maxOutputTokens: 256,
    },
  });

  const prompt = `You are a content moderation AI for Threadify, an Indonesian social media platform.
Your task is to analyze user-generated content for toxicity, hate speech, SARA (Suku, Agama, Ras, Antar-golongan), cyberbullying, NSFW text, and manipulative content.
Consider Indonesian language, local slang, abbreviations, and implicit context.
Always respond ONLY with valid JSON: { "verdict": "safe" | "toxic", "confidence": 0.0-1.0, "reason": "brief explanation" }

Analyze this content: "${content}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as ModerationResult;
}
```

### ModerationResult Type
```typescript
// types/app.ts
export interface ModerationResult {
  verdict: 'safe' | 'toxic' | 'pending';
  confidence: number;   // 0.000 to 1.000
  reason: string;
}
```

### Recommended Gemini Model Selection
| Use Case | Model | Reason |
|----------|-------|--------|
| Moderation (production) | `gemini-1.5-flash` | Fast, cheap, sufficient for short UGC |
| Moderation (high accuracy) | `gemini-1.5-pro` | Better contextual reasoning, higher cost |
| Development / testing | `gemini-1.5-flash-8b` | Cheapest, use for dev/staging only |

### Strike System Rules
```
Strike 1 → Warning notification + content blocked
Strike 2 → Warning + 24-hour post restriction
Strike 3 → Warning + 72-hour account suspension
Strike 4+ → Permanent ban (requires admin review)
```

### Appeal Flow
```
User receives strike → views strike detail page
→ submits appeal form (reason + optional context)
→ appeal enters queue (status: "pending")
→ admin reviews → approve (strike removed) | reject (strike upheld)
→ user notified of appeal outcome
```

### Environment Variables Required
```env
GEMINI_API_KEY=AIza...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Skill 5 — Security & Compliance Expert

**Trigger:** Any task involving authentication, data handling, input validation, or regulatory compliance.

### Rules
- **OTP Phone Verification:** all registrations must go through Supabase phone OTP — no email-only registration.
- **Input Sanitization:** sanitize all user inputs server-side before database writes using `DOMPurify` (client) and manual stripping (server).
- **Rate Limiting:** apply rate limiting on all `/api/*` routes — use Supabase Edge Functions or `upstash/ratelimit`.
- **RLS Enforcement:** every Supabase table must have RLS enabled with explicit policies. Document all policies.
- **UU PDP Compliance (Indonesian Personal Data Protection Law):**
  - Never log raw user phone numbers in application logs.
  - Provide data export and account deletion (right to erasure) functionality.
  - Display privacy policy and explicit consent on registration.
  - Store data in compliant regions — prefer Supabase Southeast Asia region.
- **OWASP Top 10:** validate against SQL Injection (Supabase parameterized queries), XSS (React default escaping + DOMPurify), and CSRF (Next.js CSRF via Server Actions).
- **Penetration Testing:** document pen-test checklist in `docs/security/pentest-checklist.md`.

---

## Skill 6 — PWA Configuration Expert

**Trigger:** Any task involving PWA setup, service worker, manifest, offline support, or installability.

### Rules
- Use `next-pwa` package for service worker generation.
- `manifest.json` must include: `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, icons at `192x192` and `512x512`.
- Implement **offline fallback page** at `app/offline/page.tsx`.
- Cache strategy: **Network First** for feed API calls, **Cache First** for static assets.
- Test Lighthouse PWA score — target ≥ 90.

---

## Skill 7 — Code Quality & Testing Standards

**Trigger:** Any task involving code review, testing, linting, or CI/CD.

### Rules
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`. No `any` types allowed.
- **ESLint + Prettier** — run on every save and pre-commit via Husky.
- **Component testing** with React Testing Library for all UI components.
- **API route testing** with Vitest for all moderation and report handlers.
- **E2E testing** with Playwright for critical flows: register, post, comment, moderation, appeal.
- Every function must have JSDoc comments for parameters and return types.
- Max function length: 50 lines. Extract helper functions if exceeded.
- No hardcoded strings in components — use constants files or i18n keys.

---

## General Agent Behavior Rules

1. **Always read existing code** before writing new code — check for existing utilities in `lib/` and `hooks/`.
2. **Never create duplicate components** — search `components/` directory first.
3. **Database changes require migration files** — always generate `supabase/migrations/YYYYMMDD_description.sql`.
4. **Moderation is non-negotiable** — every content submission endpoint MUST call the moderation pipeline. Never skip it.
5. **Mobile-first always** — test all UI on 375px viewport before 1440px.
6. **Performance budget:** Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1.
7. **Commit messages** follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
