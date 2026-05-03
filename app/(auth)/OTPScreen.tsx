import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { clearPendingOtp } from "@/config/otpStore";
import { db } from "@/config/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export default function OTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

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

    try {
      setLoading(true);

      // Verify OTP from Firestore
      console.log("[OTPScreen] Verifying OTP for email:", email);
      const resetRef = doc(db, "passwordResets", email);
      const resetSnap = await getDoc(resetRef);

      if (!resetSnap.exists()) {
        Alert.alert(
          "Session Expired",
          "No active OTP found. Please go back and request a new code.",
        );
        return;
      }

      const resetData = resetSnap.data();
      const storedOtp = resetData?.otp;
      const expiresAt = resetData?.expiresAt;
      const attempts = resetData?.attempts || 0;

      // Check expiration
      if (expiresAt && new Date() > expiresAt.toDate()) {
        Alert.alert(
          "OTP Expired",
          "This code has expired. Please go back and request a new one.",
        );
        return;
      }

      // Check attempts
      if (attempts >= 5) {
        Alert.alert(
          "Too Many Attempts",
          "You have entered the wrong code too many times. Please go back and request a new OTP.",
        );
        return;
      }

      // Verify OTP
      if (storedOtp !== trimmedOtp) {
        await updateDoc(resetRef, { attempts: attempts + 1 });
        Alert.alert(
          "Incorrect Code",
          "The code you entered is wrong. Please try again.",
        );
        return;
      }

      // OTP verified - generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      await updateDoc(resetRef, {
        verifiedAt: serverTimestamp(),
        resetToken,
      });

      console.log("[OTPScreen] OTP verified successfully");

      // Navigate to reset password screen
      router.push({
        pathname: "/(auth)/ResetPasswordScreen",
        params: { email, resetToken },
      });
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

      <TextInput
        style={styles.input}
        placeholder="• • • • • •"
        placeholderTextColor="#aaa"
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={handleVerify}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
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
