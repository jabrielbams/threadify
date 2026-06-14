# ERD.md — Entity Relationship Diagram
# Threadify Database Schema

> Database: Supabase (PostgreSQL)
> All tables use UUID primary keys and include `created_at` timestamps.
> Row Level Security (RLS) is enabled on all tables.

---

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         THREADIFY — ERD                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   auth.users     │         │      profiles        │
│  (Supabase Auth) │         │                      │
├──────────────────┤ 1     1 ├──────────────────────┤
│ id (UUID) PK     │────────▶│ id (UUID) PK         │
│ phone            │         │ user_id (UUID) FK     │
│ created_at       │         │ username (UNIQUE)     │
└──────────────────┘         │ display_name         │
                             │ bio                  │
                             │ avatar_url           │
                             │ is_banned            │
                             │ ban_expires_at       │
                             │ post_restricted_until│
                             │ username_changed_at  │
                             │ created_at           │
                             │ updated_at           │
                             └──────────┬───────────┘
                                        │ 1
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              │                         │                          │
              │ 1:N                     │ 1:N                      │ 1:N
              ▼                         ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│        posts        │   │       strikes        │   │      appeals        │
├─────────────────────┤   ├─────────────────────┤   ├─────────────────────┤
│ id (UUID) PK        │   │ id (UUID) PK         │   │ id (UUID) PK        │
│ author_id FK        │   │ user_id FK           │   │ user_id FK          │
│ content (TEXT)      │   │ content_type (ENUM)  │   │ strike_id FK        │
│ image_urls (ARRAY)  │   │ content_id (UUID)    │   │ reason (TEXT)       │
│ is_published (BOOL) │   │ layer_triggered (INT)│   │ status (ENUM)       │
│ is_deleted (BOOL)   │   │ ai_verdict           │   │ admin_note          │
│ moderation_status   │   │ ai_confidence        │   │ reviewed_at         │
│ created_at          │   │ ai_reason (TEXT)     │   │ created_at          │
│ updated_at          │   │ strike_number (INT)  │   │ updated_at          │
└──────────┬──────────┘   │ is_resolved (BOOL)   │   └─────────────────────┘
           │              │ resolved_at          │             ▲
           │              │ created_at           │             │ 1:1
           │              └──────────────────────┘             │
           │                                       ┌───────────┘
           │ 1:N
           ├─────────────────────────────┐
           │                             │
           │ 1:N                         │ 1:N
           ▼                             ▼
┌──────────────────────┐   ┌──────────────────────┐
│       comments       │   │        likes          │
├──────────────────────┤   ├──────────────────────┤
│ id (UUID) PK         │   │ id (UUID) PK          │
│ post_id FK           │   │ post_id FK            │
│ author_id FK         │   │ user_id FK            │
│ content (TEXT)       │   │ created_at            │
│ is_deleted (BOOL)    │   └──────────────────────┘
│ moderation_status    │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────────┐
│         reports          │
├──────────────────────────┤
│ id (UUID) PK             │
│ reporter_id FK           │
│ post_id FK               │
│ category (ENUM)          │
│ description (TEXT)       │
│ status (ENUM)            │
│ resolved_at              │
│ created_at               │
└──────────────────────────┘
```

---

## 2. Table Definitions

### 2.1 `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on user signup.

```sql
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id               UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username              VARCHAR(30) UNIQUE NOT NULL,
  display_name          VARCHAR(60) NOT NULL,
  bio                   TEXT DEFAULT '',
  avatar_url            TEXT,
  is_banned             BOOLEAN DEFAULT FALSE,
  ban_expires_at        TIMESTAMPTZ,           -- NULL = permanent ban
  post_restricted_until TIMESTAMPTZ,           -- for strike-2 restriction
  username_changed_at   TIMESTAMPTZ,           -- enforce 30-day cooldown
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
CONSTRAINT username_length CHECK (char_length(username) >= 3),
CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
```

**RLS Policies:**
```sql
-- Read: anyone can view any profile
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);

-- Update: only the owner can update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### 2.2 `posts`
Stores all user-submitted posts. Only records with `is_published = TRUE` appear in the public feed.

```sql
CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           TEXT,                        -- max 500 chars (enforced in app)
  image_urls        TEXT[] DEFAULT ARRAY[]::TEXT[], -- max 4 URLs
  is_published      BOOLEAN DEFAULT FALSE,        -- set TRUE only after safe moderation
  is_deleted        BOOLEAN DEFAULT FALSE,        -- soft delete
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'safe', 'toxic', 'pending_review')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: post must have at least text or an image
CONSTRAINT post_has_content CHECK (
  content IS NOT NULL AND char_length(content) > 0
  OR array_length(image_urls, 1) > 0
)
```

**Indexes:**
```sql
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE is_published = TRUE AND is_deleted = FALSE;
```

**RLS Policies:**
```sql
-- Read: anyone can view published, non-deleted posts
CREATE POLICY "posts_read_published" ON posts FOR SELECT
  USING (is_published = TRUE AND is_deleted = FALSE);

-- Insert: only authenticated users
CREATE POLICY "posts_insert_auth" ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Update/Delete: only the author
CREATE POLICY "posts_modify_own" ON posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  USING (auth.uid() = author_id);
```

---

### 2.3 `comments`
Stores comments on posts. Follows same moderation pipeline as posts.

```sql
CREATE TABLE comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           TEXT NOT NULL,               -- max 300 chars (enforced in app)
  is_deleted        BOOLEAN DEFAULT FALSE,
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'safe', 'toxic', 'pending_review')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_comments_post_id ON comments(post_id)
  WHERE is_deleted = FALSE;
```

**RLS Policies:**
```sql
CREATE POLICY "comments_read_safe" ON comments FOR SELECT
  USING (moderation_status = 'safe' AND is_deleted = FALSE);

CREATE POLICY "comments_insert_auth" ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_modify_own" ON comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  USING (auth.uid() = author_id);
```

---

### 2.4 `likes`
Stores post likes. One like per user per post enforced by unique constraint.

```sql
CREATE TABLE likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (post_id, user_id)   -- prevent duplicate likes
);
```

**RLS Policies:**
```sql
CREATE POLICY "likes_read_all" ON likes FOR SELECT USING (true);

CREATE POLICY "likes_insert_auth" ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own" ON likes FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 2.5 `strikes`
Records every moderation action taken by the AI system. Linked to a specific post or comment.

```sql
CREATE TYPE content_type_enum AS ENUM ('post', 'comment');

CREATE TABLE strikes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content_type    content_type_enum NOT NULL,
  content_id      UUID NOT NULL,                -- references posts.id or comments.id
  layer_triggered SMALLINT NOT NULL CHECK (layer_triggered IN (1, 2)),
  ai_verdict      VARCHAR(20) DEFAULT 'toxic',
  ai_confidence   DECIMAL(4,3),                 -- 0.000 to 1.000
  ai_reason       TEXT,
  strike_number   SMALLINT NOT NULL,            -- cumulative strike count for this user
  is_resolved     BOOLEAN DEFAULT FALSE,        -- TRUE if appeal approved
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_strikes_user_id ON strikes(user_id);
CREATE INDEX idx_strikes_unresolved ON strikes(user_id) WHERE is_resolved = FALSE;
```

**RLS Policies:**
```sql
-- User can read their own strikes
CREATE POLICY "strikes_read_own" ON strikes FOR SELECT
  USING (auth.uid() = user_id);

-- Only system (service_role) can insert strikes
-- No direct user insert allowed
```

---

### 2.6 `appeals`
Stores user appeals against strikes. One appeal per strike.

```sql
CREATE TYPE appeal_status_enum AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE appeals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  strike_id   UUID NOT NULL UNIQUE REFERENCES strikes(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,                    -- max 500 chars (enforced in app)
  status      appeal_status_enum DEFAULT 'pending',
  admin_note  TEXT,                             -- optional note from reviewer
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
```sql
-- User can read and insert their own appeals
CREATE POLICY "appeals_read_own" ON appeals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "appeals_insert_own" ON appeals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User cannot update their own appeal after submission
-- Only service_role can update (admin action)
```

---

### 2.7 `reports`
Stores user reports on posts for community flagging.

```sql
CREATE TYPE report_category_enum AS ENUM (
  'hate_speech', 'sara', 'nsfw', 'spam_buzzer', 'misinformation', 'other'
);

CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category     report_category_enum NOT NULL,
  description  TEXT,                            -- max 200 chars
  status       report_status_enum DEFAULT 'pending',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (reporter_id, post_id)               -- one report per user per post
);
```

**RLS Policies:**
```sql
-- User can insert reports
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- User can read only their own reports
CREATE POLICY "reports_read_own" ON reports FOR SELECT
  USING (auth.uid() = reporter_id);
```

---

## 3. Enumerations Summary

| Enum | Values |
|------|--------|
| `moderation_status` | `pending`, `safe`, `toxic`, `pending_review` |
| `content_type_enum` | `post`, `comment` |
| `appeal_status_enum` | `pending`, `approved`, `rejected` |
| `report_category_enum` | `hate_speech`, `sara`, `nsfw`, `spam_buzzer`, `misinformation`, `other` |
| `report_status_enum` | `pending`, `reviewed`, `resolved`, `dismissed` |

---

## 4. Relationships Summary

| Table A | Relationship | Table B | Foreign Key |
|---------|-------------|---------|-------------|
| auth.users | 1:1 | profiles | profiles.user_id |
| profiles | 1:N | posts | posts.author_id |
| profiles | 1:N | comments | comments.author_id |
| profiles | 1:N | likes | likes.user_id |
| profiles | 1:N | strikes | strikes.user_id |
| profiles | 1:N | appeals | appeals.user_id |
| profiles | 1:N | reports | reports.reporter_id |
| posts | 1:N | comments | comments.post_id |
| posts | 1:N | likes | likes.post_id |
| posts | 1:N | reports | reports.post_id |
| strikes | 1:1 | appeals | appeals.strike_id |

---

## 5. Database Triggers

### 5.1 Auto-create profile on registration
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, username, display_name)
  VALUES (
    NEW.id,
    NEW.id,
    -- temporary username from phone (sanitized), user must update on first login
    'user_' || substr(replace(NEW.phone, '+', ''), 1, 8),
    'New User'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5.2 Auto-update `updated_at` timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.3 Enforce one appeal per strike
> Handled via `UNIQUE (strike_id)` constraint on the `appeals` table.

### 5.4 Enforce one like per user per post
> Handled via `UNIQUE (post_id, user_id)` constraint on the `likes` table.

### 5.5 Enforce one report per user per post
> Handled via `UNIQUE (reporter_id, post_id)` constraint on the `reports` table.

---

## 6. Storage Buckets (Supabase Storage)

| Bucket Name | Access | Purpose |
|-------------|--------|---------|
| `post-images` | Public read / Auth write | Post image uploads |
| `avatars` | Public read / Auth write | Profile avatar uploads |

```sql
-- Storage RLS: user can only upload to their own folder
-- Bucket policy for post-images:
-- Allow upload: auth.uid()::text = (storage.foldername(name))[1]
-- Allow read: true (public)
```
