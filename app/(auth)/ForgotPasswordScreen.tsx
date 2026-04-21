import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { EMAILJS_CONFIG } from "@/config/email";

import { storePendingOtp } from "@/config/otpStore";

/** Generate a 6-digit OTP string. */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP email via the EmailJS REST API directly.
 * Using fetch instead of the @emailjs/react-native SDK because the SDK's
 * send() method (v4.x) does not forward `accessToken` in the request body,
 * which is required when EmailJS Strict Mode is enabled on the account.
 */
async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const body = JSON.stringify({
    service_id: EMAILJS_CONFIG.SERVICE_ID,
    template_id: EMAILJS_CONFIG.TEMPLATE_ID,
    user_id: EMAILJS_CONFIG.PUBLIC_KEY,
    accessToken: EMAILJS_CONFIG.PRIVATE_KEY,
    template_params: {
      email: toEmail,
      otp,
    },
  });

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`EmailJS error: ${detail}`);
  }
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      // ── 1. Generate OTP and hold it in the in-memory store ───────────────
      const otp = generateOtp();
      storePendingOtp(trimmedEmail, otp);

      // ── 2. Send the OTP email via EmailJS REST API ────────────────────────
      await sendOtpEmail(trimmedEmail, otp);

      // ── 3. Navigate to OTP entry screen ──────────────────────────────────
      router.push({
        pathname: "/(auth)/OTPScreen",
        params: { email: trimmedEmail },
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Failed to send OTP. Please check your connection and try again.";
      console.error("[ForgotPassword] handleSendOTP error:", e);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your registered email and we will send you a one-time password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={handleSendOTP}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.back}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#045385",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#cce4f7",
    marginBottom: 24,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 15,
    color: "#333",
  },
  button: {
    backgroundColor: "#1e88e5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  back: {
    color: "#90caf9",
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
  },
});
