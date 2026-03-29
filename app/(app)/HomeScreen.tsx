import { get, onValue, ref } from "firebase/database";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemeContext } from "../config/ThemeContext";
import { auth, db, rtdb } from "../config/firebase";

const DEVICE_ID = "MG001"; // testing device

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface SystemStatus {
  motionDetected: boolean;
  wifiStatus: string;
  location: string;
  timestamp: number;
  confidence?: number;
  volumeLevel?: number;
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
  const [error, setError] = useState<string | null>(null);
  const previousMotionStateRef = useRef(false);

  const userId = auth.currentUser?.uid;

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
            try {
              const deletePromises = logs.map((log) =>
                deleteDoc(doc(db, "motionLogs", DEVICE_ID, "logs", log.id)),
              );
              await Promise.all(deletePromises);
              console.log("✅ All motion logs cleared from dashboard");
            } catch (error) {
              console.log("❌ Error clearing logs from dashboard:", error);
              Alert.alert(
                "Error",
                "Failed to clear motion logs. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  console.log("🔐 Auth Status:", {
    isAuthenticated: !!auth.currentUser,
    userId: userId,
    email: auth.currentUser?.email,
  });

  // Debug status changes
  useEffect(() => {
    console.log("📱 UI Status updated:", status);
  }, [status]);

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };

    requestPermissions();

    // Test RTDB connection
    console.log("🔗 Testing RTDB connection...");
    const testRef = ref(rtdb, `devices/${DEVICE_ID}`);
    get(testRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log("✅ RTDB connection successful, data:", snapshot.val());
        } else {
          console.log(
            "⚠️ RTDB path exists but no data:",
            `devices/${DEVICE_ID}`,
          );
        }
      })
      .catch((error) => {
        console.log("❌ RTDB connection failed:", error);
      });
  }, []);

  // Send local notification
  const sendMotionNotification = async (location: string) => {
    try {
      console.log("📱 Sending notification for location:", location);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Motion Detected!",
          body: `Motion detected at ${location}`,
          sound: "default",
          badge: 1,
        },
        trigger: null, // Send immediately
      });
      console.log("✅ Notification sent successfully");
    } catch (error) {
      console.log("❌ Notification error:", error);
    }
  };

  useEffect(() => {
    console.log("🔄 useEffect triggered for listeners");
    console.log("👤 User ID:", userId);

    if (!userId) {
      console.log("❌ No user ID, skipping listener setup");
      setLoading(false);
      return;
    }

    console.log("✅ User authenticated, setting up listeners");

    // FIRESTORE LOGS LISTENER
    const logsQuery = query(
      collection(db, "motionLogs", DEVICE_ID, "logs"),
      orderBy("timestamp", "desc"),
    );

    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MotionLog[];

        setLogs(data.slice(0, 5));

        // Count today's detections
        const now = Date.now();
        const today = data.filter(
          (log) =>
            log.timestamp?.toDate &&
            now - log.timestamp.toDate().getTime() < 86400000,
        );

        setTodayDetections(today.length);
        setLoading(false);
      },
      (error) => {
        console.log("❌ Firestore listener error:", error);
        setError(`Firestore error: ${error.message}`);
        setLoading(false);
      },
    );

    // REALTIME DATABASE LISTENER
    const deviceRef = ref(rtdb, `devices/${DEVICE_ID}`);

    const unsubscribeMotion = onValue(
      deviceRef,
      async (snapshot) => {
        console.log("🔥 RTDB Listener triggered");
        console.log("📍 Device path:", `devices/${DEVICE_ID}`);

        if (!snapshot.exists()) {
          console.log(
            "❌ Snapshot does not exist for path:",
            `devices/${DEVICE_ID}`,
          );
          setError(
            `⚠️ Device not found at path: devices/${DEVICE_ID}\n\nEnsure RTDB has this structure:\n{\n  "motion_detected": true,\n  "wifi_status": "online",\n  "location": "Main Door"\n}`,
          );
          return;
        }

        // Clear error if data exists
        setError(null);

        const data = snapshot.val();
        console.log("📊 RTDB Data received:", data);

        const motionDetected =
          data.motion_detected === true || data.motion_detected === "true";
        const wifiStatus = (data.wifi_status || "offline").toLowerCase();

        console.log("🎯 Motion detected value:", data.motion_detected);
        console.log("🔄 Motion detected boolean:", motionDetected);
        console.log(
          "📶 Previous motion state:",
          previousMotionStateRef.current,
        );

        console.log("🔄 Updating status state...");
        setStatus({
          motionDetected,
          wifiStatus,
          location: data.location || "Main Door",
          timestamp: Date.now(),
          confidence: data.confidence,
          volumeLevel: data.volume_level,
        });
        console.log(
          "✅ Status state updated with motionDetected:",
          motionDetected,
        );

        // MOTION DETECTION LOGIC - Prevent duplicate notifications
        if (motionDetected && !previousMotionStateRef.current) {
          console.log("🚨 MOTION DETECTED! Sending notification...");

          // Motion just became true (transition from false to true)
          const location = data.location || "Sensor";

          // Send push notification
          await sendMotionNotification(location);

          try {
            // Log motion event to Firestore with userId
            await addDoc(collection(db, "motionLogs", DEVICE_ID, "logs"), {
              detected: true,
              location: location,
              timestamp: serverTimestamp(),
              confidence: data.confidence,
              userId: userId,
              triggeredAt: new Date().toISOString(),
            });

            console.log("✅ Motion event logged to Firestore");

            // DON'T reset motion flag immediately - let it persist for UI visibility
            // The sensor/hardware should reset it when motion stops
            console.log(
              "ℹ️ Motion flag kept as true for UI visibility - sensor should reset when motion stops",
            );
          } catch (error) {
            console.log("❌ Error logging motion:", error);
            setError(`Error logging motion: ${error}`);
          }
        } else if (motionDetected && previousMotionStateRef.current) {
          console.log(
            "⚠️ Motion still detected, skipping notification (duplicate prevention)",
          );
        } else if (!motionDetected) {
          console.log("✅ No motion detected (normal state)");
        } else {
          console.log(
            "❓ Unexpected state - motionDetected:",
            motionDetected,
            "previous:",
            previousMotionStateRef.current,
          );
        }

        // Update the previous state ref
        previousMotionStateRef.current = motionDetected;
        console.log("🔄 Previous motion state updated to:", motionDetected);
      },
      (error) => {
        console.log("❌ RTDB listener error:", error);
        setError(`Firebase RTDB Error: ${error.message}`);
      },
    );

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

  // Show error if not authenticated
  if (!userId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, marginBottom: 10 }]}>
          ⚠️ Not Authenticated
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Please log in to access the dashboard
        </Text>
      </View>
    );
  }

  // Show error message if there's an error
  if (error && !status.motionDetected) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: "#ff3b30", marginBottom: 10 }]}>
          🔴 Connection Error
        </Text>
        <Text style={[styles.subtitle, { color: theme.text, padding: 20 }]}>
          {error}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: theme.subText, padding: 10, fontSize: 12 },
          ]}
        >
          Check Firebase configuration and RTDB rules.
        </Text>
      </View>
    );
  }

  const isOnline = status.wifiStatus === "online";
  const timeString = new Date(status.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Device: {DEVICE_ID}
        </Text>
      </View>

      {/* SECTION 1: MOTION DETECTED STATUS - MAIN CARD */}
      <View style={styles.sectionContainer}>
        <View
          style={[
            styles.motionMainCard,
            {
              backgroundColor: status.motionDetected
                ? "rgba(255, 59, 48, 0.1)"
                : "rgba(40, 167, 69, 0.1)",
              borderColor: status.motionDetected ? "#ff3b30" : "#28a745",
            },
          ]}
        >
          {/* Motion Icon */}
          <View style={styles.motionIconContainer}>
            <MaterialCommunityIcons
              name={
                status.motionDetected ? "motion-sensor" : "motion-sensor-off"
              }
              size={60}
              color={status.motionDetected ? "#ff3b30" : "#28a745"}
            />
          </View>

          {/* Motion Status Text */}
          <Text
            style={[
              styles.motionMainText,
              {
                color: status.motionDetected ? "#ff3b30" : "#28a745",
              },
            ]}
          >
            {status.motionDetected ? "🚨 MOTION DETECTED" : "✓ NO MOTION"}
          </Text>

          {/* Location */}
          <Text style={[styles.motionLocationText, { color: theme.text }]}>
            {status.location}
          </Text>

          {/* Timestamp */}
          <Text style={[styles.motionTimestampText, { color: theme.subText }]}>
            Last update: {timeString}
          </Text>

          {/* Confidence level if available */}
          {status.confidence !== undefined && (
            <View style={styles.confidenceContainer}>
              <Text style={[styles.confidenceLabel, { color: theme.subText }]}>
                Confidence Level
              </Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${Math.min(100, status.confidence * 100)}%`,
                      backgroundColor: status.motionDetected
                        ? "#ff3b30"
                        : "#28a745",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.confidenceValue, { color: theme.text }]}>
                {Math.round(Math.min(100, status.confidence * 100))}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* SECTION 2: TODAY'S DETECTIONS - ANALYTICS CARD */}
      <View style={styles.sectionContainer}>
        <View
          style={[
            styles.analyticsCard,
            {
              backgroundColor: theme.card,
            },
          ]}
        >
          <View style={styles.analyticsHeader}>
            <MaterialCommunityIcons
              name="chart-line"
              size={24}
              color={theme.primary}
            />
            <Text style={[styles.analyticsTitle, { color: theme.text }]}>
              Today's Detections
            </Text>
          </View>

          <View style={styles.analyticsContent}>
            <Text style={[styles.analyticsNumber, { color: theme.primary }]}>
              {todayDetections}
            </Text>
            <Text style={[styles.analyticsSubtext, { color: theme.subText }]}>
              motion events today
            </Text>
          </View>
        </View>
      </View>

      {/* SECTION 3: WIFI STATUS */}
      <View style={styles.sectionContainer}>
        <View
          style={[
            styles.wifiStatusCard,
            {
              backgroundColor: theme.card,
              borderLeftColor: isOnline ? "#28a745" : "#ff3b30",
            },
          ]}
        >
          <View style={styles.wifiStatusContent}>
            <MaterialCommunityIcons
              name={isOnline ? "wifi" : "wifi-off"}
              size={32}
              color={isOnline ? "#28a745" : "#ff3b30"}
            />
            <View style={styles.wifiStatusText}>
              <Text style={[styles.wifiStatusLabel, { color: theme.subText }]}>
                WiFi Status
              </Text>
              <Text
                style={[
                  styles.wifiStatusValue,
                  {
                    color: isOnline ? "#28a745" : "#ff3b30",
                  },
                ]}
              >
                {isOnline ? "ONLINE" : "OFFLINE"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* SECTION 4: RECENT MOTION EVENTS */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Recent Motion Events
          </Text>
          {logs.length > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: "#ff3b30" }]}
              onPress={clearAllLogs}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.eventsCard,
            {
              backgroundColor: theme.card,
            },
          ]}
        >
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="history"
                size={48}
                color={theme.subText}
              />
              <Text style={[styles.emptyStateText, { color: theme.subText }]}>
                No motion events yet
              </Text>
            </View>
          ) : (
            logs.map((log, index) => (
              <View
                key={log.id}
                style={[
                  styles.eventItem,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < logs.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <View style={styles.eventItemLeft}>
                  <View
                    style={[
                      styles.eventTimeDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <View>
                    <Text style={[styles.eventLocation, { color: theme.text }]}>
                      {log.location}
                    </Text>
                    <Text
                      style={[styles.eventDevice, { color: theme.subText }]}
                    >
                      Device: {DEVICE_ID}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.eventTime, { color: theme.subText }]}>
                  {log.timestamp?.toDate
                    ? log.timestamp.toDate().toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* BOTTOM SPACING */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // HEADER SECTION
  headerSection: {
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 0,
  },

  // SECTION CONTAINERS
  sectionContainer: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  clearButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  // MOTION MAIN CARD
  motionMainCard: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  motionIconContainer: {
    marginBottom: 16,
  },

  motionMainText: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  motionLocationText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  motionTimestampText: {
    fontSize: 12,
    marginBottom: 16,
  },

  // CONFIDENCE LEVEL
  confidenceContainer: {
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },

  confidenceLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },

  confidenceBar: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },

  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },

  confidenceValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ANALYTICS CARD
  analyticsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },

  analyticsContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  analyticsNumber: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 6,
  },

  analyticsSubtext: {
    fontSize: 13,
    fontWeight: "500",
  },

  // WIFI STATUS CARD
  wifiStatusCard: {
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  wifiStatusContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  wifiStatusText: {
    marginLeft: 16,
    flex: 1,
  },

  wifiStatusLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },

  wifiStatusValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // EVENTS CARD
  eventsCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },

  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },

  eventItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },

  eventItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  eventTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },

  eventLocation: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  eventDevice: {
    fontSize: 12,
    fontWeight: "500",
  },

  eventTime: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 12,
  },

  // LEGACY STYLES (removed but kept for reference)
  // These can be removed if not needed elsewhere
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
