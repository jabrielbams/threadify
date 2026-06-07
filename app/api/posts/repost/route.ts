import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const repostSchema = z.object({
  postId: z.string().uuid(),
});

/**
 * POST /api/posts/repost
 * Re-publishes a previously blocked post after a successful appeal.
 * Validates that the user owns the post and the associated strike is resolved.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = repostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { postId } = parsed.data;
  const admin = createAdminClient();

  // Verify the post belongs to the user
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, is_published")
    .eq("id", postId)
    .single();

  if (!post || post.author_id !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.is_published) {
    return NextResponse.json({ error: "Already published", already_posted: true }, { status: 200 });
  }

  // Verify the associated strike is resolved
  const { data: strike } = await admin
    .from("strikes")
    .select("id, is_resolved")
    .eq("content_id", postId)
    .eq("content_type", "post")
    .single();

  if (!strike || !strike.is_resolved) {
    return NextResponse.json({ error: "Strike not resolved" }, { status: 403 });
  }

  // Re-publish
  const { error } = await admin
    .from("posts")
    .update({ is_published: true, moderation_status: "safe" })
    .eq("id", postId);

  if (error) {
    return NextResponse.json({ error: "Failed to republish" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
