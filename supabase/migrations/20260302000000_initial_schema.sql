-- =============================================================================
-- Threadify -- Initial Schema Migration
-- Created: 2026-03-02
-- Description: Full database schema including tables, indexes, RLS policies,
--              triggers, and storage bucket documentation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------

CREATE TYPE content_type_enum AS ENUM ('post', 'comment');
CREATE TYPE appeal_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE report_category_enum AS ENUM (
  'hate_speech',
  'sara',
  'nsfw',
  'spam_buzzer',
  'misinformation',
  'other'
);
CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- -----------------------------------------------------------------------------
-- TABLE: profiles
-- Extends auth.users. Created automatically via trigger on user signup.
-- -----------------------------------------------------------------------------

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
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- TABLE: posts
-- Only records with is_published = TRUE appear in the public feed.
-- -----------------------------------------------------------------------------

CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           TEXT,                          -- max 500 chars enforced in app
  image_urls        TEXT[] DEFAULT ARRAY[]::TEXT[], -- max 4 URLs
  is_published      BOOLEAN DEFAULT FALSE,          -- set TRUE only after safe moderation
  is_deleted        BOOLEAN DEFAULT FALSE,          -- soft delete
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'safe', 'toxic', 'pending_review')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT post_has_content CHECK (
    (content IS NOT NULL AND char_length(content) > 0)
    OR array_length(image_urls, 1) > 0
  )
);

-- Indexes: posts
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_feed ON posts(created_at DESC)
  WHERE is_published = TRUE AND is_deleted = FALSE;

-- RLS: posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read_published" ON posts
  FOR SELECT USING (is_published = TRUE AND is_deleted = FALSE);

CREATE POLICY "posts_insert_auth" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_modify_own" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- -----------------------------------------------------------------------------
-- TABLE: comments
-- Follows the same moderation pipeline as posts.
-- -----------------------------------------------------------------------------

CREATE TABLE comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           TEXT NOT NULL,                 -- max 300 chars enforced in app
  is_deleted        BOOLEAN DEFAULT FALSE,
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'safe', 'toxic', 'pending_review')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes: comments
CREATE INDEX idx_comments_post_id ON comments(post_id)
  WHERE is_deleted = FALSE;

-- RLS: comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_safe" ON comments
  FOR SELECT USING (moderation_status = 'safe' AND is_deleted = FALSE);

CREATE POLICY "comments_insert_auth" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_modify_own" ON comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE USING (auth.uid() = author_id);

-- -----------------------------------------------------------------------------
-- TABLE: likes
-- One like per user per post, enforced by unique constraint.
-- -----------------------------------------------------------------------------

CREATE TABLE likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (post_id, user_id)
);

-- RLS: likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_read_all" ON likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert_auth" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- TABLE: strikes
-- Records every moderation action. Inserts by service_role only.
-- -----------------------------------------------------------------------------

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

-- Indexes: strikes
CREATE INDEX idx_strikes_user_id ON strikes(user_id);
CREATE INDEX idx_strikes_unresolved ON strikes(user_id)
  WHERE is_resolved = FALSE;

-- RLS: strikes
ALTER TABLE strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strikes_read_own" ON strikes
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT policy for authenticated role by design.
-- Only service_role can insert strikes.

-- -----------------------------------------------------------------------------
-- TABLE: appeals
-- One appeal per strike (UNIQUE on strike_id).
-- -----------------------------------------------------------------------------

CREATE TABLE appeals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  strike_id   UUID NOT NULL UNIQUE REFERENCES strikes(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,                    -- max 500 chars enforced in app
  status      appeal_status_enum DEFAULT 'pending',
  admin_note  TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: appeals
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appeals_read_own" ON appeals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "appeals_insert_own" ON appeals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy for authenticated role.
-- Only service_role can update (admin approval/rejection).

-- -----------------------------------------------------------------------------
-- TABLE: reports
-- Community flagging. One report per user per post.
-- -----------------------------------------------------------------------------

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category     report_category_enum NOT NULL,
  description  TEXT,                            -- max 200 chars
  status       report_status_enum DEFAULT 'pending',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (reporter_id, post_id)
);

-- RLS: reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_auth" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_read_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTIONS
-- -----------------------------------------------------------------------------

-- 5.1 Auto-create profile on new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, username, display_name)
  VALUES (
    NEW.id,
    NEW.id,
    'user_' || substr(replace(COALESCE(NEW.phone, NEW.id::text), '+', ''), 1, 8),
    'New User'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5.2 Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- CONSTRAINT-BASED ENFORCEMENT (no triggers needed)
-- 5.3 One appeal per strike    -> UNIQUE (strike_id) on appeals
-- 5.4 One like per user/post   -> UNIQUE (post_id, user_id) on likes
-- 5.5 One report per user/post -> UNIQUE (reporter_id, post_id) on reports
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- Create via Supabase Dashboard or Management API after running this migration.
--
-- Bucket: post-images
--   Access: Public read / Authenticated write
--   Upload RLS: auth.uid()::text = (storage.foldername(name))[1]
--   Read RLS:   true (public)
--
-- Bucket: avatars
--   Access: Public read / Authenticated write
--   Upload RLS: auth.uid()::text = (storage.foldername(name))[1]
--   Read RLS:   true (public)
-- -----------------------------------------------------------------------------
