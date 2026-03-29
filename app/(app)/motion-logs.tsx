import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";
import { ThemeContext } from "../config/ThemeContext";

interface MotionLog {
  id: string;
  location: string;
  sensorID: string;
  timestamp: any;
}

export default function MotionLogs() {
  const theme = useContext(ThemeContext);
  const [logs, setLogs] = useState<MotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, `users/${userId}/motionLogs`),
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

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Motion Logs</Text>
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
            <Text style={[styles.location, { color: theme.text }]}>
              {item.location}
            </Text>
            <Text style={{ color: theme.subText }}>
              Sensor: {item.sensorID}
            </Text>
            <Text style={{ color: theme.subText }}>
              {item.timestamp?.toDate
                ? item.timestamp.toDate().toLocaleString()
                : "No timestamp"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text
            style={{ color: theme.subText, marginTop: 40, textAlign: "center" }}
          >
            No motion logs available.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 15 },
  logCard: { padding: 20, borderRadius: 15, marginBottom: 15 },
  location: { fontSize: 18, fontWeight: "bold" },
});
