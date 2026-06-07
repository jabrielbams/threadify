import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const deleteSchema = z.object({
  postId: z.string().uuid(),
});

const likeSchema = z.object({
  postId: z.string().uuid(),
  action: z.enum(["like", "unlike"]),
});

/**
 * DELETE /api/posts
 * Deletes a post owned by the current user. Uses admin client to bypass RLS.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
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

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", parsed.data.postId)
    .single();

  if (!post || post.author_id !== user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  // Delete the post (cascades to comments, likes, reports)
  const { error } = await admin
    .from("posts")
    .delete()
    .eq("id", parsed.data.postId);

  if (error) {
    console.error("[Posts API] Delete failed:", error.message);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/posts
 * Handles like/unlike actions. Uses admin client to bypass RLS.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
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

  const parsed = likeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { postId, action } = parsed.data;
  const admin = createAdminClient();

  if (action === "like") {
    const { error } = await admin
      .from("likes")
      .upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id" });

    if (error) {
      console.error("[Posts API] Like failed:", error.message);
      return NextResponse.json({ error: "Failed to like" }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Posts API] Unlike failed:", error.message);
      return NextResponse.json({ error: "Failed to unlike" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
