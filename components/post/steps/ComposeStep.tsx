"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { ImageIcon, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { cn } from "@/lib/utils/cn";

const MAX_CHARACTERS = 500;
const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ComposeStepProps {
  initialContent: string;
  initialFiles: File[];
  initialPreviews: string[];
  avatarUrl: string | null;
  displayName: string;
  errorMessage?: string;
  onNext: (content: string, files: File[], previews: string[]) => void;
}

/**
 * Step 1: Compose — text input + image upload with preview.
 * User writes content and optionally adds images before proceeding to preview.
 */
export function ComposeStep({
  initialContent,
  initialFiles,
  initialPreviews,
  avatarUrl,
  displayName,
  errorMessage,
  onNext,
}: ComposeStepProps) {
  const [content, setContent] = useState(initialContent);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [previewUrls, setPreviewUrls] = useState<string[]>(initialPreviews);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const isOverLimit = charCount > 450;
  const canProceed = content.trim().length > 0 || files.length > 0;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_IMAGES - files.length);

    if (newFiles.length === 0) return;

    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNext() {
    if (!canProceed) return;
    onNext(content, files, previewUrls);
  }

  function handleEmojiSelect(emoji: string) {
    if (content.length + emoji.length <= MAX_CHARACTERS) {
      setContent((prev) => prev + emoji);
      textareaRef.current?.focus();
    }
  }

  return (
    <section className="w-full max-w-[600px] rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-md shadow-lg">
      <div className="flex gap-sm">
        <Avatar
          src={avatarUrl}
          displayName={displayName}
          size="md"
          className="h-12 w-12 shrink-0"
        />

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHARACTERS}
            placeholder="Apa yang ingin kamu bagikan?"
            className="min-h-[120px] w-full resize-none border-none bg-transparent p-0 text-body-lg placeholder:text-outline focus:ring-0"
            aria-label="Tulis postingan"
          />

          {/* Image Previews */}
          {previewUrls.length > 0 && (
            <div className={cn(
              "mt-sm grid gap-2",
              previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}>
              {previewUrls.map((url, index) => (
                <div
                  key={url}
                  className="relative overflow-hidden rounded-lg border border-outline-variant/30"
                >
                  <Image
                    src={url}
                    alt=""
                    width={600}
                    height={400}
                    className="aspect-video w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-on-surface/50 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-on-surface/70"
                    aria-label={`Hapus gambar ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <p className="mt-sm text-body-sm text-error" role="alert">
              {errorMessage}
            </p>
          )}

          {/* Action Bar */}
          <div className="mt-sm flex items-center justify-between border-t border-outline-variant/20 pt-sm">
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-primary transition-colors hover:bg-surface-container-low disabled:opacity-40"
                aria-label="Tambah gambar"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-label-xs font-medium">
                  {files.length > 0 ? `${files.length}/${MAX_IMAGES}` : "Gambar"}
                </span>
              </button>
              <EmojiPicker onSelect={handleEmojiSelect} />
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-sm">
              <span
                className={cn(
                  "text-label-md text-outline",
                  isOverLimit && "text-error",
                )}
              >
                {charCount} / {MAX_CHARACTERS}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className={cn(
                  "rounded-full bg-primary px-lg py-2 text-label-md font-bold text-on-primary transition-all hover:brightness-110 active:scale-95",
                  !canProceed && "cursor-not-allowed opacity-50",
                )}
              >
                Lanjut
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
