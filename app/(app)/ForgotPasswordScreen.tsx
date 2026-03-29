import emailjs from "@emailjs/browser";
import { router } from "expo-router";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { EMAILJS_CONFIG } from "../config/email";
import { db } from "../config/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Enter your email");

      return;
    }

    try {
      setLoading(true);

      const otp = generateOTP();

      await setDoc(
        doc(db, "passwordResets", email),

        {
          otp: otp,

          expiresAt: Timestamp.fromDate(new Date(Date.now() + 300000)),
        },
      );

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,

        EMAILJS_CONFIG.TEMPLATE_ID,

        {
          email: email,
          otp: otp,
        },

        EMAILJS_CONFIG.PUBLIC_KEY,
      );

      Alert.alert("OTP Sent", "Check your email");

      router.push({
        pathname: "/(auth)/OTPScreen",

        params: { email },
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <Text style={styles.text}>Enter your registered email</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
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

    marginBottom: 20,

    textAlign: "center",
  },

  text: {
    color: "#fff",

    marginBottom: 10,

    textAlign: "center",
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
