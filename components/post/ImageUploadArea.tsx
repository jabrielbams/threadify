"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadAreaProps {
  files: File[];
  previewUrls: string[];
  onFilesChange: (files: File[], previewUrls: string[]) => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop + file-picker image upload area.
 * Supports up to 4 images; previews them in a small grid with remove buttons.
 */
export function ImageUploadArea({
  files,
  previewUrls,
  onFilesChange,
  disabled = false,
}: ImageUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Use a counter to avoid false "drag leave" fires on child elements
  const [dragCount, setDragCount] = useState(0);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const toAdd = Array.from(list)
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_IMAGES - files.length);
    if (toAdd.length === 0) return;
    const newUrls = toAdd.map((f) => URL.createObjectURL(f));
    onFilesChange([...files, ...toAdd], [...previewUrls, ...newUrls]);
  }

  function removeFile(i: number) {
    const url = previewUrls[i];
    if (url) URL.revokeObjectURL(url);
    onFilesChange(
      files.filter((_, idx) => idx !== i),
      previewUrls.filter((_, idx) => idx !== i),
    );
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragCount(0);
    addFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  const canAdd = files.length < MAX_IMAGES && !disabled;

  return (
    <div className="flex flex-col gap-2">
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {previewUrls.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-surface-card"
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label={`Hapus gambar ${i + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div
          role="button"
          tabIndex={0}
          onDragEnter={(e) => { e.preventDefault(); setDragCount((c) => c + 1); }}
          onDragLeave={() => setDragCount((c) => Math.max(0, c - 1))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-xl",
            "border-2 border-dashed px-4 py-2.5 text-sm transition-colors",
            dragCount > 0
              ? "border-brand-primary bg-indigo-50 text-brand-primary"
              : "border-gray-200 text-gray-500 hover:border-brand-primary hover:text-brand-primary",
          )}
        >
          <ImagePlus className="h-4 w-4" />
          <span>
            {files.length === 0
              ? "Tambah gambar (maks 4)"
              : `Tambah lagi · ${MAX_IMAGES - files.length} tersisa`}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
}
