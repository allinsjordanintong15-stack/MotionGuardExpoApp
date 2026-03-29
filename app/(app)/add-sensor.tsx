import { useContext, useState } from "react";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { ThemeContext } from "../config/ThemeContext";

import { auth, db } from "../config/firebase";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function AddSensor() {
  const theme = useContext(ThemeContext);

  const [deviceId, setDeviceId] = useState("");

  const handleAdd = async () => {
    if (!deviceId) {
      Alert.alert("Enter Device ID");

      return;
    }

    const deviceRef = doc(db, "devices", deviceId);

    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) {
      Alert.alert("Device not found");

      return;
    }

    const deviceData: any = deviceSnap.data();

    if (deviceData.owner) {
      Alert.alert("Device already registered");

      return;
    }

    await updateDoc(deviceRef, {
      owner: auth.currentUser?.uid,
    });

    await setDoc(
      doc(db, `users/${auth.currentUser?.uid}/devices/${deviceId}`),

      {
        deviceId: deviceId,
      },
    );

    Alert.alert("Sensor Added!");

    setDeviceId("");
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
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleAdd}
      >
        <Text style={styles.buttonText}>Add Device</Text>
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
