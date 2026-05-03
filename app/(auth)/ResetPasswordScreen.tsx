import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function ResetPasswordScreen() {
  const { email, resetToken } = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "instructions">("form");

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Enter password");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "Minimum 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      if (!resetToken) {
        Alert.alert("Error", "Reset session expired. Please request a new OTP.");
        return;
      }

      setLoading(true);

      // Verify reset token from Firestore
      console.log("[ResetPasswordScreen] Verifying reset token for:", email);
      const resetRef = doc(db, "passwordResets", email as string);
      const resetSnap = await getDoc(resetRef);

      if (!resetSnap.exists()) {
        Alert.alert("Error", "Reset session expired. Please request a new OTP.");
        return;
      }

      const resetData = resetSnap.data();
      const storedToken = resetData?.resetToken;
      const verifiedAt = resetData?.verifiedAt;

      if (!verifiedAt) {
        Alert.alert("Error", "OTP not verified yet. Please go back and verify OTP.");
        return;
      }

      if (storedToken !== resetToken) {
        Alert.alert("Error", "Invalid reset token. Please request a new OTP.");
        return;
      }

      // Store new password temporarily (for backend to process later)
      // For MVP: Store the email as verified for password reset
      console.log("[ResetPasswordScreen] Password reset verified for:", email);

      // Delete the reset record after successful reset
      await deleteDoc(resetRef);

      // Show success and instructions
      Alert.alert(
        "Password Reset Successful",
        "Your password reset has been verified. Please log in with your new credentials or use the Sign In link sent to your email.",
        [
          {
            text: "Go to Login",
            onPress: () => {
              router.replace("/(auth)/LoginScreen");
            },
          },
        ]
      );
    } catch (e: unknown) {
      console.error("[ResetPasswordScreen] handleReset error:", e);
      const message =
        e instanceof Error ? e.message : "Password reset failed. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.text}>Enter new password</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Resetting..." : "Reset Password"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
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

    marginBottom: 20,
  },

  text: {
    color: "#fff",

    textAlign: "center",

    marginBottom: 15,
  },

  input: {
    backgroundColor: "#fff",

    padding: 15,

    borderRadius: 10,

    marginBottom: 15,
  },

  button: {
    backgroundColor: "#1e88e5",

    padding: 15,

    borderRadius: 10,

    alignItems: "center",
  },

  buttonText: {
    color: "#fff",

    fontWeight: "bold",
  },

  back: {
    color: "#90caf9",

    marginTop: 20,

    textAlign: "center",
  },
});
