import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "@/config/firebase";

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#045385" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="always"
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

      <Text style={styles.instructions}>
        Enter your details to create an account
      </Text>

      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#666"
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#666"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Phone Number"
        placeholderTextColor="#666"
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      <TextInput
        placeholder="Address"
        placeholderTextColor="#666"
        style={styles.input}
        value={address}
        onChangeText={setAddress}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#666"
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

      <Text style={styles.switchText}>
        Already have an account?{" "}
        <Text
          style={styles.switchLink}
          onPress={() => router.replace("/(auth)/LoginScreen")}
        >
          Login here
        </Text>
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 80,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  instructions: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    color: "#000",
    width: "100%",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  button: {
    backgroundColor: "#1e88e5",
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  switchText: {
    color: "#fff",
    marginTop: 15,
    textAlign: "center",
  },
  switchLink: {
    color: "#90caf9",
    fontWeight: "bold",
  },
});
