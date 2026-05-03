import { useContext, useState } from "react";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { ThemeContext } from "@/config/ThemeContext";

import { auth, db, rtdb } from "@/config/firebase";

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { get, ref } from "firebase/database";

export default function AddSensor() {
  const theme = useContext(ThemeContext);

  const [deviceId, setDeviceId] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const normalizedDeviceId = deviceId.trim().toUpperCase();
    const uid = auth.currentUser?.uid;

    if (!normalizedDeviceId) {
      Alert.alert("Enter Device ID");
      return;
    }
    if (!uid) {
      Alert.alert("Not Authenticated", "Please log in again.");
      return;
    }

    try {
      setAdding(true);
      const rtdbDeviceSnap = await get(ref(rtdb, `devices/${normalizedDeviceId}`));
      if (!rtdbDeviceSnap.exists()) {
        throw new Error("DEVICE_NOT_REGISTERED_ONLINE");
      }

      await runTransaction(db, async (transaction) => {
        const deviceRef = doc(db, "devices", normalizedDeviceId);
        const userDeviceRef = doc(db, "users", uid, "devices", normalizedDeviceId);
        const deviceSnap = await transaction.get(deviceRef);

        const deviceData = (deviceSnap.data() ?? {}) as {
          ownerId?: string;
          owner?: string;
        };
        const oldOwnerId = deviceData.ownerId ?? deviceData.owner;
        if (oldOwnerId && oldOwnerId !== uid) {
          // Transfer ownership: remove from old owner's devices
          const oldUserDeviceRef = doc(db, "users", oldOwnerId, "devices", normalizedDeviceId);
          transaction.delete(oldUserDeviceRef);
        }

        transaction.set(
          deviceRef,
          {
            ownerId: uid,
            owner: uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        transaction.set(
          userDeviceRef,
          {
            deviceId: normalizedDeviceId,
            ownerId: uid,
            addedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });

      Alert.alert("Device Added", `Device ${normalizedDeviceId} linked successfully.`);
      setDeviceId("");
    } catch (error: any) {
      if (error?.message === "DEVICE_NOT_REGISTERED_ONLINE") {
        Alert.alert(
          "Device not found",
          "This DEVICE_ID is not online/registered yet. Power on the device and try again.",
        );
      } else {
        Alert.alert("Error", "Failed to add device. Please try again.");
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Add Sensor</Text>

      <TextInput
        placeholder="Enter Device ID"
        placeholderTextColor={theme.subText}
        value={deviceId}
        onChangeText={setDeviceId}
        style={[
          styles.input,

          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.primary },
          adding && { opacity: 0.7 },
        ]}
        onPress={handleAdd}
        disabled={adding}
      >
        <Text style={styles.buttonText}>{adding ? "Adding..." : "Add Device"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },

  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
