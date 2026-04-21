import * as crypto from "node:crypto";

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateOtp(): string {
  // 6 digits, avoids leading zeros issues by forcing range
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function nowMs(): number {
  return Date.now();
}

/**
 * POST /requestPasswordReset
 * body: { email: string }
 *
 * Validates the email exists in Firebase Auth, then creates (or replaces)
 * a reset record with a hashed OTP in Firestore.
 * Returns the OTP plaintext to the client so the client can send the email
 * via @emailjs/react-native (avoids needing server-side email credentials).
 */
export const requestPasswordReset = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const emailRaw = (req.body?.email ?? "") as string;
      const email = normalizeEmail(emailRaw);
      if (!email || !email.includes("@")) {
        res.status(400).json({ ok: false, error: "Invalid email" });
        return;
      }

      // Verify the email actually exists in Firebase Auth.
      // Return a generic ok:true on failure to prevent email enumeration.
      try {
        await admin.auth().getUserByEmail(email);
      } catch {
        logger.info("requestPasswordReset: email not found in Auth", { email });
        // Respond with ok:true but no otp so the client shows "check your email"
        // without revealing that no account exists.
        res.json({ ok: true });
        return;
      }

      const otp = generateOtp();
      const salt = crypto.randomBytes(16).toString("hex");
      const otpHash = sha256Hex(`${salt}:${otp}`);

      const ttlMs = 5 * 60 * 1000; // 5 minutes
      const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs() + ttlMs);

      await admin.firestore().collection("passwordResets").doc(email).set(
        {
          otpHash,
          salt,
          email,
          expiresAt,
          attempts: 0,
          verifiedAt: null,
          resetTokenHash: null,
          resetTokenSalt: null,
          resetTokenExpiresAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: false },
      );

      // Return the OTP to the client.
      // The client (ForgotPasswordScreen) will send the email via
      // @emailjs/react-native, which is designed to work in React Native / Expo Go.
      res.json({ ok: true, otp });
    } catch (e: unknown) {
      logger.error("requestPasswordReset failed", e);
      res
        .status(500)
        .json({ ok: false, error: "Failed to process reset request" });
    }
  },
);

/**
 * POST /verifyPasswordResetOtp
 * body: { email: string, otp: string }
 *
 * If OTP matches and is not expired, returns a short-lived resetToken.
 */
export const verifyPasswordResetOtp = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const email = normalizeEmail((req.body?.email ?? "") as string);
      const otp = ((req.body?.otp ?? "") as string).trim();

      if (!email || !email.includes("@") || otp.length < 4) {
        res.status(400).json({ ok: false, error: "Invalid payload" });
        return;
      }

      const ref = admin.firestore().collection("passwordResets").doc(email);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ ok: false, error: "No OTP found" });
        return;
      }

      const data = snap.data() as Record<string, unknown>;
      const expiresAt = data.expiresAt as admin.firestore.Timestamp;
      if (!expiresAt || nowMs() > expiresAt.toMillis()) {
        res.status(400).json({ ok: false, error: "OTP expired" });
        return;
      }

      const attempts: number = Number(data.attempts ?? 0);
      if (attempts >= 5) {
        res.status(429).json({ ok: false, error: "Too many attempts" });
        return;
      }

      const expectedHash = String(data.otpHash ?? "");
      const salt = String(data.salt ?? "");
      const providedHash = sha256Hex(`${salt}:${otp}`);

      if (!expectedHash || providedHash !== expectedHash) {
        await ref.update({ attempts: attempts + 1 });
        res.status(400).json({ ok: false, error: "Wrong OTP" });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenSalt = crypto.randomBytes(16).toString("hex");
      const resetTokenHash = sha256Hex(`${resetTokenSalt}:${resetToken}`);
      const resetTokenTtlMs = 10 * 60 * 1000; // 10 minutes
      const resetTokenExpiresAt = admin.firestore.Timestamp.fromMillis(
        nowMs() + resetTokenTtlMs,
      );

      await ref.update({
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        resetTokenHash,
        resetTokenSalt,
        resetTokenExpiresAt,
        attempts, // keep attempts as-is on success
      });

      res.json({ ok: true, resetToken });
    } catch (e: unknown) {
      logger.error("verifyPasswordResetOtp failed", e);
      res.status(500).json({ ok: false, error: "Verification failed" });
    }
  },
);

/**
 * POST /resetPassword
 * body: { email: string, resetToken: string, newPassword: string }
 *
 * Securely updates Firebase Auth password using Admin SDK.
 */
export const resetPassword = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const email = normalizeEmail((req.body?.email ?? "") as string);
    const resetToken = ((req.body?.resetToken ?? "") as string).trim();
    const newPassword = (req.body?.newPassword ?? "") as string;

    if (!email || !email.includes("@")) {
      res.status(400).json({ ok: false, error: "Invalid email" });
      return;
    }
    if (!resetToken || resetToken.length < 20) {
      res.status(400).json({ ok: false, error: "Invalid reset token" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ ok: false, error: "Weak password" });
      return;
    }

    const ref = admin.firestore().collection("passwordResets").doc(email);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: "No reset request found" });
      return;
    }

    const data = snap.data() as Record<string, unknown>;
    const resetTokenExpiresAt =
      data.resetTokenExpiresAt as admin.firestore.Timestamp;
    if (!resetTokenExpiresAt || nowMs() > resetTokenExpiresAt.toMillis()) {
      res.status(400).json({ ok: false, error: "Reset token expired" });
      return;
    }

    const resetTokenSalt = String(data.resetTokenSalt ?? "");
    const expectedHash = String(data.resetTokenHash ?? "");
    const providedHash = sha256Hex(`${resetTokenSalt}:${resetToken}`);
    if (!expectedHash || providedHash !== expectedHash) {
      res.status(400).json({ ok: false, error: "Invalid reset token" });
      return;
    }

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });

    // Invalidate the reset token & OTP record after success.
    await ref.delete().catch(() => undefined);

    res.json({ ok: true });
  } catch (e: unknown) {
    logger.error("resetPassword failed", e);
    res.status(500).json({ ok: false, error: "Password reset failed" });
  }
});
