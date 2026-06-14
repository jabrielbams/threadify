# ARCHITECTURE.md — System Architecture
# Threadify Social Media Platform

| Version | 1.0.0 |
|---------|-------|
| Stack | Next.js 14 + Supabase + TailwindCSS |
| Deployment | Vercel (Next.js) + Supabase Cloud (Southeast Asia region) |

---

## 1. High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│                                                                     │
│   Browser / Mobile Browser (PWA Installed)                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Next.js App (React)  ←→  TailwindCSS UI                   │   │
│   │  Service Worker (offline support, caching)                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────▼─────────────────────────────────────────┐
│                       SERVER LAYER                                  │
│                                                                     │
│   Vercel Edge Network                                               │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  Next.js Server (App Router)                               │    │
│   │  ├── React Server Components (RSC) — data fetching        │    │
│   │  ├── Server Actions — mutations, form handling            │    │
│   │  ├── API Routes — /api/moderation, /api/reports           │    │
│   │  └── Middleware — auth session check, rate limiting       │    │
│   └────────────────────────────────────────────────────────────┘    │
└──────────┬───────────────────────────────────────┬──────────────────┘
           │                                       │
           │ Supabase SDK                          │ Google AI SDK
┌──────────▼──────────────────┐    ┌──────────────▼───────────────────┐
│      SUPABASE LAYER         │    │       AI MODERATION LAYER        │
│                             │    │                                  │
│  ┌───────────────────────┐  │    │  ┌────────────────────────────┐  │
│  │  PostgreSQL Database  │  │    │  │  Layer 1: Rule-Based Filter│  │
│  │  (RLS enabled)        │  │    │  │  (Regex + Blocklist)       │  │
│  └───────────────────────┘  │    │  └──────────┬─────────────────┘  │
│  ┌───────────────────────┐  │    │             │ if passes          │
│  │  Auth (Phone OTP)     │  │    │  ┌──────────▼─────────────────┐  │
│  └───────────────────────┘  │    │  │  Layer 2: Gemini API       │  │
│  ┌───────────────────────┐  │    │  │  (Meta Prompting / NLP)    │  │
│  │  Storage (images)     │  │    │  └──────────┬─────────────────┘  │
│  └───────────────────────┘  │    │             │                    │
│  ┌───────────────────────┐  │    │  ┌──────────▼─────────────────┐  │
│  │  Realtime (feed sync) │  │    │  │  Decision Gate             │  │
│  └───────────────────────┘  │    │  │  safe → publish            │  │
└─────────────────────────────┘    │  │  toxic → strike + block    │  │
                                   │  └────────────────────────────┘  │
                                   └──────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Architecture (Next.js App Router)

```
app/
│
├── (auth)/                          # Public auth routes — no main layout
│   ├── login/
│   │   └── page.tsx                 # RSC: phone input form
│   ├── register/
│   │   └── page.tsx                 # RSC: registration form
│   └── verify-otp/
│       └── page.tsx                 # Client: OTP input with countdown
│
├── (main)/                          # Protected routes — main layout
│   ├── layout.tsx                   # Navbar, bottom nav (mobile), sidebar
│   ├── feed/
│   │   ├── page.tsx                 # RSC: server-rendered feed
│   │   └── loading.tsx              # Skeleton loader
│   ├── profile/
│   │   └── [username]/
│   │       ├── page.tsx             # RSC: public profile view
│   │       └── edit/
│   │           └── page.tsx         # Client: profile edit form
│   ├── post/
│   │   └── [id]/
│   │       └── page.tsx             # RSC: post detail + comments
│   ├── strikes/
│   │   └── page.tsx                 # Client: user's strike history
│   ├── appeals/
│   │   ├── page.tsx                 # Client: appeal status list
│   │   └── [strikeId]/
│   │       └── page.tsx             # Client: appeal submission form
│   └── reports/
│       └── page.tsx                 # Client: user's report history
│
├── api/
│   ├── moderation/
│   │   └── route.ts                 # POST: run moderation pipeline
│   ├── reports/
│   │   └── route.ts                 # POST: submit report
│   └── appeals/
│       └── route.ts                 # POST: submit appeal
│
└── offline/
    └── page.tsx                     # PWA offline fallback
```

### 2.2 Component Hierarchy

```
RootLayout
├── AuthProvider (Supabase session context)
└── (main)/Layout
    ├── Navbar
    │   ├── Logo
    │   ├── SearchBar
    │   └── UserMenu (avatar, profile link, logout)
    ├── Main Content (route-specific)
    │   ├── FeedPage
    │   │   ├── PostComposer
    │   │   │   ├── TextArea
    │   │   │   ├── ImageUploader
    │   │   │   └── SubmitButton (triggers moderation)
    │   │   └── FeedList
    │   │       └── PostCard (x N)
    │   │           ├── AuthorInfo
    │   │           ├── PostContent
    │   │           ├── PostImages
    │   │           └── PostActions (like, comment, report)
    │   ├── PostDetailPage
    │   │   ├── PostCard
    │   │   ├── CommentComposer (triggers moderation)
    │   │   └── CommentList
    │   │       └── CommentItem (x N)
    │   └── StrikesPage
    │       └── StrikeCard (x N)
    │           └── AppealButton
    └── BottomNav (mobile only)
        ├── HomeIcon → /feed
        ├── SearchIcon → /search
        ├── ComposeIcon → PostComposer modal
        ├── NotificationsIcon
        └── ProfileIcon → /profile/[username]
```

---

## 3. Content Moderation Pipeline — Detailed Flow

```
┌────────────────────────────────────────────────────────────┐
│               MODERATION PIPELINE                          │
│                                                            │
│  User submits content (post or comment)                    │
│         │                                                  │
│         ▼                                                  │
│  [API Route: POST /api/moderation]                         │
│  Authenticate session → validate input → call pipeline     │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────────────────────────────────┐               │
│  │  LAYER 1: Rule-Based Filter              │               │
│  │  lib/ai/rule-filter.ts                   │               │
│  │                                          │               │
│  │  1. Normalize text (lowercase, trim)     │               │
│  │  2. Check against blocklist in           │               │
│  │     constants/moderation.ts              │               │
│  │  3. Regex patterns for SARA, hate,       │               │
│  │     NSFW keywords                        │               │
│  └──────────────────┬──────────────────────┘               │
│                     │                                      │
│            MATCH?   │                                      │
│       ┌─────────────┴──────────────┐                       │
│       │ YES                        │ NO                    │
│       ▼                            ▼                       │
│  BLOCK (Layer 1)        ┌──────────────────────────────┐   │
│  → verdict: "toxic"     │  LAYER 2: Gemini AI          │   │
│  → layer: 1             │  lib/ai/moderator.ts         │   │
│                         │                              │   │
│                         │  Prompt (meta prompting):    │   │
│                         │  - Analyze intent & context  │   │
│                         │  - Understand Indonesian     │   │
│                         │    slang & implicit hate     │   │
│                         │  - Return JSON verdict       │   │
│                         │                              │   │
│                         │  Timeout: 3 seconds          │   │
│                         └──────────────┬───────────────┘   │
│                                        │                   │
│                               VERDICT? │                   │
│              ┌────────────────────┬────┴────────┐          │
│              │ SAFE               │ TOXIC       │ TIMEOUT  │
│              ▼                    ▼             ▼          │
│         PUBLISH              BLOCK         PENDING_REVIEW  │
│         is_published         → strike      → hold content  │
│         = TRUE               created       do NOT publish  │
│                              → notify                      │
│                                user                        │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                  REGISTRATION FLOW                       │
│                                                          │
│  /register                                               │
│  User fills: name, username, phone (+62...)              │
│         │                                                │
│         ▼                                                │
│  supabase.auth.signInWithOtp({ phone })                  │
│  → SMS OTP sent to phone                                 │
│         │                                                │
│         ▼                                                │
│  /verify-otp                                             │
│  User enters 6-digit OTP                                 │
│         │                                                │
│         ▼                                                │
│  supabase.auth.verifyOtp({ phone, token, type: 'sms' })  │
│  → Session created in Supabase Auth                      │
│  → Trigger: handle_new_user() → inserts profile row      │
│         │                                                │
│         ▼                                                │
│  User redirected → /feed (or /profile/[username]/edit    │
│  to complete username setup on first login)              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                           │
│                                                          │
│  /login                                                  │
│  User enters phone number                                │
│  → supabase.auth.signInWithOtp({ phone })                │
│  → /verify-otp → verifyOtp()                             │
│  → Session restored → /feed                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               SESSION & MIDDLEWARE                       │
│                                                          │
│  middleware.ts (runs on every protected route)           │
│  1. Read session from Supabase SSR cookie                │
│  2. If no session → redirect to /login                   │
│  3. If banned → redirect to /banned                      │
│  4. If valid → continue                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow Diagrams

### 5.1 Create Post Flow
```
[Client: PostComposer]
   → User types content + uploads images
   → Taps "Post" button
   → Client sends POST /api/moderation
       { content: "...", images: [...], type: "post" }

[API Route: /api/moderation/route.ts]
   → Verify auth session
   → Run Layer 1 filter (rule-filter.ts)
   → If clean, run Layer 2 (moderator.ts → Gemini API)
   → Receive verdict

   If SAFE:
   → Insert into posts table { is_published: true, moderation_status: 'safe' }
   → Return { status: 'published', post_id: '...' }
   → Supabase Realtime broadcasts new post to feed subscribers

   If TOXIC:
   → Insert into posts table { is_published: false, moderation_status: 'toxic' }
   → Insert into strikes table { user_id, content_type: 'post', ai_verdict, ... }
   → Update profiles: increment strike count, apply restriction if threshold hit
   → Return { status: 'blocked', strike: { id, reason, strike_number } }

[Client]
   → If published: add post to feed optimistically
   → If blocked: show StrikeWarningModal with reason + appeal link
```

### 5.2 Like / Unlike Flow
```
[Client: PostCard — LikeButton]
   → User taps Like
   → Optimistic UI update (increment count)
   → Supabase client: upsert into likes (post_id, user_id)
     OR delete from likes if already liked

   → On success: confirm optimistic update
   → On error: rollback optimistic update + toast error
```

### 5.3 Real-time Feed Sync
```
[Supabase Realtime Channel]
   → Subscribe to: postgres_changes on posts table
     { event: 'INSERT', schema: 'public', table: 'posts',
       filter: 'is_published=eq.true' }

   → On new post received:
     → Prepend to feed state
     → Show "New post available" toast (optional)
```

---

## 6. API Routes Reference

| Method | Route | Auth Required | Description |
|--------|-------|---------------|-------------|
| POST | `/api/moderation` | Yes | Run two-layer moderation pipeline on content |
| POST | `/api/reports` | Yes | Submit a report on a post |
| POST | `/api/appeals` | Yes | Submit an appeal on a strike |
| GET | `/api/appeals/[id]` | Yes | Get appeal status |

> Note: Most CRUD operations (posts, comments, profiles, likes) are handled directly via Supabase client SDK with RLS enforcement — no custom API routes needed.

---

## 7. Environment Configuration

```bash
# .env.local (never commit this file)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-side only, NEVER expose to client

# Google Gemini
GEMINI_API_KEY=AIza...                  # server-side only, NEVER expose to client

# App Config
NEXT_PUBLIC_APP_URL=https://threadify.id
NEXT_PUBLIC_PWA_NAME=Threadify
```

---

## 8. PWA Configuration

```javascript
// next.config.ts (with next-pwa)
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/posts/,
      handler: 'NetworkFirst',         // Feed: always try network, fallback cache
      options: { cacheName: 'feed-cache', expiration: { maxAgeSeconds: 300 } }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\//,
      handler: 'CacheFirst',           // Images: cache first
      options: { cacheName: 'image-cache', expiration: { maxEntries: 100 } }
    }
  ]
});
```

```json
// public/manifest.json
{
  "name": "Threadify",
  "short_name": "Threadify",
  "description": "A safe social media platform for Indonesia",
  "start_url": "/feed",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#4F46E5",
  "background_color": "#FFFFFF",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 9. Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                         │
│                                                          │
│  Layer 1: Network                                        │
│  └── HTTPS/TLS 1.3 enforced by Vercel                   │
│  └── CORS: only threadify.id origin allowed              │
│  └── CSP headers in next.config.ts                       │
│                                                          │
│  Layer 2: Authentication                                 │
│  └── Phone OTP via Supabase Auth (no anonymous access)   │
│  └── JWT session managed by Supabase SSR                 │
│  └── middleware.ts validates every protected route       │
│                                                          │
│  Layer 3: Authorization (Database)                       │
│  └── Row Level Security on ALL tables                    │
│  └── Users can only access / modify their own data       │
│  └── service_role key never exposed to client            │
│                                                          │
│  Layer 4: Input Validation                               │
│  └── Zod schema validation on all API route inputs       │
│  └── Content moderation pipeline on all UGC              │
│  └── Parameterized queries via Supabase SDK              │
│                                                          │
│  Layer 5: Rate Limiting                                  │
│  └── /api/moderation: 10 req/min per user                │
│  └── Auth endpoints: 5 OTP requests/hour per phone       │
│  └── /api/reports: 20 reports/day per user               │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Infrastructure & Deployment

```
┌──────────────────────────────────────────────────────────┐
│                DEPLOYMENT ARCHITECTURE                   │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  GitHub Repo     │    │  Vercel                  │   │
│  │  main branch     │───▶│  Next.js deployment      │   │
│  │                  │    │  Edge Functions           │   │
│  │  CI/CD:          │    │  Automatic HTTPS          │   │
│  │  - lint          │    │  CDN (global)             │   │
│  │  - typecheck     │    └──────────┬───────────────┘   │
│  │  - build         │               │                   │
│  │  - e2e tests     │               │                   │
│  └──────────────────┘    ┌──────────▼───────────────┐   │
│                          │  Supabase (SEA Region)    │   │
│  ┌──────────────────┐    │  ├── PostgreSQL           │   │
│  │  Google Gemini   │    │  ├── Auth (Phone OTP)     │   │
│  │  API (Gemini AI  │◀───│  ├── Storage (images)     │   │
│  │  Moderation)     │    │  └── Realtime             │   │
│  └──────────────────┘    └──────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Deployment Pipeline:**
```
Developer pushes to feature branch
   → GitHub Actions: lint + typecheck + unit tests
   → PR opened → peer review
   → Merge to main
   → Vercel auto-deploys to production
   → Run migration: supabase db push
   → Smoke tests run against production
```

---

## 11. Tech Stack Summary

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Language | TypeScript 5 | Type safety |
| Styling | TailwindCSS 3 | Utility-first CSS |
| Database | Supabase (PostgreSQL) | Primary database |
| Auth | Supabase Auth | Phone OTP authentication |
| Storage | Supabase Storage | Image file storage |
| Realtime | Supabase Realtime | Live feed updates |
| AI Moderation | Google Gemini API (`gemini-1.5-flash`) | Layer 2 content moderation |
| Hosting | Vercel | Next.js deployment + CDN |
| PWA | next-pwa | Service worker + installability |
| Validation | Zod | Input schema validation |
| Testing (Unit) | Vitest | Unit & integration tests |
| Testing (E2E) | Playwright | End-to-end browser tests |
| Linting | ESLint + Prettier | Code quality |
| Git Hooks | Husky + lint-staged | Pre-commit checks |
| IDE / Agent | Zed AI | AI-assisted development |
