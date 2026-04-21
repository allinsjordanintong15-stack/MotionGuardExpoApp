/**
 * otpStore.ts
 *
 * Lightweight in-memory store for a pending password-reset OTP.
 * Because this lives in module scope it survives screen navigation within
 * the same JS runtime, but is cleared when the app is restarted – which is
 * exactly what we want for a short-lived, single-use code.
 *
 * No disk persistence is used intentionally: the OTP is sensitive data and
 * should not outlive the current app session.
 */

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

interface PendingOtp {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

let pending: PendingOtp | null = null;

/**
 * Store a newly generated OTP for the given email address.
 * Any previously stored OTP is overwritten.
 */
export function storePendingOtp(email: string, otp: string): void {
  pending = {
    email: email.trim().toLowerCase(),
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "wrong_otp" };

/**
 * Verify a user-supplied OTP against the stored value.
 *
 * Returns a tagged result so the caller can show an appropriate message.
 * On success the stored OTP is cleared so it cannot be reused.
 * On failure the attempt counter is incremented; after MAX_ATTEMPTS the
 * record is also cleared and the user must request a new OTP.
 */
export function verifyPendingOtp(email: string, inputOtp: string): VerifyResult {
  if (!pending || pending.email !== email.trim().toLowerCase()) {
    return { ok: false, reason: "not_found" };
  }

  if (Date.now() > pending.expiresAt) {
    pending = null;
    return { ok: false, reason: "expired" };
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    pending = null;
    return { ok: false, reason: "too_many_attempts" };
  }

  if (inputOtp.trim() !== pending.otp) {
    pending.attempts += 1;
    if (pending.attempts >= MAX_ATTEMPTS) {
      pending = null;
    }
    return { ok: false, reason: "wrong_otp" };
  }

  // ✅ Correct OTP – clear it so it cannot be reused
  pending = null;
  return { ok: true };
}

/**
 * Returns milliseconds remaining until the current OTP expires,
 * or 0 if there is no pending OTP or it has already expired.
 */
export function getOtpTimeRemainingMs(): number {
  if (!pending) return 0;
  const remaining = pending.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Explicitly discard any pending OTP (e.g. when the user navigates away).
 */
export function clearPendingOtp(): void {
  pending = null;
}
