# PRD.md — Product Requirements Document
# Threadify Social Media Platform

| Field        | Detail                              |
|--------------|-------------------------------------|
| Version      | 1.0.0                               |
| Status       | Active Development                  |
| Date         | March 2, 2026                       |
| Timeline     | March 2, 2026 – June 9, 2026        |
| Budget       | Rp 16,975,000                       |
| Owner        | Threadify Project Team              |

---

## 1. Executive Summary

Threadify is an Indonesian social media platform built as a Progressive Web App (PWA) that provides a safe, filtered digital ecosystem for all demographics. The platform's core differentiator is a proactive two-layer AI moderation system that intercepts toxic content — hate speech, SARA (Suku, Agama, Ras, Antar-golongan), cyberbullying, NSFW content, and buzzer manipulation — before it ever reaches the public feed.

Unlike existing platforms that rely on reactive user reports, Threadify's moderation engine analyzes every piece of content in milliseconds upon submission, creating a fundamentally safer user experience. Combined with phone-OTP-based identity verification, the platform structurally prevents bot and buzzer account creation at the registration level.

---

## 2. Problem Statement

### 2.1 Current State of Indonesian Social Media

The Indonesian digital social media ecosystem is dominated by foreign platforms that lack culturally-sensitive moderation for local context (Indonesian slang, SARA issues, local political dynamics). The existing ecosystem suffers from:

- **Unfiltered negative content:** hate speech, cyberbullying, NSFW content published instantly without pre-screening.
- **Bot & buzzer proliferation:** email-only or third-party OAuth registration enables mass creation of anonymous/fake accounts for influence operations.
- **Reactive-only moderation:** content is only reviewed after it has already been seen by the public, causing harm before removal.
- **Contextual blindness:** basic keyword blocklists fail to understand Indonesian slang, abbreviations, and implicit context.

### 2.2 Opportunity

This landscape creates a strategic market opportunity for Threadify to become Indonesia's first social media platform with proactive AI content moderation, offering:
- A guaranteed safe space for all demographics including minors.
- A structurally bot-resistant ecosystem.
- Contextually-aware moderation that understands Indonesian language nuances.

---

## 3. Goals & Success Metrics

### 3.1 Project Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Complete PWA architecture | Lighthouse PWA score ≥ 90 at launch |
| G2 | Implement AI moderation engine | 100% of posts/comments pass through moderation pipeline |
| G3 | Block bots at registration | 0 accounts registered without valid phone OTP |
| G4 | Deliver within timeline | All features complete by June 9, 2026 |
| G5 | Stay within budget | Total spend ≤ Rp 16,975,000 |
| G6 | UU PDP compliance | Pass compliance audit before launch |

### 3.2 Key Performance Indicators

| KPI | Target |
|-----|--------|
| Content moderation accuracy (AI) | ≥ 85% precision on toxic content detection |
| Moderation response time | ≤ 3 seconds per submission |
| Page load time (LCP) | < 2.5 seconds |
| PWA installability | 100% of modern mobile browsers |
| Registration completion rate | ≥ 70% (phone OTP funnel) |

---

## 4. User Personas

### 4.1 Persona A — General User ("Rara", 22, University Student)
- **Goal:** Share daily thoughts, photos, and interact with friends in a safe environment.
- **Frustration:** Constantly encountering hate comments and toxic content on other platforms.
- **Expectation:** Posts and comments are safe to read; personal data is protected.

### 4.2 Persona B — Content Creator ("Budi", 28, Freelancer)
- **Goal:** Build an audience and share professional content without fear of bot attacks or competitor sabotage.
- **Frustration:** Buzz farming and bot accounts drowning genuine engagement on other platforms.
- **Expectation:** Authentic engagement, transparent moderation, and the ability to appeal unfair strikes.

### 4.3 Persona C — Concerned Parent ("Sari", 40, Parent)
- **Goal:** Allow her teenage child to use social media without exposure to harmful content.
- **Frustration:** No platform currently guarantees pre-filtered content before publication.
- **Expectation:** Zero NSFW or SARA content in the feed; platform does not rely on her child to "report" harm.

---

## 5. Scope

### 5.1 In Scope

| Category | Features Included |
|----------|------------------|
| Authentication | Phone OTP registration, login, session management, logout |
| User Profile | Create profile, view profile, edit profile, delete account |
| Posts | Create post (text + image), read feed, read single post, edit post, delete post |
| Comments | Create comment, read comments on post, edit comment, delete comment |
| Interactions | Like / unlike post |
| Moderation | Layer 1 rule-based filter, Layer 2 Claude AI analysis, strike issuance |
| Reporting | User reports on posts, report management |
| Appeals | Submit appeal on strike, view appeal status |
| PWA | Installability, offline fallback, service worker, web manifest |
| Compliance | UU PDP data export, account deletion, privacy policy, consent |

### 5.2 Out of Scope

| Category | Exclusion |
|----------|-----------|
| Platform | No native iOS / Android app |
| Platform | No desktop application |
| Features | No Direct Message (DM) |
| Features | No Private Group Chat |
| Monetization | No Live Streaming |
| Monetization | No E-commerce integration |
| Monetization | No programmatic advertising system |
| Operations | No digital marketing content execution |

---

## 6. Functional Requirements

### FR-01 — User Registration
**Actor:** User  
**Description:** The system allows users to create a new account via phone number OTP verification.

**Acceptance Criteria:**
- User inputs name, username, and phone number on the registration form.
- System sends OTP via SMS to the provided phone number.
- User inputs 6-digit OTP within a 5-minute expiry window.
- On successful OTP verification, user account and profile record are created.
- If OTP expires or fails 3 times, user must request a new OTP.
- Duplicate phone numbers are rejected with clear error messaging.
- User must accept Privacy Policy and Terms of Service via checkbox (UU PDP compliance).

---

### FR-02 — User Account Management (Read, Update, Delete)
**Actor:** User  
**Description:** The system allows users to manage their own account and profile.

**Acceptance Criteria:**
- User can view their own profile (avatar, bio, post count, posts list).
- User can edit: display name, username, bio, and profile photo.
- Username changes are limited to once every 30 days.
- User can permanently delete their account; all associated data (posts, comments, likes) is soft-deleted and purged within 30 days (UU PDP compliance).
- User can export their data (posts, comments) as JSON (UU PDP compliance).

---

### FR-03 — Create Post
**Actor:** User  
**Description:** The system allows authenticated users to create posts containing text and/or images.

**Acceptance Criteria:**
- Post composer accepts plain text (max 500 characters) and/or up to 4 images.
- Supported image formats: JPEG, PNG, WebP. Max size per image: 5MB.
- Upon submission, content is routed through the two-layer moderation pipeline **before** publishing.
- If moderation verdict is `"safe"`: post is published to the public feed immediately.
- If moderation verdict is `"toxic"`: post is blocked, strike is issued, and user is notified with educational warning.
- User sees a loading state during moderation processing (max 3 seconds).

---

### FR-04 — View Feed
**Actor:** User  
**Description:** The system displays a chronological feed of all published posts to all users (authenticated and unauthenticated).

**Acceptance Criteria:**
- Feed displays posts in reverse-chronological order (newest first).
- Feed is paginated — 20 posts per page with infinite scroll.
- Each post card shows: author avatar, author display name, timestamp, content (text + images), like count, comment count, and report button.
- Feed updates in near-real-time without full page reload.
- Unauthenticated users can view the feed but cannot like, comment, or post.

---

### FR-05 — Post Management
**Actor:** User  
**Description:** The system allows users to manage their own posts.

**Acceptance Criteria:**
- User can edit the text content of their own post (edit history not displayed).
- Edited posts re-enter the moderation pipeline before re-publishing.
- User can delete their own post; deleted posts are removed from the feed immediately.
- Users cannot edit or delete posts belonging to other users.

---

### FR-06 — Create & View Comments
**Actor:** User  
**Description:** The system allows authenticated users to comment on any published post, and all users to view comments.

**Acceptance Criteria:**
- Comments are limited to plain text, max 300 characters.
- Upon submission, comment text is routed through the two-layer moderation pipeline **before** displaying.
- If moderation verdict is `"safe"`: comment appears under the post immediately.
- If moderation verdict is `"toxic"`: comment is blocked, strike is issued, user is notified.
- Comments are displayed in chronological order (oldest first) under the post.

---

### FR-07 — Comment Management
**Actor:** User  
**Description:** The system allows users to manage their own comments.

**Acceptance Criteria:**
- User can edit their own comment (edited comments re-enter moderation pipeline).
- User can delete their own comment.
- Users cannot edit or delete comments by other users.

---

### FR-08 — Like / Unlike Post
**Actor:** User  
**Description:** The system allows authenticated users to express support for a post via a like toggle.

**Acceptance Criteria:**
- Authenticated users can like a post; like count increments by 1.
- Liking the same post again removes the like (toggle behavior).
- Like count is visible to all users (authenticated and unauthenticated).
- User cannot like their own post.

---

### FR-09 — Report Post
**Actor:** User  
**Description:** The system allows users to report posts they believe violate community guidelines.

**Acceptance Criteria:**
- Report button is visible on every post card (excluding the user's own posts).
- User selects a report category: hate speech, SARA, NSFW, spam/buzzer, misinformation, other.
- User may add an optional text description (max 200 characters).
- Each user can submit only one report per post.
- Submitted reports are stored with status `"pending"`.
- User sees confirmation that their report has been submitted.

---

### FR-10 — AI Moderation — Proactive Strike System
**Actor:** AI System  
**Description:** The system automatically intercepts toxic content before publication and issues strikes to violating users.

**Acceptance Criteria:**
- **Layer 1 (Rule-Based):** Content is checked against a pre-defined blocklist of prohibited terms (hate speech, SARA, NSFW keywords). Match = immediate block.
- **Layer 2 (Claude AI):** Content that passes Layer 1 is analyzed by Google Gemini API for contextual toxicity, implicit hate, slang, and intent. Analysis completes within 3 seconds.
- On `"toxic"` verdict: content is not published; a `strike` record is created with `verdict`, `confidence`, `reason`, and `timestamp`.
- User receives an in-app notification with: the reason for the strike, the educational message, their current strike count, and a link to appeal.
- Strike escalation:
  - Strike 1: Warning only
  - Strike 2: 24-hour post restriction
  - Strike 3: 72-hour account suspension
  - Strike 4+: Permanent ban (flagged for admin review)
- On moderation API timeout (>3 seconds): content is held as `"pending_review"` and not published.

---

### FR-11 — Appeal System
**Actor:** User  
**Description:** The system allows users to contest a strike issued by the AI moderation system.

**Acceptance Criteria:**
- User can view the details of each strike from their strike history page.
- User can submit one appeal per strike via a form with: reason text (max 500 characters) and optional context.
- Appeal record is created with status `"pending"`.
- User can view the status of their appeal: `"pending"`, `"approved"`, `"rejected"`.
- On appeal approval: associated strike is marked as resolved; restrictions (if any) are lifted.
- On appeal rejection: strike stands; user is notified with reason.
- Users cannot submit multiple appeals for the same strike.

---

## 7. Non-Functional Requirements

### 7.1 Performance
| Requirement | Target |
|-------------|--------|
| LCP | < 2.5 seconds |
| Time to Interactive | < 3.5 seconds |
| Moderation latency | < 3 seconds |
| Feed pagination response | < 500ms |
| Image upload processing | < 5 seconds |

### 7.2 Security
- Phone OTP as the sole registration method — no email-only or anonymous registration.
- All API endpoints protected by authentication middleware.
- Row Level Security (RLS) enforced on all database tables.
- OWASP Top 10 compliance validated via penetration testing.
- All data in transit encrypted via HTTPS/TLS 1.3.

### 7.3 Compliance
- Full compliance with **UU PDP (Undang-Undang Perlindungan Data Pribadi)**.
- User consent explicitly obtained at registration.
- Right to data export and right to erasure implemented.

### 7.4 Availability
- Target uptime: 99.5% during development and beta phase.
- Graceful degradation: if moderation API is unavailable, hold content for review rather than crash.

### 7.5 Accessibility
- WCAG 2.1 Level AA compliance.
- All interactive elements are keyboard navigable.
- Minimum contrast ratio: 4.5:1 for normal text.

### 7.6 Compatibility
| Browser | Minimum Version |
|---------|----------------|
| Chrome (Android/Desktop) | 90+ |
| Safari (iOS/macOS) | 15+ |
| Firefox | 90+ |
| Edge | 90+ |

---

## 8. User Journey Maps

### 8.1 New User Registration Flow
```
Landing Page
    → Tap "Register"
    → Fill form: Name, Username, Phone Number
    → Tap "Send OTP"
    → Receive SMS OTP
    → Enter 6-digit OTP
    → Accept Privacy Policy checkbox
    → Account created → redirected to Feed
```

### 8.2 Post Creation with Moderation (Safe Path)
```
Feed Page
    → Tap "Create Post" / Compose button
    → Write text and/or upload image
    → Tap "Post"
    → [System: Layer 1 filter → Layer 2 Claude AI analysis]
    → Verdict: "safe"
    → Post appears in feed immediately
    → User sees success toast
```

### 8.3 Post Creation with Moderation (Toxic Path)
```
Feed Page
    → Tap "Create Post"
    → Write text (contains toxic content)
    → Tap "Post"
    → [System: Layer 1 or Layer 2 detects toxicity]
    → Post blocked — NOT published
    → User sees Strike Warning modal:
        - Reason for strike
        - Current strike count
        - Educational message
        - "Appeal this decision" button
    → User may tap "Appeal" → Appeal Form
```

### 8.4 Appeal Flow
```
Strike Warning / Strike History Page
    → Tap "Appeal this decision"
    → View strike detail (blocked content, reason, confidence)
    → Fill appeal form (reason, optional context)
    → Submit appeal
    → Appeal status: "Pending"
    → [Admin/AI reviews appeal]
    → User receives notification: "Approved" or "Rejected"
    → If Approved: strike count decreases, restrictions lifted
```

---

## 9. Assumptions & Dependencies

| # | Item | Type |
|---|------|------|
| A1 | Supabase phone OTP is available and configured in the target region | Assumption |
| A2 | Google Gemini API has sufficient rate limits and quota for beta traffic | Assumption |
| A3 | The moderation blocklist (Layer 1) will be maintained and updated by the content team | Assumption |
| D1 | Google Gemini API — for Layer 2 AI moderation | External Dependency |
| D2 | Supabase — for database, auth, storage, realtime | External Dependency |
| D3 | Vercel or equivalent — for Next.js hosting and edge functions | External Dependency |
| D4 | SMS provider (Twilio/local) — for OTP delivery | External Dependency |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini API downtime | Low | High | Implement fallback: hold content as "pending_review" |
| OTP SMS delivery failure in certain regions | Medium | High | Provide OTP resend with 60-second cooldown; escalation path |
| AI false positives blocking legitimate content | Medium | Medium | Appeal system + admin review queue |
| Budget overrun due to API costs | Medium | High | Monitor API usage per feature; implement cost alerts |
| UU PDP non-compliance | Low | Critical | Legal review before launch; data flow audit |
| Penetration test revealing critical vulnerability | Medium | Critical | Fix-before-launch policy; scope pen-test early |

---

## 11. Milestones

| Milestone | Target Date | Deliverables |
|-----------|-------------|--------------|
| M1 — Foundation | March 23, 2026 | Project setup, Supabase schema, auth (OTP), base PWA config |
| M2 — Core Features | April 13, 2026 | Feed, post CRUD, comment CRUD, like system |
| M3 — Moderation Engine | April 27, 2026 | Layer 1 filter, Layer 2 Claude integration, strike system |
| M4 — Appeal & Reports | May 11, 2026 | Report system, appeal flow, user notifications |
| M5 — Compliance & Security | May 25, 2026 | UU PDP features, pen-test, security hardening |
| M6 — Launch Ready | June 9, 2026 | Final QA, performance optimization, production deployment |
