import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PostDetailView } from "@/components/post/PostDetailView";
import { CommentSection } from "@/components/post/CommentSection";
import { createServerClient } from "@/lib/supabase/server";
import { FEED_POST_SELECT, mapPostWithCounts, type PostWithCountsRow } from "@/lib/feed";
import type { CommentWithProfile } from "@/types/app";

interface PostDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * Detailed view of a single post and its comments.
 */
export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch Post
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .eq("id", params.id)
    .eq("is_published", true)
    .eq("is_deleted", false)
    .single();

  if (postError || !postData) {
    notFound();
  }

  // 2. Fetch Comments
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("post_id", params.id)
    .eq("moderation_status", "safe")
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("[PostDetailPage] Failed to load comments:", commentsError.message);
  }

  const post = mapPostWithCounts(postData as PostWithCountsRow);
  const comments = (commentsData ?? []) as CommentWithProfile[];
  const currentUserId = user?.id ?? null;

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      {/* Back link */}
      <div className="border-b border-outline-variant/20 px-md py-sm">
        <Link
          href="/feed"
          className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Feed
        </Link>
      </div>

      {/* Post */}
      <PostDetailView post={post} currentUserId={currentUserId} />

      {/* Comments */}
      <div className="border-t border-outline-variant/20 px-md py-md">
        <CommentSection
          postId={post.id}
          initialComments={comments}
          currentUserId={currentUserId}
        />
      </div>

      {/* Mobile spacer */}
      <div className="h-20 lg:hidden" />
    </main>
  );
}
