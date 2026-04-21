import { router } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "@/config/firebase";
import { ThemeContext } from "@/config/ThemeContext";

export default function Profile() {
  const theme = useContext(ThemeContext);
  const user = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  // no local editable form state because edit mode is removed

  useEffect(() => {
    const fetchUserData = async () => {
      console.log("🔍 Profile: Starting to fetch user data");
      console.log("👤 Current user:", user);
      console.log("🆔 User UID:", user?.uid);
      console.log("📛 User displayName:", user?.displayName);

      if (user) {
        try {
          console.log("📡 Fetching from Firestore path: users/" + user.uid);
          const userDoc = await getDoc(doc(db, "users", user.uid));

          console.log("📄 Document exists:", userDoc.exists());
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log("📊 User data from Firestore:", data);
            setUserData(data);
          } else {
            console.log("❌ No user document found in Firestore");
          }
        } catch (error) {
          console.log("❌ Error fetching user data:", error);
        }
      } else {
        console.log("❌ No user logged in");
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user]);

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

  if (loading || !user)
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
          Full Name: {userData?.fullName || user.displayName || "Not Set"}
        </Text>
        <Text style={{ color: theme.text }}>Email: {user.email}</Text>
        <Text style={{ color: theme.text }}>
          Phone: {userData?.phoneNumber || "Not Set"}
        </Text>
        <Text style={{ color: theme.text }}>
          Address: {userData?.address || "Not Set"}
        </Text>
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
        <TouchableOpacity
          style={[styles.deleteButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.buttonText}>Delete Account</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
