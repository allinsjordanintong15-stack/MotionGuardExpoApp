// components/RealTimeStatus.tsx
import { onValue, ref, set } from "firebase/database";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { db, rtdb } from "@/config/firebase";

export interface RealTimeStatusData {
  motionDetected: boolean;
  wifiStatus: string;
  location: string;
  timestamp: number;
  todayDetections: number;
}

export default function useRealTimeStatus() {
  const [status, setStatus] = useState<RealTimeStatusData>({
    motionDetected: false,
    wifiStatus: "offline",
    location: "Unknown",
    timestamp: Date.now(),
    todayDetections: 0,
  });

  useEffect(() => {
    const motionRef = ref(rtdb, "SmartDoor"); // Make sure this path matches your RTDB

    const unsubscribe = onValue(motionRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        // Update the state for Dashboard
        setStatus((prev) => ({
          ...prev,
          motionDetected: !!data.motion_detected,
          wifiStatus: data.wifi_status || "offline",
          location: data.location || "Main Door",
          timestamp: Date.now(), // always show current time
          todayDetections: prev.todayDetections, // will increment below if needed
        }));

        // Handle motion detection
        if (data.motion_detected) {
          Alert.alert("Motion Detected", data.location || "Sensor triggered");

          try {
            // Log to Firestore
            await addDoc(collection(db, "motionLogs"), {
              location: data.location || "Main Door",
              sensorID: "PIR-1",
              detected: true,
              timestamp: serverTimestamp(),
            });

            // Increment today's detections
            setStatus((prev) => ({
              ...prev,
              todayDetections: prev.todayDetections + 1,
            }));

            // Reset motion in RTDB
            await set(motionRef, {
              ...data,
              motion_detected: false,
            });
          } catch (err) {
            console.log("Error logging motion:", err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return status;
}
