import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "@/config/firebase";
import {
  verifyPendingOtp,
  getOtpTimeRemainingMs,
  clearPendingOtp,
} from "@/config/otpStore";

/** Format milliseconds as M:SS */
function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function OTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => getOtpTimeRemainingMs());

  // Countdown timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const remaining = getOtpTimeRemainingMs();
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isExpired = timeLeft <= 0;

  const handleVerify = async () => {
    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      Alert.alert(
        "Enter OTP",
        "Please enter the 6-digit code sent to your email.",
      );
      return;
    }

    if (!email) {
      Alert.alert("Error", "Session expired. Please go back and try again.");
      return;
    }

    if (isExpired) {
      Alert.alert(
        "OTP Expired",
        "This code has expired. Please go back and request a new one.",
      );
      return;
    }

    try {
      setLoading(true);

      // ── 1. Verify OTP against the in-memory store ────────────────────────
      const result = verifyPendingOtp(email, trimmedOtp);

      if (!result.ok) {
        switch (result.reason) {
          case "not_found":
            Alert.alert(
              "Session Expired",
              "No active OTP found. Please go back and request a new code.",
            );
            break;
          case "expired":
            Alert.alert(
              "OTP Expired",
              "This code has expired. Please go back and request a new one.",
            );
            break;
          case "too_many_attempts":
            Alert.alert(
              "Too Many Attempts",
              "You have entered the wrong code too many times. Please go back and request a new OTP.",
            );
            break;
          case "wrong_otp":
            Alert.alert(
              "Incorrect Code",
              "The code you entered is wrong. Please try again.",
            );
            break;
        }
        return;
      }

      // ── 2. OTP is correct – trigger Firebase password reset email ────────
      // sendPasswordResetEmail works on any Firebase plan (Spark or Blaze)
      // and requires no Cloud Functions. Firebase will send a secure reset
      // link to the user's inbox; they click it to set a new password.
      await sendPasswordResetEmail(auth, email);

      // OTP already cleared by verifyPendingOtp on success; clear timer.
      if (timerRef.current) clearInterval(timerRef.current);

      Alert.alert(
        "Check Your Email",
        "Your identity has been verified.\n\nWe have sent a password reset link to " +
          email +
          ". Open that email and tap the link to set your new password.",
        [
          {
            text: "Back to Login",
            onPress: () => router.replace("/(auth)/LoginScreen"),
          },
        ],
      );
    } catch (e: unknown) {
      console.error("[OTPScreen] handleVerify error:", e);
      const message =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    clearPendingOtp();
    router.replace("/(auth)/ForgotPasswordScreen");
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Enter OTP</Text>

      <Text style={styles.subtitle}>
        A 6-digit code was sent to{"\n"}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      {!isExpired ? (
        <Text style={styles.timer}>Expires in {formatCountdown(timeLeft)}</Text>
      ) : (
        <Text style={styles.timerExpired}>
          Code expired — go back to request a new one.
        </Text>
      )}

      <TextInput
        style={[styles.input, isExpired && styles.inputDisabled]}
        placeholder="• • • • • •"
        placeholderTextColor="#aaa"
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={handleVerify}
        editable={!loading && !isExpired}
      />

      <TouchableOpacity
        style={[styles.button, (loading || isExpired) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || isExpired}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleBack}
        disabled={loading}
        activeOpacity={0.7}
        style={styles.backButton}
      >
        <Text style={styles.back}>← Request a new code</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 30,
    paddingBottom: 50,
    backgroundColor: "#045385",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: "#cce4f7",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  emailText: {
    color: "#fff",
    fontWeight: "600",
  },
  timer: {
    color: "#90caf9",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 24,
  },
  timerExpired: {
    color: "#ef9a9a",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 10,
    fontWeight: "700",
    color: "#045385",
  },
  inputDisabled: {
    opacity: 0.5,
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
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  back: {
    color: "#90caf9",
    textAlign: "center",
    fontSize: 14,
  },
});
