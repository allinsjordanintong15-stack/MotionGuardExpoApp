import { router } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../config/firebase";
import { ThemeContext } from "../config/ThemeContext";

export default function Profile() {
  const theme = useContext(ThemeContext);
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(auth)/LoginScreen");
  };
  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "This action is permanent. Continue?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (user) {
            await deleteUser(user);
            router.replace("/(auth)/LoginScreen");
          }
        },
      },
    ]);
  };

  if (!user)
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>Profile</Text>

      {/* Personal Info */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Personal Information
        </Text>
        <Text style={{ color: theme.text }}>
          Full Name: {user.displayName || "Not Set"}
        </Text>
        <Text style={{ color: theme.text }}>Email: {user.email}</Text>
        <Text style={{ color: theme.text }}>
          Account Created: {user.metadata.creationTime}
        </Text>
      </View>

      {/* Security */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Security
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/ChangePasswordScreen")}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <Text style={{ color: theme.subText }}>App Version: 1.0.0</Text>
        <Text style={{ color: theme.subText }}>
          Developer: Allins Jordan Intong
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: { padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
  sectionTitle: { fontWeight: "bold", marginBottom: 15, fontSize: 16 },
  button: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  logoutButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#333",
  },
  deleteButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#ff3b30",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
