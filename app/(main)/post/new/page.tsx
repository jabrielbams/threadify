import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreatePostFlow } from "@/components/post/CreatePostFlow";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Buat Postingan | Threadify",
  description: "Buat postingan baru di Threadify.",
};

/**
 * Create Post page — multi-step flow:
 * 1. Compose → 2. Preview → 3. AI Moderation → 4. Success / Strike → (optional) Appeal
 */
export default async function CreatePostPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name, username")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      <CreatePostFlow
        currentUserId={user.id}
        avatarUrl={profile?.avatar_url ?? null}
        displayName={profile?.display_name ?? "Pengguna"}
        username={profile?.username ?? "user"}
      />
      <div className="h-20 lg:hidden" />
    </main>
  );
}
