"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { maskPhoneNumber } from "@/lib/utils/format";
import type { AuthActionResult, VerifyOtpResult } from "@/types/auth";

/**
 * Normalizes any phone input to E.164 format (+62XXXXXXXXXX).
 * Accepts: "08xx…", "628xx…", "+628xx…", or bare digit strings.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

/**
 * Gets all test account credentials from environment variables.
 * Supports multiple test accounts via TEST_PHONE_1, TEST_OTP_1, TEST_PHONE_2, TEST_OTP_2, etc.
 * Also supports legacy TEST_PHONE and TEST_OTP for backward compatibility.
 *
 * @returns Array of {phone, otp} pairs for test accounts
 */
function getTestAccounts(): Array<{ phone: string; otp: string }> {
  const accounts: Array<{ phone: string; otp: string }> = [];

  // Legacy support: TEST_PHONE and TEST_OTP
  const legacyPhone = process.env.TEST_PHONE;
  const legacyOtp = process.env.TEST_OTP;
  if (legacyPhone && legacyOtp) {
    accounts.push({ phone: legacyPhone, otp: legacyOtp });
  }

  // Numbered test accounts: TEST_PHONE_1, TEST_OTP_1, TEST_PHONE_2, TEST_OTP_2, etc.
  let index = 1;
  while (true) {
    const phone = process.env[`TEST_PHONE_${index}`];
    const otp = process.env[`TEST_OTP_${index}`];
    if (!phone || !otp) break;
    accounts.push({ phone, otp });
    index++;
  }

  return accounts;
}

/**
 * Finds a matching test account for the given phone and OTP.
 * @returns The matching test account, or null if not found
 */
function findTestAccount(phone: string, otp: string): { phone: string; otp: string } | null {
  const accounts = getTestAccounts();
  return accounts.find((acc) => acc.phone === phone && acc.otp === otp) ?? null;
}

/**
 * Checks if a phone number is a test account.
 * @returns true if the phone matches any configured test account phone
 */
function isTestPhone(phone: string): boolean {
  const accounts = getTestAccounts();
  return accounts.some((acc) => acc.phone === phone);
}

/**
 * Sends a one-time password SMS to the given phone number.
 * Works for both login and registration flows.
 *
 * In development: if phone matches any TEST_PHONE_* env var, skips real OTP send.
 *
 * @param rawPhone - Phone number in any accepted format
 * @returns AuthActionResult indicating success or failure
 */
export async function sendOtp(rawPhone: string): Promise<AuthActionResult> {
  const supabase = createServerClient();
  const phone = normalizePhone(rawPhone);

  // Dev bypass: skip real SMS for test accounts
  if (isTestPhone(phone)) {
    console.info("[Auth] Test OTP bypass — skipping real SMS for", maskPhoneNumber(phone));
    return { success: true };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    // Never log the raw phone — mask per UU PDP / RULES §8
    console.error(
      "[Auth] OTP send failed for",
      maskPhoneNumber(phone),
      "—",
      error.message,
    );
    return {
      success: false,
      error: "Gagal mengirim kode OTP. Periksa nomor telepon Anda.",
      code: "OTP_SEND_FAILED",
    };
  }

  return { success: true };
}

/**
 * Verifies a 6-digit OTP token against Supabase Auth.
 * Returns profile context so the caller can choose the correct redirect.
 *
 * In development: if TEST_PHONE + TEST_OTP env vars match, creates/retrieves
 * the test user via admin API instead of real OTP verification.
 *
 * @param rawPhone - Phone number that received the OTP
 * @param token    - 6-digit code from the user's SMS
 * @returns VerifyOtpResult with session info and first-login flag
 */
export async function verifyOtp(
  rawPhone: string,
  token: string,
): Promise<VerifyOtpResult> {
  const supabase = createServerClient();
  const phone = normalizePhone(rawPhone);

  // Dev bypass: test account with pre-generated OTP
  const testAccount = findTestAccount(phone, token);
  if (testAccount) {
    console.info("[Auth] Test OTP bypass — signing in test user", maskPhoneNumber(phone));

    // Use admin client to create or retrieve the test user
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Check if user already exists (compare with and without + prefix)
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const phoneDigits = phone.replace("+", "");
    let testUser = existingUsers?.users?.find(
      (u) => u.phone === phone || u.phone === phoneDigits || `+${u.phone}` === phone,
    );

    if (!testUser) {
      // Create the test user with phone confirmed
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: { display_name: "Test User" },
      });

      if (createError || !created.user) {
        console.error("[Auth] Failed to create test user:", createError?.message);
        return {
          success: false,
          error: "Gagal membuat akun test.",
          code: "TEST_USER_CREATE_FAILED",
        };
      }
      testUser = created.user;
    }

    // Set a password for the test user so we can sign in via signInWithPassword
    await admin.auth.admin.updateUserById(testUser.id, {
      phone,
      phone_confirm: true,
      password: "threadify-test-2026",
    });

    // Sign in with phone + password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone,
      password: "threadify-test-2026",
    });

    if (signInError || !signInData.user) {
      console.error("[Auth] Test sign-in failed:", signInError?.message);
      return {
        success: false,
        error: "Gagal masuk akun test.",
        code: "TEST_SIGN_IN_FAILED",
      };
    }

    // Check profile — create if missing (handles case where user was created before migration)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", signInData.user.id)
      .single();

    if (!profile) {
      const { error: insertErr } = await admin.from("profiles").insert({
        id: signInData.user.id,
        user_id: signInData.user.id,
        username: "user_" + phone.replace("+62", "").slice(0, 8),
        display_name: "Test User",
        bio: "Akun testing Threadify",
      });
      if (insertErr) {
        console.error("[Auth] Failed to create test profile:", insertErr.message);
      }
      return {
        success: true,
        isFirstLogin: true,
        username: "user_" + phone.replace("+62", "").slice(0, 8),
      };
    }

    return {
      success: true,
      isFirstLogin: profile?.username_changed_at === null,
      username: profile?.username ?? undefined,
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error || !data.user) {
    return {
      success: false,
      error: "Kode OTP tidak valid atau sudah kedaluwarsa.",
      code: "OTP_INVALID",
    };
  }

  // Determine whether this is a first-time registration by checking
  // if the user has ever explicitly set a username (username_changed_at is NULL by default).
  // Use select("*") to avoid Supabase SDK column-string type parsing edge cases.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  return {
    success: true,
    isFirstLogin: profile?.username_changed_at === null,
    username: profile?.username ?? undefined,
  };
}

/**
 * Updates display_name and username for a newly registered user.
 * Must be called once, immediately after the first OTP verification.
 *
 * @param displayName - User's chosen display name (1–60 chars)
 * @param username    - User's chosen username slug (3–30 chars, [a-zA-Z0-9_])
 * @returns AuthActionResult indicating success or failure
 */
export async function updateProfileOnRegister(
  displayName: string,
  username: string,
): Promise<AuthActionResult> {
  const supabase = createServerClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return {
      success: false,
      error: "Sesi tidak ditemukan. Silakan login kembali.",
      code: "UNAUTHORIZED",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName.trim(),
      username: username.toLowerCase(),
      username_changed_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return {
        success: false,
        error:
          "Username sudah digunakan. Pilih username lain di halaman profil.",
        code: "USERNAME_TAKEN",
      };
    }
    console.error("[Auth] Profile update failed:", error.message);
    return {
      success: false,
      error: "Gagal menyimpan profil. Silakan coba lagi.",
      code: "PROFILE_UPDATE_FAILED",
    };
  }

  return { success: true };
}

/**
 * Signs the current user out and redirects to /login.
 * Intended to be bound directly to a Server Action form or button.
 */
export async function signOut(): Promise<void> {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
