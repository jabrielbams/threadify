/**
 * Pending OTP session data stored in sessionStorage during the auth flow.
 * Never persisted server-side. Cleared immediately after OTP verification.
 */
export interface PendingOtpSession {
  /** E.164 normalized phone number, e.g. "+628123456789" */
  phone: string;
  /** Registration flow only: user's chosen display name */
  displayName?: string;
  /** Registration flow only: user's chosen username slug */
  username?: string;
}

/** Generic result returned by all auth Server Actions. */
export interface AuthActionResult {
  success: boolean;
  /** User-friendly message in Bahasa Indonesia */
  error?: string;
  /** Machine-readable code for programmatic branching */
  code?: string;
}

/** Extended result from verifyOtp that includes profile context. */
export interface VerifyOtpResult extends AuthActionResult {
  /** True when the user has never set their username (new registration). */
  isFirstLogin?: boolean;
  /** Current username slug from the profiles table. */
  username?: string;
}

/** Shape of the registration form's local state object. */
export interface RegisterFormData {
  displayName: string;
  username: string;
  /** Digit string after +62, e.g. "8123456789" */
  phone: string;
  privacyConsent: boolean;
}
