import type { Metadata } from "next";
import { FeedList } from "@/components/feed/FeedList";
import { FloatingComposer } from "@/components/post/FloatingComposer";
import { createServerClient } from "@/lib/supabase/server";
import {
  FEED_POST_SELECT,
  mapPostWithCounts,
  type PostWithCountsRow,
} from "@/lib/feed";
import type { PostWithProfile } from "@/types/app";

const PAGE_SIZE = 20;

/**
 * SEO metadata for the main feed page.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Feed | Threadify",
    description: "Lihat postingan terbaru dari komunitas Threadify.",
  };
}

/**
 * Fetches the latest published feed posts with author profiles.
 */
async function fetchFeedPosts(
  supabase: ReturnType<typeof createServerClient>,
): Promise<PostWithProfile[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .eq("is_published", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    console.error("[Feed] Failed to fetch posts:", error.message);
    return [];
  }

  const rows = (data ?? []) as PostWithCountsRow[];
  return rows.map(mapPostWithCounts);
}

/**
 * Main feed page (Server Component).
 * Feed list with floating bottom composer that hides on scroll down.
 */
export default async function FeedPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const posts = await fetchFeedPosts(supabase);
  const currentUserId = user?.id ?? null;

  // Fetch current user profile for the composer avatar
  let avatarUrl: string | null = null;
  let displayName = "Pengguna";

  if (currentUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", currentUserId)
      .single();

    if (profile) {
      avatarUrl = profile.avatar_url;
      displayName = profile.display_name;
    }
  }

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/30 bg-surface-bright">
      <FeedList initialPosts={posts} currentUserId={currentUserId} />

      {/* Spacer for floating composer + mobile bottom nav */}
      <div className="h-40 lg:h-24" />

      {/* Floating bottom composer */}
      <FloatingComposer
        currentUserId={currentUserId}
        avatarUrl={avatarUrl}
        displayName={displayName}
      />
    </main>
  );
}
