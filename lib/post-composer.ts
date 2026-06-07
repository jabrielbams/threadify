"use client";

import { POST_CREATED_EVENT } from "@/lib/feed";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PostWithProfile } from "@/types/app";

/**
 * Broadcasts a newly created post so FeedList can optimistically prepend it.
 *
 * @param post - The freshly published post payload
 */
export function emitPostCreated(post: PostWithProfile): void {
  window.dispatchEvent(new CustomEvent(POST_CREATED_EVENT, { detail: post }));
}

/**
 * Uploads selected images to the Supabase storage bucket and returns public URLs.
 *
 * @param userId - Current authenticated user ID
 * @param files - Image files to upload
 * @returns Array of public URLs for the uploaded images
 */
export async function uploadPostImages(
  userId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = createBrowserClient();
  const urls: string[] = [];

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase
      .storage
      .from("post-images")
      .upload(path, file, { upsert: false });

    if (error || !data) {
      throw new Error("UPLOAD_FAILED");
    }

    const { data: publicData } = supabase.storage
      .from("post-images")
      .getPublicUrl(data.path);
    urls.push(publicData.publicUrl);
  }

  return urls;
}
