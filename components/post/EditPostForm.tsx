"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImageIcon, X, Smile, Lightbulb } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DeletePostModal } from "@/components/post/DeletePostModal";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const MAX_CHARACTERS = 500;
const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface EditPostFormProps {
  postId: string;
  currentContent: string;
  currentImageUrls: string[];
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

/**
 * Edit post form with text editor, image management (remove/replace/add),
 * character counter, and moderation re-submission on save.
 * Per FR-05: edited posts re-enter the moderation pipeline before re-publishing.
 */
export function EditPostForm({
  postId,
  currentContent,
  currentImageUrls,
  avatarUrl,
  displayName,
  username,
}: EditPostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(currentContent);
  const [existingImages, setExistingImages] = useState<string[]>(currentImageUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const isOverLimit = charCount > 450;
  const totalImages = existingImages.length + newFiles.length;
  const canSave = content.trim().length > 0 || totalImages > 0;
  const hasChanges =
    content !== currentContent ||
    existingImages.length !== currentImageUrls.length ||
    newFiles.length > 0;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_IMAGES - totalImages);

    if (files.length === 0) return;

    const urls = files.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...urls]);
    e.target.value = "";
  }

  function removeExistingImage(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    if (!canSave || isSaving) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const supabase = createBrowserClient();

      // Upload new files if any
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrorMessage("Sesi tidak ditemukan. Silakan login ulang.");
          setIsSaving(false);
          return;
        }

        for (const file of newFiles) {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { data, error } = await supabase.storage
            .from("post-images")
            .upload(path, file, { upsert: false });

          if (error || !data) {
            setErrorMessage("Gagal mengunggah gambar.");
            setIsSaving(false);
            return;
          }

          const { data: publicData } = supabase.storage
            .from("post-images")
            .getPublicUrl(data.path);
          uploadedUrls.push(publicData.publicUrl);
        }
      }

      const finalImageUrls = [...existingImages, ...uploadedUrls];
      const moderationContent = content.trim() || "[Image-only post]";

      // Call recheck API which handles: update content + re-moderation + publish/strike
      const response = await fetch("/api/moderation/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: moderationContent, imageUrls: finalImageUrls }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        setErrorMessage(errData?.error ?? "Gagal menyimpan perubahan. Coba lagi.");
        return;
      }

      const result = await response.json();
      if (result.status === "published") {
        setSuccessMessage("Postingan berhasil diperbarui!");
        setTimeout(() => router.push(`/post/${postId}`), 1500);
      } else if (result.status === "blocked") {
        setErrorMessage(`Konten yang diedit melanggar panduan komunitas: ${result.reason}`);
      } else {
        setSuccessMessage("Postingan disimpan dan sedang ditinjau ulang.");
        setTimeout(() => router.push("/feed"), 1500);
      }
    } catch (err) {
      console.error(
        "[EditPost] Save failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      setErrorMessage("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    const response = await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (!response.ok) {
      setErrorMessage("Gagal menghapus postingan.");
      return;
    }

    router.push("/feed");
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-md py-sm backdrop-blur-xl">
        <div className="flex items-center gap-md">
          <Link
            href={`/post/${postId}`}
            className="rounded-full p-xs transition-colors hover:bg-surface-container-low active:opacity-70"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Link>
          <h1 className="text-headline-lg font-bold text-primary">
            Edit Postingan
          </h1>
        </div>
      </header>

      {/* Form */}
      <div className="mx-auto w-full max-w-[600px] px-margin-mobile md:px-0">
        <div className="mt-md rounded-xl border border-outline-variant/20 bg-surface p-md">
          <div className="flex gap-sm">
            {/* Avatar + thread line */}
            <div className="flex shrink-0 flex-col items-center">
              <Avatar src={avatarUrl} displayName={displayName} size="md" className="h-12 w-12" />
              <div className="mt-xs flex-1 w-0.5 rounded-full bg-outline-variant/20" />
            </div>

            {/* Post Body */}
            <div className="flex flex-1 flex-col gap-md">
              {/* Text Editor */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={MAX_CHARACTERS}
                  placeholder="Apa yang ingin kamu bagikan?"
                  className="min-h-[120px] w-full resize-none border-none bg-transparent p-0 text-body-lg text-on-surface placeholder:text-outline focus:ring-0"
                  disabled={isSaving}
                  aria-label="Edit postingan"
                />
                <div className="mt-xs flex justify-end">
                  <span
                    className={cn(
                      "text-label-xs text-outline",
                      isOverLimit && "text-error",
                    )}
                  >
                    {charCount}/{MAX_CHARACTERS}
                  </span>
                </div>
              </div>

              {/* Image Previews — existing + new */}
              {(existingImages.length > 0 || newPreviews.length > 0) && (
                <div className={cn(
                  "grid gap-2",
                  totalImages > 1 ? "grid-cols-2" : "grid-cols-1",
                )}>
                  {/* Existing images from server */}
                  {existingImages.map((url, index) => (
                    <div
                      key={`existing-${url}`}
                      className="group relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low"
                    >
                      <Image
                        src={url}
                        alt=""
                        width={600}
                        height={400}
                        className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-full bg-on-surface/80 text-surface opacity-0 transition-opacity hover:bg-on-surface group-hover:opacity-100"
                        aria-label={`Hapus gambar ${index + 1}`}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* New uploaded images */}
                  {newPreviews.map((url, index) => (
                    <div
                      key={`new-${url}`}
                      className="group relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low"
                    >
                      <Image
                        src={url}
                        alt=""
                        width={600}
                        height={400}
                        className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-full bg-on-surface/80 text-surface opacity-0 transition-opacity hover:bg-on-surface group-hover:opacity-100"
                        aria-label={`Hapus gambar baru ${index + 1}`}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              {errorMessage && (
                <p className="text-body-sm text-error" role="alert">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="text-body-sm text-primary">{successMessage}</p>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-outline-variant/20 pt-md">
                <div className="flex items-center gap-sm">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={totalImages >= MAX_IMAGES || isSaving}
                    className="rounded-full p-xs text-primary transition-colors hover:bg-surface-container-low active:opacity-70 disabled:opacity-40"
                    aria-label="Tambah gambar"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-xs text-primary transition-colors hover:bg-surface-container-low active:opacity-70"
                    aria-label="Tambah emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center gap-sm">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="rounded-full px-lg py-xs text-label-md font-medium text-error transition-colors hover:bg-error-container/10 active:opacity-70"
                    disabled={isSaving}
                  >
                    Hapus
                  </button>
                  <Link
                    href={`/post/${postId}`}
                    className="rounded-full px-lg py-xs text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container active:opacity-70"
                  >
                    Batal
                  </Link>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || !hasChanges || isSaving}
                    className={cn(
                      "rounded-full bg-primary px-lg py-xs font-medium text-on-primary shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:opacity-70",
                      (!canSave || !hasChanges || isSaving) &&
                        "cursor-not-allowed opacity-50 hover:scale-100",
                    )}
                  >
                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Card */}
        <div className="mb-lg mt-lg flex items-start gap-md rounded-xl border border-outline-variant/10 bg-surface-container-low p-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container/20 text-secondary">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant">
              Postingan yang diedit akan melewati pengecekan AI ulang sebelum
              dipublikasikan kembali. Pastikan konten Anda sesuai panduan komunitas.
            </p>
          </div>
        </div>
      </div>

      <DeletePostModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
