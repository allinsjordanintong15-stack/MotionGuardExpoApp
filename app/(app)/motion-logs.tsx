import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";
import { ThemeContext } from "../config/ThemeContext";

interface MotionLog {
  id: string;
  location: string;
  sensorID?: string;
  timestamp: any;
  detected?: boolean;
  confidence?: number;
  userId?: string;
  triggeredAt?: string;
}

export default function MotionLogs() {
  const theme = useContext(ThemeContext);
  const [logs, setLogs] = useState<MotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const userId = auth.currentUser?.uid;
  const DEVICE_ID = "MG001"; // testing device

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "motionLogs", DEVICE_ID, "logs"),
      orderBy("timestamp", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MotionLog[];
      setLogs(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  const clearAllLogs = async () => {
    Alert.alert(
      "Clear All Motion Logs",
      "Are you sure you want to delete all motion logs? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              const deletePromises = logs.map((log) =>
                deleteDoc(doc(db, "motionLogs", DEVICE_ID, "logs", log.id)),
              );
              await Promise.all(deletePromises);
              console.log("✅ All motion logs cleared");
            } catch (error) {
              console.log("❌ Error clearing logs:", error);
              Alert.alert(
                "Error",
                "Failed to clear motion logs. Please try again.",
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Motion Logs</Text>
        {logs.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: "#ff3b30" }]}
            onPress={clearAllLogs}
            disabled={clearing}
          >
            <Text style={styles.clearButtonText}>
              {clearing ? "Clearing..." : "Clear All"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.logCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.logHeader}>
              <Text style={[styles.location, { color: theme.text }]}>
                📍 {item.location}
              </Text>
              <Text
                style={[
                  styles.detected,
                  { color: item.detected ? "#ff3b30" : "#28a745" },
                ]}
              >
                {item.detected ? "🚨 MOTION DETECTED" : "✓ NO MOTION"}
              </Text>
            </View>

            <View style={styles.logDetails}>
              <Text style={[styles.timestamp, { color: theme.subText }]}>
                🕒{" "}
                {item.timestamp?.toDate
                  ? item.timestamp.toDate().toLocaleString()
                  : item.triggeredAt
                    ? new Date(item.triggeredAt).toLocaleString()
                    : "No timestamp"}
              </Text>

              {item.confidence !== undefined && (
                <Text style={[styles.confidence, { color: theme.subText }]}>
                  🎯 Confidence: {Math.round(item.confidence * 100)}%
                </Text>
              )}

              {item.userId && (
                <Text style={[styles.userId, { color: theme.subText }]}>
                  👤 User: {item.userId.slice(0, 8)}...
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.subText }]}>
              No motion logs available.
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.subText }]}>
              Motion events will appear here when detected.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  logCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  location: { fontSize: 18, fontWeight: "bold" },
  detected: { fontSize: 14, fontWeight: "600" },
  logDetails: { gap: 6 },
  timestamp: { fontSize: 14 },
  confidence: { fontSize: 14 },
  userId: { fontSize: 12, fontStyle: "italic" },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
});
