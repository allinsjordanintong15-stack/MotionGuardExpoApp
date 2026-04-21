"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyPasswordResetOtp = exports.requestPasswordReset = void 0;
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function generateOtp() {
    // 6 digits, avoids leading zeros issues by forcing range
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function sha256Hex(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}
function nowMs() {
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
exports.requestPasswordReset = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        const emailRaw = (req.body?.email ?? "");
        const email = normalizeEmail(emailRaw);
        if (!email || !email.includes("@")) {
            res.status(400).json({ ok: false, error: "Invalid email" });
            return;
        }
        // Verify the email actually exists in Firebase Auth.
        // Return a generic ok:true on failure to prevent email enumeration.
        try {
            await admin.auth().getUserByEmail(email);
        }
        catch {
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
        await admin.firestore().collection("passwordResets").doc(email).set({
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
        }, { merge: false });
        // Return the OTP to the client.
        // The client (ForgotPasswordScreen) will send the email via
        // @emailjs/react-native, which is designed to work in React Native / Expo Go.
        res.json({ ok: true, otp });
    }
    catch (e) {
        logger.error("requestPasswordReset failed", e);
        res
            .status(500)
            .json({ ok: false, error: "Failed to process reset request" });
    }
});
/**
 * POST /verifyPasswordResetOtp
 * body: { email: string, otp: string }
 *
 * If OTP matches and is not expired, returns a short-lived resetToken.
 */
exports.verifyPasswordResetOtp = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        const email = normalizeEmail((req.body?.email ?? ""));
        const otp = (req.body?.otp ?? "").trim();
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
        const data = snap.data();
        const expiresAt = data.expiresAt;
        if (!expiresAt || nowMs() > expiresAt.toMillis()) {
            res.status(400).json({ ok: false, error: "OTP expired" });
            return;
        }
        const attempts = Number(data.attempts ?? 0);
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
        const resetTokenExpiresAt = admin.firestore.Timestamp.fromMillis(nowMs() + resetTokenTtlMs);
        await ref.update({
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            resetTokenHash,
            resetTokenSalt,
            resetTokenExpiresAt,
            attempts, // keep attempts as-is on success
        });
        res.json({ ok: true, resetToken });
    }
    catch (e) {
        logger.error("verifyPasswordResetOtp failed", e);
        res.status(500).json({ ok: false, error: "Verification failed" });
    }
});
/**
 * POST /resetPassword
 * body: { email: string, resetToken: string, newPassword: string }
 *
 * Securely updates Firebase Auth password using Admin SDK.
 */
exports.resetPassword = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        const email = normalizeEmail((req.body?.email ?? ""));
        const resetToken = (req.body?.resetToken ?? "").trim();
        const newPassword = (req.body?.newPassword ?? "");
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
        const data = snap.data();
        const resetTokenExpiresAt = data.resetTokenExpiresAt;
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
    }
    catch (e) {
        logger.error("resetPassword failed", e);
        res.status(500).json({ ok: false, error: "Password reset failed" });
    }
});
