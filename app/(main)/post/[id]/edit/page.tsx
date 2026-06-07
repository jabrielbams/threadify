import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditPostForm } from "@/components/post/EditPostForm";
import { createServerClient } from "@/lib/supabase/server";

interface EditPostPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: "Edit Postingan | Threadify",
  description: "Edit postingan Anda di Threadify.",
};

/**
 * Edit Post page — only accessible by the post author.
 * Per FR-05: Edited posts re-enter the moderation pipeline before re-publishing.
 */
export default async function EditPostPage({ params }: EditPostPageProps) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch post and verify ownership
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, content, image_urls, author_id, is_published, is_deleted")
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();

  if (error || !post) {
    notFound();
  }

  if (post.author_id !== user.id) {
    notFound();
  }

  // Fetch user profile for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name, username")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      <EditPostForm
        postId={post.id}
        currentContent={post.content ?? ""}
        currentImageUrls={post.image_urls ?? []}
        avatarUrl={profile?.avatar_url ?? null}
        displayName={profile?.display_name ?? "Pengguna"}
        username={profile?.username ?? "user"}
      />
      <div className="h-20 lg:hidden" />
    </main>
  );
}
