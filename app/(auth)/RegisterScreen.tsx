import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "../config/firebase";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !phoneNumber || !address || !password) {
      Alert.alert("Error", "Please complete all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
      // Save additional user info to Firestore
      await setDoc(doc(db, "users", uid), {
        fullName,
        email,
        phoneNumber,
        address,
        role: "user",
        notificationEnabled: true,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Account created successfully!");

      router.replace("/(auth)/LoginScreen");
    } catch (error: any) {
      Alert.alert("Register Error", error.message);
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
      {/* Logo */}
      <Image
        source={require("../assets/images/shield-logo.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Register to access the Motion Alert System
      </Text>

      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#131212"
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#131212"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Phone Number"
        placeholderTextColor="#131212"
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      <TextInput
        placeholder="Address"
        placeholderTextColor="#131212"
        style={styles.input}
        value={address}
        onChangeText={setAddress}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#131212"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Text
          style={styles.loginLink}
          onPress={() => router.replace("/(auth)/LoginScreen")}
        >
          Login here
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#045385",
    padding: 30,
    paddingBottom: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    color: "#131212",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#131212",
    fontSize: 14,
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#cdd1e6",
    color: "#131212",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007BFF",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: {
    color: "#131212",
    fontWeight: "bold",
  },
  loginText: {
    color: "#131212",
    marginTop: 15,
    textAlign: "center",
  },
  loginLink: {
    color: "#007BFF",
    fontWeight: "bold",
  },
});
