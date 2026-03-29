import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { db } from "../config/firebase";

export default function OTPScreen() {
  const { email } = useLocalSearchParams();

  const [otp, setOTP] = useState("");

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert("Enter OTP");
      return;
    }

    const ref = doc(db, "passwordResets", email as string);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      Alert.alert("No OTP found");
      return;
    }

    const data = snap.data();

    if (Date.now() > data.expiresAt.toDate()) {
      Alert.alert("OTP expired");

      return;
    }

    if (data.otp === otp) {
      Alert.alert("Success", "OTP verified. Enter your new password.");
      router.push({
        pathname: "./ResetPasswordScreen",
        params: { email },
      });
    } else {
      Alert.alert("Wrong OTP");
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
      <Text style={styles.title}>Enter OTP</Text>

      <Text style={styles.text}>Check your email for OTP</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOTP}
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/LoginScreen")}>
        <Text style={styles.back}>Back to Login</Text>
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

    textAlign: "center",

    fontSize: 18,

    letterSpacing: 5,
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
