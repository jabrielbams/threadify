"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";

const MAX_DISPLAY_NAME = 60;
const MAX_BIO = 160;

interface EditProfileFormProps {
  userId: string;
  currentDisplayName: string;
  currentBio: string;
  currentAvatarUrl: string | null;
  currentUsername: string;
  usernameChangedAt: string | null;
}

/**
 * Full edit profile form with avatar upload, banner, display name, bio,
 * and danger zone (delete account).
 * Matches the Threadify edit profile design.
 */
export function EditProfileForm({
  userId,
  currentDisplayName,
  currentBio,
  currentAvatarUrl,
  currentUsername,
  usernameChangedAt,
}: EditProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [bio, setBio] = useState(currentBio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentAvatarUrl,
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!displayName.trim()) {
      setErrorMessage("Nama tampilan tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createBrowserClient();

    try {
      let newAvatarUrl = currentAvatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          setErrorMessage("Gagal mengunggah foto profil.");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      // Upload banner if changed
      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const path = `${userId}/banner.${ext}`;
        await supabase.storage
          .from("avatars")
          .upload(path, bannerFile, { upsert: true });
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq("user_id", userId);

      if (updateError) {
        setErrorMessage("Gagal menyimpan profil. Silakan coba lagi.");
        return;
      }

      setSuccessMessage("Profil berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      console.error(
        "[EditProfile] Failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      setErrorMessage("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center gap-md px-margin-mobile pb-md pt-md md:px-0 md:pl-md">
          <Link
            href={`/profile/${currentUsername}`}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
            aria-label="Kembali ke profil"
          >
            <ArrowLeft className="h-5 w-5 text-on-surface" />
          </Link>
          <h2 className="text-headline-lg font-bold">Edit Profil</h2>
        </div>

        {/* Banner Upload */}
        <div className="group relative mb-xl h-48 overflow-hidden rounded-xl bg-surface-container-high mx-md">
          {bannerPreview ? (
            <Image
              src={bannerPreview}
              alt="Banner"
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/10 to-surface-container-high" />
          )}
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-8 w-8 text-white" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleBannerChange}
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* Avatar Upload */}
        <div className="relative -mt-16 ml-6 mb-xl inline-block px-md">
          <div className="group relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-surface-container">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-xl font-semibold text-on-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-lg px-md">
          {/* Display Name */}
          <div className="space-y-xs">
            <label
              htmlFor="edit-display-name"
              className="px-1 text-label-md text-on-surface-variant"
            >
              Nama Tampilan
            </label>
            <input
              id="edit-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-body-lg focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
          </div>

          {/* Bio */}
          <div className="space-y-xs">
            <div className="flex justify-between px-1">
              <label
                htmlFor="edit-bio"
                className="text-label-md text-on-surface-variant"
              >
                Bio
              </label>
              <span
                className={cn(
                  "text-label-xs text-on-surface-variant/60",
                  bio.length > MAX_BIO && "text-error",
                )}
              >
                {bio.length} / {MAX_BIO}
              </span>
            </div>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO}
              rows={3}
              className="w-full resize-none rounded-xl border-none bg-surface-container-low px-4 py-3 text-body-lg focus:ring-2 focus:ring-primary"
              placeholder="Ceritakan tentang diri Anda..."
              disabled={isSubmitting}
            />
          </div>

          {/* Messages */}
          {errorMessage && (
            <p className="text-body-sm text-error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-body-sm text-primary">{successMessage}</p>
          )}

          {/* Danger Zone */}
          <div className="border-t border-outline-variant/30 pt-xl">
            <h3 className="mb-sm text-title-md text-error">Zona Berbahaya</h3>
            <p className="mb-md text-body-sm text-on-surface-variant">
              Kelola tindakan sensitif akun dan privasi data.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-xs rounded-lg border border-error/20 px-4 py-2 font-medium text-error transition-colors hover:bg-error-container/10"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Akun
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-md pb-xl pt-xl">
            <Link
              href={`/profile/${currentUsername}`}
              className="rounded-full border border-outline-variant px-lg py-3 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "rounded-full bg-primary px-lg py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container",
                isSubmitting && "cursor-not-allowed opacity-50",
              )}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </form>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
