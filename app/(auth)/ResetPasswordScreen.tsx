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

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      // TODO: This should call a Cloud Function to securely update the user's password
      // For now, we're storing the request in Firestore
      // A Cloud Function should verify the email and hash, then update Firebase Auth password

      await updateDoc(doc(db, "passwordResets", email as string), {
        newPassword: newPassword,
        resetConfirmed: true,
      });

      Alert.alert(
        "Success",
        "Password will be updated. Please log in with your new password.",
      );

      router.replace("/(auth)/LoginScreen");
    } catch (error: any) {
      Alert.alert("Error", error.message);
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

      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Reset Password</Text>
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
