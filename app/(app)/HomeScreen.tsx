import { onValue, ref, update } from "firebase/database";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { useContext, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ThemeContext } from "../config/ThemeContext";
import { auth, db, rtdb } from "../config/firebase";

const DEVICE_ID = "MG001"; // testing device

interface SystemStatus {
  motionDetected: boolean;
  wifiStatus: string;
  location: string;
  timestamp: number;
}

interface MotionLog {
  id: string;
  location: string;
  detected: boolean;
  timestamp: any;
}

export default function Dashboard() {
  const theme = useContext(ThemeContext);

  const [status, setStatus] = useState<SystemStatus>({
    motionDetected: false,
    wifiStatus: "offline",
    location: "Main Door",
    timestamp: Date.now(),
  });

  const [logs, setLogs] = useState<MotionLog[]>([]);
  const [todayDetections, setTodayDetections] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // FIRESTORE LOGS LISTENER

    const logsQuery = query(
      collection(db, "motionLogs", DEVICE_ID, "logs"),
      orderBy("timestamp", "desc"),
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MotionLog[];

      setLogs(data.slice(0, 5));

      const now = Date.now();

      const today = data.filter(
        (log) =>
          log.timestamp?.toDate &&
          now - log.timestamp.toDate().getTime() < 86400000,
      );

      setTodayDetections(today.length);

      setLoading(false);
    });

    // REALTIME DATABASE LISTENER

    const deviceRef = ref(rtdb, `devices/${DEVICE_ID}`);

    const unsubscribeMotion = onValue(deviceRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();

      const motionDetected =
        data.motion_detected === true || data.motion_detected === "true";

      const wifiStatus = (data.wifi_status || "offline").toLowerCase();

      setStatus({
        motionDetected,
        wifiStatus,
        location: data.location || "Main Door",
        timestamp: Date.now(),
      });

      // MOTION EVENT

      if (motionDetected) {
        Alert.alert("Motion Detected!", data.location || "Sensor triggered");

        try {
          await addDoc(collection(db, "motionLogs", DEVICE_ID, "logs"), {
            detected: true,
            location: data.location || "Main Door",
            timestamp: serverTimestamp(),
          });

          // reset motion flag only
          await update(deviceRef, {
            motion_detected: false,
          });
        } catch (error) {
          console.log(error);
        }
      }
    });

    return () => {
      unsubscribeLogs();
      unsubscribeMotion();
    };
  }, [userId]);

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>

      <View style={styles.row}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statTitle, { color: theme.subText }]}>
            Motion Detected
          </Text>

          <Text
            style={[
              styles.statNumber,
              {
                color: status.motionDetected ? "#ff3b30" : "#28a745",
              },
            ]}
          >
            {status.motionDetected ? "YES" : "NO"}
          </Text>

          <Text style={[styles.smallText, { color: theme.subText }]}>
            Location: {status.location}
          </Text>

          <Text style={[styles.smallText, { color: theme.subText }]}>
            Time: {new Date(status.timestamp).toLocaleTimeString()}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statTitle, { color: theme.subText }]}>
            Today's Detections
          </Text>

          <Text style={[styles.statNumber, { color: theme.text }]}>
            {todayDetections}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statTitle, { color: theme.subText }]}>
            WiFi Status
          </Text>

          <Text
            style={[
              styles.statNumber,
              {
                color: status.wifiStatus === "online" ? "#28a745" : "#ff3b30",
              },
            ]}
          >
            {status.wifiStatus}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.logsCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.logsTitle, { color: theme.text }]}>
          Recent Motion Events
        </Text>

        {logs.length === 0 ? (
          <Text
            style={{
              color: theme.subText,
            }}
          >
            No motion detected yet
          </Text>
        ) : (
          logs.map((log) => (
            <View
              key={log.id}
              style={[styles.logRow, { borderBottomColor: theme.border }]}
            >
              <View>
                <Text style={[styles.logLocation, { color: theme.text }]}>
                  {log.location}
                </Text>

                <Text style={[styles.logSensor, { color: theme.subText }]}>
                  Device: {DEVICE_ID}
                </Text>
              </View>

              <Text style={[styles.logTime, { color: theme.subText }]}>
                {log.timestamp?.toDate
                  ? log.timestamp.toDate().toLocaleString()
                  : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  statCard: {
    padding: 20,
    borderRadius: 15,
    width: "48%",
    elevation: 3,
  },

  statTitle: {
    fontSize: 14,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
  },

  smallText: {
    fontSize: 12,
    marginTop: 5,
  },

  logsCard: {
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    elevation: 3,
  },

  logsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },

  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 0.5,
    paddingBottom: 8,
  },

  logLocation: {
    fontWeight: "bold",
  },

  logSensor: {
    fontSize: 12,
  },

  logTime: {
    fontSize: 12,
  },
});
