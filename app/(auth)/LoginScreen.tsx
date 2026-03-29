import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
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
import { auth } from "../config/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 Security States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const MAX_ATTEMPTS = 3;
  const LOCK_DURATION = 30; // seconds

  // ⏳ Countdown Timer Effect
  useEffect(() => {
    let interval: any;

    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
    }

    if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setFailedAttempts(0);
    }

    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  // Forgot Password Function
  const handleForgotPassword = async () => {
    router.push("/(app)/ForgotPasswordScreen");
  };

  const handleLogin = async () => {
    if (isLocked) {
      Alert.alert("Account Locked", `Try again in ${lockTimer} seconds.`);
      return;
    }

    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, password);

      // Reset attempts if success
      setFailedAttempts(0);

      router.replace("/HomeScreen");
    } catch (error: any) {
      let message = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") {
        message = "Account does not exist.";
      } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email format.";
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCK_DURATION);

        Alert.alert(
          "Account Locked",
          `Too many failed attempts. Try again in ${LOCK_DURATION} seconds.`,
        );
      } else {
        Alert.alert(
          "Login Failed",
          `${message}\nRemaining attempts: ${MAX_ATTEMPTS - newAttempts}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#045385" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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

        {/* Title */}
        <Text style={styles.title}>Motion Alert System</Text>
        <Text style={styles.subtitle}>Arduino-Based Security Solution</Text>

        <Text style={styles.instructions}>
          Enter your credentials to access the system
        </Text>

        {/* Email */}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#666"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password */}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, isLocked && { backgroundColor: "#999" }]}
          onPress={handleLogin}
          disabled={loading || isLocked}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Lock Countdown Display */}
        {isLocked && (
          <Text style={styles.lockText}>
            Account locked. Try again in {lockTimer}s
          </Text>
        )}

        {/* Register Link */}
        <Text style={styles.switchText}>
          Don't have an account?{" "}
          <Text
            style={styles.switchLink}
            onPress={() => router.push("/(auth)/RegisterScreen")}
          >
            Register here
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 15,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  switchText: {
    color: "#fff",
    textAlign: "center",
  },
  switchLink: {
    color: "#90caf9",
    fontWeight: "bold",
  },
  lockText: {
    color: "#ffcc00",
    marginBottom: 10,
    fontWeight: "bold",
  },
  forgotText: {
    alignSelf: "flex-end",
    color: "#90caf9",
    marginBottom: 15,
    fontWeight: "bold",
  },
});
