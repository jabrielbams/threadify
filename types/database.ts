/**
 * Supabase TypeScript types — manually scaffolded from ERD.md.
 * Regenerate with `pnpm db:types` once connected to a live Supabase project.
 *
 * DO NOT edit the Row/Insert/Update shapes by hand after that point —
 * let `supabase gen types` keep them in sync with migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum types matching supabase/migrations/20260302000000_initial_schema.sql
export type ContentTypeEnum = "post" | "comment";
export type AppealStatusEnum = "pending" | "approved" | "rejected";
export type ReportCategoryEnum =
  | "hate_speech"
  | "sara"
  | "nsfw"
  | "spam_buzzer"
  | "misinformation"
  | "other";
export type ReportStatusEnum =
  | "pending"
  | "reviewed"
  | "resolved"
  | "dismissed";
export type ModerationStatusEnum =
  | "pending"
  | "safe"
  | "toxic"
  | "pending_review";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          // matches ERD.md §2.1
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          bio: string;
          avatar_url: string | null;
          is_banned: boolean;
          ban_expires_at: string | null;
          post_restricted_until: string | null;
          username_changed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          bio?: string;
          avatar_url?: string | null;
          is_banned?: boolean;
          ban_expires_at?: string | null;
          post_restricted_until?: string | null;
          username_changed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string | null;
          is_banned?: boolean;
          ban_expires_at?: string | null;
          post_restricted_until?: string | null;
          username_changed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        // Relationships defined in ERD are enforced via FK constraints; listed here
        // so the table type satisfies @supabase/supabase-js's GenericTable constraint.
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          content: string | null;
          image_urls: string[];
          is_published: boolean;
          is_deleted: boolean;
          moderation_status: ModerationStatusEnum;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content?: string | null;
          image_urls?: string[];
          is_published?: boolean;
          is_deleted?: boolean;
          moderation_status?: ModerationStatusEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          content?: string | null;
          image_urls?: string[];
          is_published?: boolean;
          is_deleted?: boolean;
          moderation_status?: ModerationStatusEnum;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          is_deleted: boolean;
          moderation_status: ModerationStatusEnum;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          is_deleted?: boolean;
          moderation_status?: ModerationStatusEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          content?: string;
          is_deleted?: boolean;
          moderation_status?: ModerationStatusEnum;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      strikes: {
        Row: {
          id: string;
          user_id: string;
          content_type: ContentTypeEnum;
          content_id: string;
          layer_triggered: number;
          ai_verdict: string;
          ai_confidence: number | null;
          ai_reason: string | null;
          strike_number: number;
          is_resolved: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_type: ContentTypeEnum;
          content_id: string;
          layer_triggered: number;
          ai_verdict?: string;
          ai_confidence?: number | null;
          ai_reason?: string | null;
          strike_number: number;
          is_resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_type?: ContentTypeEnum;
          content_id?: string;
          layer_triggered?: number;
          ai_verdict?: string;
          ai_confidence?: number | null;
          ai_reason?: string | null;
          strike_number?: number;
          is_resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appeals: {
        Row: {
          id: string;
          user_id: string;
          strike_id: string;
          reason: string;
          status: AppealStatusEnum;
          admin_note: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          strike_id: string;
          reason: string;
          status?: AppealStatusEnum;
          admin_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          strike_id?: string;
          reason?: string;
          status?: AppealStatusEnum;
          admin_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string;
          category: ReportCategoryEnum;
          description: string | null;
          status: ReportStatusEnum;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          post_id: string;
          category: ReportCategoryEnum;
          description?: string | null;
          status?: ReportStatusEnum;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          post_id?: string;
          category?: ReportCategoryEnum;
          description?: string | null;
          status?: ReportStatusEnum;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      content_type_enum: ContentTypeEnum;
      appeal_status_enum: AppealStatusEnum;
      report_category_enum: ReportCategoryEnum;
      report_status_enum: ReportStatusEnum;
    };
  };
}
