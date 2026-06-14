# RULES.md — Threadify Development Rules & Conventions

> This document defines the non-negotiable coding standards, architectural constraints,
> and workflow rules for the Threadify project. All contributors and AI agents must follow these rules.

---

## 1. Tech Stack Constraints

| Layer        | Technology              | Version  |
|--------------|-------------------------|----------|
| Framework    | Next.js (App Router)    | 14.x     |
| Backend/DB   | Supabase                | Latest   |
| Styling      | TailwindCSS             | 3.x      |
| Language     | TypeScript              | 5.x      |
| AI Moderation| Google Gemini API       | gemini-1.5-flash |
| Package Manager | pnpm               | 8.x      |
| Testing      | Vitest + Playwright     | Latest   |

**Rules:**
- Do NOT introduce new major dependencies without team discussion.
- Do NOT use `npm` or `yarn` — use `pnpm` exclusively.
- Do NOT use `pages/` directory — App Router only.
- Do NOT use JavaScript (`.js`) — TypeScript (`.ts` / `.tsx`) only.

---

## 2. Project Structure Rules

```
threadify/
├── app/                     # Next.js App Router
│   ├── (auth)/              # Auth route group (no layout)
│   │   ├── login/
│   │   ├── register/
│   │   └── verify-otp/
│   ├── (main)/              # Main app route group (with layout)
│   │   ├── feed/
│   │   ├── profile/[username]/
│   │   ├── post/[id]/
│   │   ├── strikes/
│   │   ├── appeals/
│   │   └── reports/
│   ├── api/                 # API Route Handlers
│   │   ├── moderation/
│   │   ├── reports/
│   │   └── appeals/
│   ├── offline/             # PWA offline fallback
│   ├── layout.tsx           # Root layout
│   └── globals.css
├── components/
│   ├── ui/                  # Base primitives only
│   ├── feed/
│   ├── post/
│   ├── profile/
│   ├── moderation/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Auth middleware helper
│   ├── ai/
│   │   ├── moderator.ts     # Gemini API integration
│   │   └── rule-filter.ts   # Layer 1 blocklist filter
│   └── utils/
│       ├── cn.ts            # clsx + tailwind-merge
│       └── format.ts        # Date, number formatters
├── hooks/                   # Custom React hooks
├── types/                   # Global TypeScript interfaces
│   ├── database.ts          # Generated Supabase types
│   └── app.ts               # App-specific types
├── constants/               # App-wide constants
│   └── moderation.ts        # Blocklist, strike thresholds
├── supabase/
│   ├── migrations/          # SQL migration files
│   └── seed.sql
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icons/
├── docs/
│   ├── security/
│   └── api/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Rules:**
- Never place business logic in page files (`page.tsx`) — extract to components or server actions.
- Never import server-only code in client components.
- All shared types go in `types/` — never define types inline in component files.
- Database migration files are mandatory for every schema change.

---

## 3. TypeScript Rules

```typescript
// ✅ CORRECT — explicit types, no 'any'
interface Post {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  is_published: boolean;
}

async function getPost(id: string): Promise<Post | null> {
  // ...
}

// ❌ WRONG — avoid 'any', avoid implicit types
async function getPost(id: any) {
  // ...
}
```

**Rules:**
- `"strict": true` in `tsconfig.json` — no exceptions.
- No `any` type — use `unknown` and narrow types instead.
- No non-null assertions (`!`) unless absolutely provable — prefer optional chaining (`?.`).
- All function parameters and return types must be explicitly typed.
- Use `type` for unions/primitives, `interface` for object shapes.
- Generated Supabase types in `types/database.ts` — regenerate after every migration.

---

## 4. Component Rules

```tsx
// ✅ CORRECT — named export, typed props, semantic HTML
interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  return (
    <article className="rounded-xl bg-surface-card p-4">
      {/* ... */}
    </article>
  );
}

// ❌ WRONG — default export, untyped props
export default function PostCard(props: any) {
  return <div>{/* ... */}</div>;
}
```

**Rules:**
- Use **named exports** for all components — no default exports except for Next.js pages.
- Props interface naming: `ComponentNameProps`.
- Use semantic HTML elements (`<article>`, `<section>`, `<nav>`, `<header>`, `<aside>`).
- Max component file length: **150 lines** — split into sub-components if exceeded.
- One component per file.
- `"use client"` directive only when absolutely required (event handlers, browser APIs, hooks).

---

## 5. Styling Rules

```tsx
// ✅ CORRECT — Tailwind utility classes + cn() helper
import { cn } from '@/lib/utils/cn';

<button className={cn(
  'rounded-lg px-4 py-2 font-semibold transition-colors',
  isActive ? 'bg-brand-primary text-white' : 'bg-surface-card text-gray-700'
)}>
  Post
</button>

// ❌ WRONG — inline styles
<button style={{ backgroundColor: '#4F46E5', borderRadius: '8px' }}>
  Post
</button>
```

**Rules:**
- TailwindCSS utility classes only — no inline styles, no raw CSS unless absolutely unavoidable.
- All custom design tokens defined in `tailwind.config.ts` — never hardcode hex colors.
- Mobile-first responsive: always start with mobile breakpoint, then `sm:`, `md:`, `lg:`.
- Use `cn()` utility from `lib/utils/cn.ts` for conditional class composition.
- No CSS Modules except for third-party library overrides.

---

## 6. Supabase & Database Rules

```typescript
// ✅ CORRECT — Server component uses server client
import { createServerClient } from '@/lib/supabase/server';

export default async function FeedPage() {
  const supabase = createServerClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  // ...
}

// ❌ WRONG — browser client in server component
import { createBrowserClient } from '@supabase/ssr';
```

**Rules:**
- RLS must be **enabled on all tables** — document every policy in `supabase/migrations/`.
- Never use `service_role` key in client-side code.
- All queries must be strongly typed using generated `Database` types.
- Prefer **Server Actions** for mutations — avoid client-side database writes where possible.
- Migration file naming: `YYYYMMDD_HHMMSS_description.sql`.
- Always test RLS policies with multiple user roles before merging.

---

## 7. Moderation Pipeline Rules

> **CRITICAL — These rules are non-negotiable and cannot be bypassed.**

- **Every** post and comment submission MUST pass through the two-layer moderation pipeline before publishing.
- The moderation API call happens **server-side only** — never expose Gemini API key to client.
- Layer 1 (rule-based filter) must run **before** Layer 2 (Claude AI) to avoid unnecessary API calls.
- A moderation result of `"toxic"` must ALWAYS block publication and create a `strikes` record.
- Moderation response must complete within **3 seconds** — implement timeout with fallback to "pending review" state.
- Never log the full content of blocked posts in plain text — hash or truncate for audit logs.
- Strike thresholds must be defined in `constants/moderation.ts` — never hardcode in handlers.

```typescript
// constants/moderation.ts
export const STRIKE_THRESHOLDS = {
  WARNING: 1,
  POST_RESTRICTION_24H: 2,
  ACCOUNT_SUSPENSION_72H: 3,
  PERMANENT_BAN: 4,
} as const;

export const MODERATION_TIMEOUT_MS = 3000;
```

---

## 8. Security Rules

- All user inputs must be sanitized **server-side** before database writes.
- Phone numbers must never appear in application logs — mask as `+62***XXXX`.
- Rate limiting required on: `/api/moderation`, `/api/reports`, auth endpoints.
- All `/api/*` routes must validate the user session before processing.
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to client — never put secrets there.
- CORS must be configured explicitly — no wildcard `*` origins in production.
- Implement Content Security Policy (CSP) headers in `next.config.ts`.

---

## 9. Error Handling Rules

```typescript
// ✅ CORRECT — typed errors, user-friendly messages
try {
  const result = await moderateContent(content);
  return result;
} catch (error) {
  console.error('[Moderation] Failed:', error instanceof Error ? error.message : 'Unknown error');
  // Graceful fallback — hold for manual review, do NOT publish
  return { verdict: 'pending', confidence: 0, reason: 'Moderation service unavailable' };
}

// ❌ WRONG — swallowing errors, exposing internals to user
try {
  const result = await moderateContent(content);
} catch (e) {
  return { verdict: 'safe' }; // NEVER default to safe on error
}
```

**Rules:**
- Never swallow errors silently — always log with context.
- Never expose raw error messages to client UI — show user-friendly messages.
- On moderation API failure, default to **"pending review"** not "safe".
- Use `error.tsx` boundaries on all major route segments.
- API routes must return consistent error shapes: `{ error: string, code: string }`.

---

## 10. Git & Commit Rules

```
# Conventional Commits format
feat: add phone OTP registration flow
fix: resolve moderation timeout not triggering fallback
chore: update supabase types after migration
docs: add appeal flow to ARCHITECTURE.md
refactor: extract moderation logic to lib/ai/moderator.ts
test: add e2e test for strike + appeal flow
```

**Rules:**
- Branch naming: `feat/feature-name`, `fix/issue-description`, `chore/task-name`.
- Never commit directly to `main` — all changes via Pull Request.
- PR must include: description, test coverage evidence, and Lighthouse score (for UI changes).
- Never commit `.env` files — use `.env.example` as template.
- Husky pre-commit hook must pass: `pnpm lint && pnpm typecheck`.
- Squash commits before merging to main.

---

## 11. Performance Rules

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| PWA Lighthouse Score | ≥ 90 |
| Time to Interactive | < 3.5s |

**Rules:**
- Use `next/image` for all images — never raw `<img>` tags.
- Use `next/font` for all fonts — never external font CDN links.
- Implement `Suspense` boundaries with skeleton loaders on all data-fetching components.
- Paginate feed queries — max 20 posts per page.
- Avoid client-side data fetching where server-side is possible.

---

## 12. UU PDP Compliance Rules (Indonesian Personal Data Protection Law)

- Registration must display a Privacy Policy link and require explicit checkbox consent.
- Users must be able to **export their data** (posts, comments, profile) from settings.
- Users must be able to **permanently delete their account and all associated data**.
- Phone numbers stored in Supabase must be the **only PII** — do not collect unnecessary data.
- Data retention: deleted account data must be purged within 30 days.
- Any data breach must trigger user notification per UU PDP Article 46.
- Document data flows in `docs/security/data-flow.md`.
