"use client";

import { useState } from "react";
import { ComposeStep } from "@/components/post/steps/ComposeStep";
import { PreviewStep } from "@/components/post/steps/PreviewStep";
import { ModerationLoadingStep } from "@/components/post/steps/ModerationLoadingStep";
import { SuccessStep } from "@/components/post/steps/SuccessStep";
import { StrikeStep } from "@/components/post/steps/StrikeStep";
import { AppealStep } from "@/components/post/steps/AppealStep";
import { AppealConfirmationStep } from "@/components/post/steps/AppealConfirmationStep";
import { uploadPostImages, emitPostCreated } from "@/lib/post-composer";
import type { ApiError, ModerationApiResponse, StrikeInfo, PostWithProfile } from "@/types/app";

type FlowStep =
  | "compose"
  | "preview"
  | "moderating"
  | "success"
  | "strike"
  | "appeal"
  | "appeal-confirmation";

interface CreatePostFlowProps {
  currentUserId: string;
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

/**
 * Multi-step create post flow component.
 * Manages state transitions: Compose → Preview → AI Moderation → Success/Strike → Appeal
 */
export function CreatePostFlow({
  currentUserId,
  avatarUrl,
  displayName,
  username,
}: CreatePostFlowProps) {
  const [step, setStep] = useState<FlowStep>("compose");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [publishedPost, setPublishedPost] = useState<PostWithProfile | null>(null);
  const [strike, setStrike] = useState<StrikeInfo | null>(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /** Transition from Compose → Preview */
  function handleComposeNext(text: string, imgs: File[], previews: string[]) {
    setContent(text);
    setFiles(imgs);
    setPreviewUrls(previews);
    setStep("preview");
  }

  /** Go back from Preview → Compose */
  function handlePreviewEdit() {
    setStep("compose");
  }

  /** Submit for moderation: Preview → Moderating → Success/Strike */
  async function handlePublish(): Promise<void> {
    setStep("moderating");
    setErrorMessage("");

    try {
      // Upload images
      const imageUrls = await uploadPostImages(currentUserId, files);

      // Call moderation API
      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrls }),
      });

      const payload = (await response.json()) as ModerationApiResponse | ApiError;

      if ("error" in payload) {
        const errorMessages: Record<string, string> = {
          UNAUTHORIZED: "Sesi Anda telah berakhir. Silakan login kembali.",
          RATE_LIMITED: "Anda terlalu sering mengirim postingan. Tunggu sebentar.",
          ACCOUNT_SUSPENDED: "Akun Anda sedang dalam masa penangguhan.",
          POST_RESTRICTED: "Posting dibatasi sementara akibat pelanggaran sebelumnya.",
        };
        setErrorMessage(errorMessages[payload.code] ?? payload.error);
        setStep("compose");
        return;
      }

      if (!response.ok) {
        setErrorMessage("Terjadi gangguan pada server. Coba lagi nanti.");
        setStep("compose");
        return;
      }

      if (payload.status === "published") {
        setPublishedPost(payload.post);
        emitPostCreated(payload.post);
        setStep("success");
        return;
      }

      if (payload.status === "blocked") {
        setStrike(payload.strike);
        setStrikeReason(payload.reason);
        setStep("strike");
        return;
      }

      // pending_review — still a success from user perspective
      setStep("success");
    } catch (err) {
      console.error(
        "[CreatePostFlow] Submission failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      setErrorMessage("Koneksi terputus atau server tidak merespons. Periksa koneksi internet Anda dan coba lagi.");
      setStep("compose");
    }
  }

  /** Strike → Appeal form */
  function handleAppeal() {
    setStep("appeal");
  }

  /** Strike → Discard and go back to compose */
  function handleDiscardStrike() {
    resetFlow();
  }

  /** Appeal submitted → Confirmation */
  function handleAppealSubmitted() {
    setStep("appeal-confirmation");
  }

  /** Reset everything back to compose */
  function resetFlow() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setContent("");
    setFiles([]);
    setPreviewUrls([]);
    setPublishedPost(null);
    setStrike(null);
    setStrikeReason("");
    setErrorMessage("");
    setStep("compose");
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-gutter md:p-md">
      {step === "compose" && (
        <ComposeStep
          initialContent={content}
          initialFiles={files}
          initialPreviews={previewUrls}
          avatarUrl={avatarUrl}
          displayName={displayName}
          errorMessage={errorMessage}
          onNext={handleComposeNext}
        />
      )}

      {step === "preview" && (
        <PreviewStep
          content={content}
          previewUrls={previewUrls}
          avatarUrl={avatarUrl}
          displayName={displayName}
          username={username}
          onEdit={handlePreviewEdit}
          onPublish={handlePublish}
        />
      )}

      {step === "moderating" && <ModerationLoadingStep />}

      {step === "success" && (
        <SuccessStep
          postId={publishedPost?.id ?? null}
          onViewPost={() => {
            if (publishedPost) {
              window.location.href = `/post/${publishedPost.id}`;
            } else {
              window.location.href = "/feed";
            }
          }}
          onNewPost={resetFlow}
        />
      )}

      {step === "strike" && (
        <StrikeStep
          strike={strike}
          reason={strikeReason}
          onAppeal={handleAppeal}
          onDiscard={handleDiscardStrike}
        />
      )}

      {step === "appeal" && strike && (
        <AppealStep
          strikeId={strike.id}
          blockedContent={content}
          onBack={() => setStep("strike")}
          onSubmitted={handleAppealSubmitted}
        />
      )}

      {step === "appeal-confirmation" && (
        <AppealConfirmationStep onGoHome={() => { window.location.href = "/feed"; }} />
      )}
    </div>
  );
}
