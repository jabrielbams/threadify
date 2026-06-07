import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfilePostList } from "@/components/profile/ProfilePostList";
import { createServerClient } from "@/lib/supabase/server";
import {
  FEED_POST_SELECT,
  mapPostWithCounts,
  type PostWithCountsRow,
} from "@/lib/feed";
import type { PostWithProfile } from "@/types/app";

const PAGE_SIZE = 20;

interface ProfilePageProps {
  params: { username: string };
}

/**
 * Generates dynamic metadata for the profile page (SEO).
 */
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, bio")
    .eq("username", params.username)
    .single();

  if (!profile) {
    return { title: "Profil Tidak Ditemukan | Threadify" };
  }

  return {
    title: `${profile.display_name} (@${profile.username}) | Threadify`,
    description: profile.bio || `Profil ${profile.display_name} di Threadify.`,
  };
}

/**
 * Profile page — displays user header, tabs, and their posts feed.
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createServerClient();

  // Fetch profile by username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isOwnProfile = currentUserId === profile.user_id;

  // Fetch user's posts
  const { data: postsData } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .eq("author_id", profile.user_id)
    .eq("is_published", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const posts: PostWithProfile[] = ((postsData ?? []) as PostWithCountsRow[]).map(
    mapPostWithCounts,
  );

  // Count posts for display
  const { count: postCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", profile.user_id)
    .eq("is_published", true)
    .eq("is_deleted", false);

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      <ProfileHeader
        username={profile.username}
        displayName={profile.display_name}
        bio={profile.bio ?? ""}
        avatarUrl={profile.avatar_url}
        bannerUrl={null}
        postCount={postCount ?? 0}
        isOwnProfile={isOwnProfile}
      />

      <ProfileTabs />

      {/* Posts Feed */}
      <ProfilePostList
        initialPosts={posts}
        currentUserId={currentUserId}
        profileUserId={profile.user_id}
      />

      {/* Mobile spacer */}
      <div className="h-20 lg:hidden" />
    </main>
  );
}
