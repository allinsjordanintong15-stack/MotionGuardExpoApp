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
import { auth, db } from "@/config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/** Generate a 6-digit OTP string. */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP email via the EmailJS REST API directly.
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

      // Check if email exists in Firebase Auth and send password reset email
      console.log("[ForgotPassword] Sending Firebase password reset email to:", trimmedEmail);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        console.log("[ForgotPassword] Firebase reset email sent");
      } catch (authError: any) {
        if (authError.code === "auth/user-not-found") {
          console.log("[ForgotPassword] User not found, but continuing with OTP");
          // User not found, but don't reveal this - continue anyway
        }
        // Other auth errors - continue anyway
      }

      // Generate OTP for extra verification layer
      const otp = generateOtp();
      console.log("[ForgotPassword] Generated OTP for email:", trimmedEmail);

      // Store OTP in Firestore with expiration
      const otpRef = doc(db, "passwordResets", trimmedEmail);
      const ttlMs = 5 * 60 * 1000; // 5 minutes
      const expiresAt = new Date(Date.now() + ttlMs);

      await setDoc(otpRef, {
        otp,
        email: trimmedEmail,
        expiresAt,
        attempts: 0,
        createdAt: serverTimestamp(),
      });

      console.log("[ForgotPassword] Stored OTP in Firestore, sending email...");

      // Send the OTP email via EmailJS
      await sendOtpEmail(trimmedEmail, otp);

      console.log("[ForgotPassword] Email sent successfully");

      // Navigate to OTP entry screen
      Alert.alert(
        "OTP Sent",
        "We have sent a one-time password to " + trimmedEmail + ". We've also sent a password reset link to your email. You can use either method to reset your password.",
      );
      router.push({
        pathname: "/(auth)/OTPScreen",
        params: { email: trimmedEmail },
      });
    } catch (e: unknown) {
      console.error("[ForgotPassword] handleSendOTP error:", e);
      let message = "Failed to send OTP. Please check your connection and try again.";

      if (e instanceof Error) {
        message = e.message;
        // Check if it's a network error
        if (message.includes("Failed to fetch") || message.includes("Network")) {
          message = "Network error. Please check your internet connection and try again.";
        }
      }

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
