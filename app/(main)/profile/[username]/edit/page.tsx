import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { createServerClient } from "@/lib/supabase/server";

interface EditProfilePageProps {
  params: { username: string };
}

export const metadata: Metadata = {
  title: "Edit Profil | Threadify",
  description: "Ubah informasi profil Anda di Threadify.",
};

/**
 * Edit profile page — only accessible by the profile owner.
 * Redirects to login if unauthenticated, 404 if not the owner.
 */
export default async function EditProfilePage({ params }: EditProfilePageProps) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile and verify ownership
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (error || !profile) {
    notFound();
  }

  if (profile.user_id !== user.id) {
    notFound();
  }

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      <EditProfileForm
        userId={user.id}
        currentDisplayName={profile.display_name}
        currentBio={profile.bio ?? ""}
        currentAvatarUrl={profile.avatar_url}
        currentUsername={profile.username}
        usernameChangedAt={profile.username_changed_at}
      />

      {/* Mobile spacer */}
      <div className="h-20 lg:hidden" />
    </main>
  );
}
