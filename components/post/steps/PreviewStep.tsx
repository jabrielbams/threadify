"use client";

import Image from "next/image";
import { Sparkles, Info } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

interface PreviewStepProps {
  content: string;
  previewUrls: string[];
  avatarUrl: string | null;
  displayName: string;
  username: string;
  onEdit: () => void;
  onPublish: () => void;
}

/**
 * Step 2: Preview — shows how the post will look before AI moderation.
 * Includes the "AI Moderasi Aktif" badge and info notice about content checking.
 */
export function PreviewStep({
  content,
  previewUrls,
  avatarUrl,
  displayName,
  username,
  onEdit,
  onPublish,
}: PreviewStepProps) {
  return (
    <section className="w-full max-w-[600px] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-lg">
      <div className="flex flex-col gap-sm p-md">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-title-md font-semibold">Pratinjau Postingan</h2>
          <span className="flex items-center gap-1 rounded-full bg-tertiary-fixed px-2 py-1 text-label-xs font-medium text-on-tertiary-fixed">
            <Sparkles className="h-3.5 w-3.5" />
            AI Moderasi Aktif
          </span>
        </div>

        {/* Post Preview Card */}
        <div className="rounded-xl border border-outline-variant/10 bg-surface-bright p-4">
          <div className="flex gap-sm">
            <Avatar src={avatarUrl} displayName={displayName} size="md" />
            <div className="flex-1">
              <div className="flex items-center gap-xs">
                <span className="font-bold text-on-surface">{displayName}</span>
                <span className="text-label-md text-on-surface-variant">
                  @{username} · baru saja
                </span>
              </div>

              {content && (
                <p className="mt-xs whitespace-pre-wrap text-body-lg text-on-surface">
                  {content}
                </p>
              )}

              {previewUrls.length > 0 && (
                <div className={cn(
                  "mt-md grid gap-2",
                  previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1",
                )}>
                  {previewUrls.map((url, index) => (
                    <div
                      key={url}
                      className="overflow-hidden rounded-xl"
                    >
                      <Image
                        src={url}
                        alt=""
                        width={600}
                        height={400}
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="mt-md flex gap-sm rounded-lg bg-surface-container p-sm">
          <Info className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-body-sm text-on-surface-variant">
            Postinganmu akan dicek oleh AI sebelum dipublikasikan untuk
            memastikan komunitas tetap aman dan ramah.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-md flex gap-sm">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-full border border-outline py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="flex-1 rounded-full bg-primary py-3 text-label-md font-medium text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Publikasikan
          </button>
        </div>
      </div>
    </section>
  );
}
